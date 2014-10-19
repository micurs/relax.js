var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');

site.add( 'Page',  {
  view: 'helloworld',
  data: { message: "Hello World!" }
});

site.add( 'Page', {
  view: 'helloworld',
  data: { message: "Asta la vista!" }
});

site.add( 'Page', {
  view: 'helloworld',
  data: { message: "Ciao Mondo!" }
});

var staticResource = {
  view : 'helloworld',
  data : { message: "Hello Static World! This is data within my resource." }
};

var dynamicResource = {
  view : 'helloworld',
  onGet : function() {
    return { message: "Hello Dynamic World! This is data computed when the resource is requested." }
    }
};


site.add( 'Static Hello', staticResource );

site.add( 'Dynamic Hello', dynamicResource );

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
