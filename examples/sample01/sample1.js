var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');

site.add(  {
  name: 'Page',
  view: 'helloworld',
  data: { message: "Hello World!" }
});

site.add( {
  name: 'Page',
  view: 'helloworld',
  data: { message: "Asta la vista!" }
});

site.add( {
  name: 'Page',
  view: 'helloworld',
  data: { message: "Ciao Mondo!" }
});

var staticResource = {
  name: 'static',
  view : 'helloworld',
  data : { message: "Hello Static World! This is data within my resource." }
};

var dynamicResource = {
  name: 'dynamic',
  view : 'helloworld',
  onGet : function( query, response ) {
    var date = new Date();
    response( null, { message: 'Hello Dynamic World! It is '+date.getHours()+':'+date.getMinutes()+'.'+date.getSeconds()+' UTC' } );
  }
};


site.add( staticResource );

site.add( dynamicResource );

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
