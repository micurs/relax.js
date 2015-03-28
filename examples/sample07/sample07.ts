// Relax.js example #7 - Set and check cookies

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/cookie/cookie.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import relaxjs = require('relaxjs');
import ck = require('cookie');
import _ = require('lodash');

// Create the application by assembling the resources
var site = relaxjs.site('sample7.com');

/*
 * Allow to set a cookie named 'name' required for accessing the /check page.
*/
site.add(  {
  name: 'set',
  view: 'set',
  onGet: function( query, respond: relaxjs.Response ) {
    respond.ok();
  },
  onPost: function( query, postData: any, respond: relaxjs.Response ) {
    if ( postData.value ) {
      this.data = postData;
      var cookieStr = ck.serialize( 'name', postData.value );
      this.setCookie( cookieStr );
    }
    respond.redirect('/check');
  }

});

/*
 * Shows all the cookies received
*/
site.add(  {
  name: 'check',
  view: 'check',
  onGet: function( query, respond )  {
    this.data = { cookies : this.getCookies() };
    respond.ok();
  }
});

/*
 * Redirect to /set all the request that do not have a cookie
*/
site.addRequestFilter( ( route : relaxjs.routing.Route, body: any, complete : relaxjs.FilterResultCB ) => {
  if ( route.pathname === '/set') {
    complete(); // let it pass without check
    return;
  }
  if ( !route.cookies )
    complete( new relaxjs.RxError('Need to set a cookie','cookie required', 302, '/set' ) );

  var cookies: string[] = _.map( route.cookies, (c) => ck.parse(c) );
  var nameCookie = _.find( cookies, (c ) => c['name'] !== undefined );
  if ( !nameCookie )
    complete( new relaxjs.RxError('Need to set a cookie "name" ','cookie required', 302, '/set' ) );

  complete(); // Filter pass
});

/*
 * Set basic defaults and run the site
*/
site.enableFilters = true;
site.setHome('/set')
site.serve().listen(3000);
