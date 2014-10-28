// ResourcePlayer-spec.js

var relaxjs = require('../dist/relaxjs.js');
var routing = require('../dist/routing.js');

beforeEach(function() {
  var customMatchers = {
    toHave: function(util, customEqualityTesters) {
      return {
        compare: function(actual, expected) {
          console.log( '  Actual: '+ JSON.stringify(actual) );
          console.log( 'Expected: '+ JSON.stringify(expected) );
          for( var key in expected  ) {
            if ( !actual[key] )
              return { pass: false, message : 'Expected '+key+' not found in actual.' };
            if ( actual[key] !== expected[key] )
              return { pass: false, message : 'Expected '+key+' value: '+expected[key]+' does not match on actual: '+actual[key] };
          }
          return { pass: true };
        }
      };
    }
  };

  this.addMatchers(customMatchers);
});


describe('GET responses: ', function() {

  describe('1.1 GET static data from a Resource', function() {
    it('should get {"message":"Hello World!"}', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( { name: 'hello', data: { message: "Hello World!" } });
      rp.get( new routing.Route('hello') )
        .then( function(emb) { result = emb; });
      waitsFor( function() { return result!=undefined } , 'Waited to long for the GET call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( result.dataAsString() ).toBe('{"message":"Hello World!"}');
      });
    });
  });


  describe('1.2 GET dynamic data from a Resource', function() {
    it('should get {"message":"Hello World!"}', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'test',
        onGet : function( query, response ) {
          response( null, { data: { message: "Hello World!" } } );
        },
        data: { message: "Hello World!" } });
      rp.get( new routing.Route('test') )
        .then( function(emb) { result = emb; });
      waitsFor( function() { return result!=undefined } , 'Waited to long for the GET call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( result.dataAsString() ).toBe('{"message":"Hello World!"}' );
      });
    });
  });

  describe('1.3 GET static data from a child Resource', function() {
    it('should get {"message":"Hello World!"}', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'hello',
        resources: [ {
          name: 'world',
          data: { message: "Hello World!" }
        }]
      });
      rp.get( new routing.Route('hello/world') )
        .then( function(emb) { result = emb; });
      waitsFor( function() { return result!=undefined } , 'Waited to long for the GET call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( result.dataAsString() ).toBe('{"message":"Hello World!"}');
      });
    });
  });


})


describe('POST responses: ', function() {

  describe('2.1 POST JSON data to a Resource with no onPost() function', function() {
    it('should add the data as member of the resource', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'test',
        data: { }
      });
      var postData = { message: 'Hello World' };
      rp.post(new routing.Route('test'),postData )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the POST call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( rp ).toHave( { message:"Hello World!"} );
      });
    });
  });

  describe('2.2 POST JSON data to a Resource with onPost() function', function() {
    it('should add the data under the postData new member of the resource', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'test',
        onPost: function(query , data , respond ) {
          this['postData'] = data;
          respond( null, { result: 'ok' } );
        }
      });
      var postData = { message: 'Hello World' };
      rp.post(new routing.Route('test'),postData )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the POST call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( rp ).toHave( { postData : { message:"Hello World!"} } );
      });

    });
  });

  describe('2.3 POST JSON data to a child Resource with no onPost() function', function() {
    it('should add the data as member of the resource', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'hello',
        resources: [{
          name: 'world',
          data: { }
        }]
      });
      var postData = { message: 'Hello World' };
      rp.post(new routing.Route('hello/world'),postData )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the POST call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( rp.getChild('world') ).toHave( { message:"Hello World!"} );
      });
    });
  });


});


describe('DELETE responses', function() {
});


describe('PATCH responses', function() {
});
