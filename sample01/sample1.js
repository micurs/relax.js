var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');

/*
site.add( 'page',  {
  view: 'helloworld',
  data: { message: "Hello World!" }
});

site.add( 'page', {
  view: 'helloworld',
  data: { message: "Asta la vista!" }
});

site.add( 'Hello', {
  view: 'helloworld',
  data: { message: "Ciao Mondo Statico!" }
});
*/

var dynamicResource = {
  view : 'helloworld',
  onGet : function() {
    console.log( ">>>>> Ciao Mondo Dinamico! As separate object" );
    return { message: "Ciao Mondo Dinamico! As separate object" }
    }
};

site.add( 'page', dynamicResource );

site.add( 'page', {
  view : 'helloworld',
  onGet : function() {
    console.log( ">>>>>>> Ciao Mondo Dinamico!" );
    return { message: "Ciao Mondo Dinamico! as in place object" }
    }
  });

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
