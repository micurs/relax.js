// ResourcePlayer-spec.js

var relaxjs = require('../dist/relaxjs.js');
var routing = require('../dist/routing.js');

describe('GET static data from a Resource', function() {
  it('should get {"message":"Hello World!"}', function() {
    var rp = new relaxjs.ResourcePlayer( { name: 'hello', data: { message: "Hello World!" } });
    var result;
    rp.get( new routing.Route('hello') )
      .then( function(emb) { result = emb; });
    waitsFor( function() { return result!=undefined } , 'To long for Embodiment of the resource to be ready.', 1000 );
    runs( function() {
      expect( result.dataAsString() ).toBe('{"message":"Hello World!"}');
    });
  });
});


describe('GET dynamic data from a Resource', function() {
  it('should get {"message":"Hello World!"}', function() {
    var rp = new relaxjs.ResourcePlayer( {
      name: 'hello',
      onGet : function( query, response ) {
        response( null, { data: { message: "Hello World!" } } );
      },
      data: { message: "Hello World!" } });
    var result;
    rp.get( new routing.Route('hello') )
      .then( function(emb) { result = emb; });
    waitsFor( function() { return result!=undefined } , 'To long for Embodiment of the resource to be ready.', 1000 );
    runs( function() {
      expect( result.dataAsString() ).toBe('{"message":"Hello World!"}');
    });
  });
});
