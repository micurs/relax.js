// relaxjs example #1 - part of relaxjs v 0.1.4

var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('Example #1');

site.add(  {
  name: 'Page1',
  view: 'helloworld',
  data: { message: "Hello World!" }
});

site.add( {
  name: 'Page2',
  view: 'helloworld',
  data: { message: "Asta la vista!" }
});

site.add( {
  name: 'ContainerPage',
  view: 'helloworld',
  data: { message: "This is a resource with child resources" },
  resources: [
    {
      name: 'Child1',
      view: 'helloworld',
      data: { message: "Hello! This is child #1 !" }
    },
    {
      name: 'Child2',
      view: 'helloworld',
      data: { message: "Hello! This is child #2 !" }
    }
  ]
});

function getCurrentDate() {
  var date = new Date();
  return ''+date.getHours()+':'+date.getMinutes()+'.'+date.getSeconds()+' UTC';
}

var staticResource = {
  name: 'static',
  view : 'helloworld',
  data : { message: 'Hello! This resource was created on '+ getCurrentDate() }
};

var dynamicResource = {
  name: 'dynamic',
  view : 'helloworld',
  onGet : function( query, respond ) {
    var date = new Date();
    this.data = { message: 'Hello Dynamic World! It is now '+ getCurrentDate()  };
    respond.ok();
  }
};


site.add( staticResource );
site.add( dynamicResource );

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
