///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
// System and third party import
var http = require("http");
var fs = require('fs');
var Q = require('q');
var mime = require('mime');
var _ = require("underscore");
_.str = require('underscore.string');

var controller = require("./controller");

// Application Resources
(function (Resources) {
    var Embodiment = (function () {
        function Embodiment(data, mimeType) {
            this.data = data;
            this.mimeType = mimeType;
        }
        Embodiment.prototype.serve = function (response) {
            response.writeHead(200, { 'Content-Type': this.mimeType, 'Content-Length': this.data.length });
            response.write(this.data);
            response.end();
        };
        return Embodiment;
    })();
    Resources.Embodiment = Embodiment;

    

    // generic get for a static file
    // -------------------------------------------------------------------------------
    function viewStatic(filename) {
        var fname = '[view static]';
        var mtype = mime.lookup(filename);
        var laterAction = Q.defer();
        var staticFile = '.' + filename;
        console.log(_.str.sprintf('%s %s', fname, staticFile));
        fs.readFile(staticFile, function (err, content) {
            if (err)
                laterAction.reject(filename + ' not found');
            else
                laterAction.resolve(new Embodiment(content, mtype));
        });
        return laterAction.promise;
    }
    Resources.viewStatic = viewStatic;

    // Return a promise that will return the full content of the view + the viewdata.
    // -------------------------------------------------------------------------------
    function view(viewName, viewData, layoutName) {
        var fname = '[view]';
        var laterAct = Q.defer();
        var templateFilename = './views/' + viewName + '._';

        // console.log('[view] template: "'+viewName+'"\t\tdata:'+ JSON.stringify(viewData) );
        console.log(_.str.sprintf('%s %s', fname, templateFilename));
        fs.readFile(templateFilename, 'utf-8', function (err, content) {
            if (err) {
                var errStr = _.str.sprintf('%s File %s not found', fname, templateFilename);
                console.log(errStr);
                laterAct.reject(errStr);
            } else {
                // read the layout container
                if (layoutName !== undefined) {
                    var layoutFilename = './views/_' + layoutName + '._';

                    // console.log('[view] layout: "'+layoutName+'"\t\tdata:'+ JSON.stringify(viewData) );
                    console.log('[view] layout file name: "' + layoutFilename + '" ');
                    fs.readFile(layoutFilename, 'utf-8', function (err, outerContent) {
                        if (err) {
                            console.log('[View] Layout Contaier File ' + layoutName + ' not found');
                            laterAct.reject('[View] Layout Contaier File ' + layoutName + ' not found');
                        } else {
                            console.log('[View] Compiling composite view ' + layoutFilename + ' >> ' + templateFilename);
                            try  {
                                var innerContent = new Buffer(_.template(content)(viewData), 'utf-8');
                                var fullContent = new Buffer(_.template(outerContent)({ page: innerContent, name: viewData.Name }), 'utf-8');
                                laterAct.resolve(new Embodiment(fullContent, 'utf-8'));
                            } catch (e) {
                                laterAct.reject('<h1>[View] View Compile Error</h1><pre>' + _.escape(content) + '</pre><p style="color:red; font-weight:bold;">' + e + '</p>');
                            }
                        }
                    });
                } else {
                    console.log('[View] Compiling single view ' + templateFilename);
                    try  {
                        var fullContent = new Buffer(_.template(content)(viewData), 'utf-8');
                        laterAct.resolve(new Embodiment(fullContent, 'utf-8'));
                    } catch (e) {
                        laterAct.reject('<h1>[View] View Compile Error</h1><pre>' + _.escape(content) + '</pre><p style="color:red; font-weight:bold;">' + e + '</p>');
                    }
                }
            }
        });
        return laterAct.promise;
    }
    Resources.view = view;

    // Root object for the application is the Site.
    // The site is in itself a Resource and is accessed via the root / in a url.
    // ----------------------------------------------------------------------------
    var Site = (function () {
        function Site(siteName) {
            this.siteName = siteName;
            this.Name = "site";
            this._resources = {};
            this._version = '0.0.1';
            if (Site._instance) {
                throw new Error("Error: Only one site is allowed.");
            }
            Site._instance = this;
        }
        Site.$ = function (name) {
            if (Site._instance === null) {
                Site._instance = new Site(name);
            }
            return Site._instance;
        };

        Site.prototype.addResource = function (resource) {
            resource['_version'] = this._version;
            resource['siteName'] = this.siteName;
            this._resources[resource.Name] = resource;
            console.log('Resources : [ ' + JSON.stringify(_.values(this._resources)) + ' ]');
            return false;
        };

        Site.prototype.serve = function (port) {
            var _this = this;
            if (typeof port === "undefined") { port = 3000; }
            return http.createServer(function (request, response) {
                console.log('\n========================');
                console.log('Received request for :' + request.url);

                // here we need to route the call to the appropriate class:
                var route = controller.Routing.fromUrl(request);

                _this.get(route).then(function (rep) {
                    rep.serve(response);
                }).fail(function (error) {
                    response.writeHead(404, { "Content-Type": "text/html" });
                    response.write(error);
                    response.end();
                }).done();
            });
        };

        Site.prototype.get = function (route) {
            var contextLog = '[' + this.Name + '.get] ';
            console.log(contextLog + 'Fetching the resource : [ ' + route.path + ' ]');

            if (route.static) {
                console.log(contextLog + 'Static Route -> fetching the file: ' + route.pathname);
                return viewStatic(route.pathname);
            } else {
                console.log(contextLog + 'Dynamic Route -> following the path ');
                if (route.path.length > 1) {
                    if (route.path[1] in this._resources) {
                        console.log(contextLog + 'Found resource for ' + route.path[1]);
                        var partialRoute = _.clone(route);
                        partialRoute.path = route.path;
                        return this._resources[route.path[1]].get(partialRoute);
                    }
                }

                //var resArray:Resource[] = _.map<any,Resource>( this._resources, function(item, key) { return item; } );
                //var list:string = _.reduce<Resource,string>( _.values(this._resources), (m :string ,item) => m+= "<li>"+item.Name+"</li>"  );
                console.log(contextLog + 'Resources : [ ' + JSON.stringify(_.values(this._resources)) + ' ]');
                return view(this.Name, this);
            }
        };
        Site._instance = null;
        return Site;
    })();
    Resources.Site = Site;

    var HtmlView = (function () {
        function HtmlView(viewName, layout) {
            this.viewName = viewName;
            this.layout = layout;
            this.Name = "site";
            this.Name = viewName;
        }
        HtmlView.prototype.get = function (route) {
            var contextLog = '[' + this.Name + '.get] ';
            console.log(contextLog + 'Fetching the resource : [ ' + route.path + ' ]');

            // Here we compute/fetch/create the view data.
            return view(this.Name, this, this.layout);
        };
        return HtmlView;
    })();
    Resources.HtmlView = HtmlView;
})(exports.Resources || (exports.Resources = {}));
var Resources = exports.Resources;
