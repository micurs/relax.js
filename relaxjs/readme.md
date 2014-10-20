# relax.js

Relax.js is a simple node framework for building RESTful web application in Javascript or Typescript using node.js.

Relax.js is written itself in Typescript but it is packaged as a regular node component and, as such, does not require the use of Typescript.

The spirit of this framework is to encourage a fully REST approach when developing web services.
In Relax.js you implement *resources* and add them to the Site being served by your server.

## Resources and their URLs

In Relax.js the request URL univocally identifies the resource to load in the back end.
Each resource can respond to the 4 HTTP verbs: GET, POST, UPDATE and DELETE using a specific function or just by returning data.
So applications written with relax.js do not require specifying any routing.

The taxonomy of your resources automatically defines the URL patterns.

## Simplest Relax.js web appllication

In this example we build a very simple web service using relax.js returning some static data.

```javascript
var r = require('relaxjs');

var site = r.site('Simple Service');

site.add( { name: 'user',
            data: { first-name: 'Michael', last-name: 'Smith', 'id' : 1245 } });

site.serve().listen(3000);
```

Note: we created a resource called '**user**' and defined with some user *data*.
When added directly to the site the resource becomes accessible as a direct descendant of the site (using GET) on this URL:

```
http://localhost:3000/user
```

## Resources

Resources are the focal elements in any Relax.js application. Resources can represent individual objects or
contain and represent collections of other objects (i.e. resources).
Resources can respond to 4 type of HTTP requests: GET, POST, UPDATE and DELETE

### Verbs functions

In the previous example we created a static resource. We can create a dynamic resource that respond with
different data depending on the time of the request by providing a onGet() function:

```javascript
var timeResource = {
  onGet : function() {
    return {
      current-time : ''+date.getHours()+':'+date.getMinutes()+'.'+date.getSeconds()+' UTC'
    }
  }
};
site.add( 'current-time',  timeResource );
```

A resource can implement the following HTTP verb response functions:

- onGet()
- onPost()
- onUpdate()
- onDelete()

> Need to add example for each verb.

### Request Parameters

> Note this is not implemented yet

All these functions can accept a variable number of parameters depending on what is specified in the
queryString or in the body of the request. For example in this request:

```
http://localhost:3000/user?out=address
```

We are requesting the user address resource. We can implement our resource to respond to this request:

```javascript
var johnSmithRes = {
  onGet: function( ctx, params ) {
    switch(params['out']) {
      case 'address':
        return {
          'id' : 1245,
          street: '1234 5th Avenue',
          city: 'New York',
          state: 'NY',
          country: 'USA'
        }
      break;
      case 'name':
        return {
          'id' : 1245,
          first-name: 'Michael',
          last-name: 'Smith'
        }
      break;
      case 'all':
      default:
        return {
          'id' : 1245,
          first-name: 'Michael',
          last-name: 'Smith',
          street: '1234 5th Avenue',
          city: 'New York',
          state: 'NY',
          country: 'USA'
        }
      break;
    }
  }
};
site.add( 'user', johnSmithRes });
```

## Resource Representation

Relax.js default response format is JSON. Native Javascript data returned by a resource is automatically converted to JSON.
However Realx.js provide two other standard formats: XML and HTML.

### XML

> [More info here soon...]

### HTML Views

> [This is implemented and need info here soon...]

## Resource Collections

Relax.js implement a simple convention to convert a path in the request URL into a query to a specific resource.
The root resource of any Relax.js application is the site. The site has its own default HTML representation.

```
http://yoursite.com/
```

### Access by index

When you add resources to the Site the list of all the resources added is shown in the default site page.
The Site is a Container for other resources. Every resource can itself contain resources. For example:

```
var users = {
  view: 'users',
  resources: [
    { name: 'user', data: {  first-name: 'John', last-name: 'Smith', 'id' : 1001 } },
    { name: 'user', data: {  first-name: 'Joe', last-name: 'Doe', 'id' : 1002 } },
    { name: 'user', data: {  first-name: 'Mary', last-name: 'Lane', 'id' : 1003 } },
  ]
}
```

I can access the second user using this URL:

```
http://localhost:3000/users/user/2
```

> The index value can be omitted if it is Zero. This is convenient when you ave only one child resource.
> For example the previous URL could be written as:
>
```
http://localhost:3000/users/0/user/2
```

### Access by unique names

As alternative you can give each resource a unique name with-in the collection.

```
var users = {
  view: 'users',
  resources: [
    { name: 'john-smith', data: {  first-name: 'John', last-name: 'Smith', 'id' : 1001 } },
    { name: 'joe-doe', data: {  first-name: 'Joe', last-name: 'Doe', 'id' : 1002 } },
    { name: 'mary-lane', data: {  first-name: 'Mary', last-name: 'Lane', 'id' : 1003 } },
  ]
}
```

This way you can access these resource with a better URL:

```
http://localhost:3000/users/mary-lane
```

### Access by key

> This is not implemented yet

By default Relax allows to specify a key to select a specific resource within the URL just after the resource name.
We can force Relax.js to use our own key to retrieve a resource if we write the resources this way:

```
var users = {
  view: 'users',
  resources: [
    { name: 'user', key: 1001, data: {  first-name: 'John', last-name: 'Smith', 'id' : 1001 } },
    { name: 'user', key: 1002, data: {  first-name: 'Joe', last-name: 'Doe', 'id' : 1002 } },
    { name: 'user', key: 1003, data: {  first-name: 'Mary', last-name: 'Lane', 'id' : 1003 } },
  ]
}
```

This way I can access the second user using the key:

```
http://localhost:3000/users/user/1002
```

We can use different type of keys:

```
var users = {
  view: 'users',
  resources: [
    { name: 'user', key: 'john-smith', data: {  first-name: 'John', last-name: 'Smith', 'id' : 1001 } },
    { name: 'user', key: 'joe-doe', data: {  first-name: 'Joe', last-name: 'Doe', 'id' : 1002 } },
    { name: 'user', key: 'mary-lane', data: {  first-name: 'Mary', last-name: 'Lane', 'id' : 1003 } },
  ]
}
```

and use them in the URL request:

```
http://localhost:3000/users/user/joe-doe
```


## Dynamic Collections

> Not implemented yet

In most of the example above we assumed the resource was created before-hand and available in memory.
In most cases, however, this is not the case. In most cases we read data from a data-store and
we may not even know if a particular requested resource exists or not until we try to read it in
response to a given request.


> [More info here soon...]
