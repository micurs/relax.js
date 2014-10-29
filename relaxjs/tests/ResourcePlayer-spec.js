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

/**/
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
          this.ok(response, { message: "Hello World!" } );
        },
        data: { message: "This is now Hello World!" } });
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


  describe('1.4 GET static data from a child Resource using a URL parameter', function() {
    it('should return {"items":["second-item"]}', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'parent',
        resources: [{
          name: 'child',
          urlParameters: [ 'idx' ],
          data: { items : [ 'first-item', 'second-item', 'third-item' ] },
          onGet : function( query, response ) {
            var idx = this._parameters.idx;
            console.log('[child] idx='+idx);
            // console.log('[child] items='+JSON.stringify(this.items) );
            this.ok(response, { items: [ this.data.items[idx] ] } );
          }
        }]
      });
      rp.get( new routing.Route('parent/child/1') )
        .then( function(emb) { result = emb; });
      waitsFor( function() { return result!=undefined } , 'Waited to long for the GET call to be completed.', 1000 );
      runs( function() {
        expect( result ).toBeDefined();
        expect( result.dataAsString() ).toBe('{"items":["second-item"]}');
      });
    });
  });


})
/**/

/**/
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
          this.ok(respond, { postData: data });
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
/**/

describe('DELETE responses', function() {


  describe('3.1 DELETE a static child Resource', function() {
    it('should remove the resource from its parent', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'parent',
        resources: [{
          name: 'child',
          data: { }
        }]
      });
      rp.delete(new routing.Route('parent/child') )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the DELETE call to be completed.', 1000 );
      runs( function() {
        var res = JSON.parse(result.dataAsString());
        console.log(res);
        expect( result ).toBeDefined();
        expect( rp.getChild('child') ).toBeUndefined();
      });
    });
  });


  describe('3.2 DELETE a dynamic Resource', function() {
    it('should remove the item "second-item" from its data', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'parent',
        resources: [{
          name: 'child',
          data: { testArray : [ 'first-item', 'second-item', 'third-item' ] },
          onDelete: function(query, respond ) {
            var idx = query['idx'];
            this.data.testArray.splice(idx,1);
            this.ok(respond, this.data );
          }
        }]
      });

      rp.delete(new routing.Route('parent/child?idx=1') )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the DELETE call to be completed.', 1000 );
      runs( function() {
        var res = JSON.parse(result.dataAsString());
        console.log(res);
        expect( result ).toBeDefined();
        expect( res.data.testArray ).toBeDefined();
        expect( res.data.testArray ).not.toContain( 'second-item' );
      });
    });
  });


  describe('3.3 DELETE part of data using url parameters', function() {
    it('should remove the item "second-item" from its data using URL paramter', function() {
      var result;
      var rp = new relaxjs.ResourcePlayer( {
        name: 'dataResource',
        urlParameters: [ 'idx' ],
        data: { testArray : [ 'first-item', 'second-item', 'third-item' ] },
        onDelete: function(query, respond ) {
          //console.log(this._parameters.idx);
          var idx = parseInt( this._parameters.idx );
          console.log('URL Parameter idx='+idx);
          this.data.testArray.splice(idx,1);
          this.ok(respond, this.data );
        }
      });

      rp.delete(new routing.Route('dataResource/1') )
        .then( function(emb){ result = emb; } );
      waitsFor( function() { return result!=undefined } , 'Waited to long for the DELETE call to be completed.', 1000 );
      runs( function() {
        var res = JSON.parse(result.dataAsString());
        console.log(res);
        expect( result ).toBeDefined();
        expect( res.data.testArray ).toBeDefined();
        expect( res.data.testArray ).not.toContain( 'second-item' );
      });

    });
  });

});

/*
describe('PATCH responses', function() {
});
*/
