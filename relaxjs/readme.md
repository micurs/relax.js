relax.js
=====================================

Intro
--------

Relax.js is a simple node framework for building RESTful web application in Typescript using node.js.

Relax.js is written in Typescript but it does not require the use of Typescript. You can use this framework using javascript.

The spirit of this library is to encourage a fully REST approach whan developing web services.
In Relax.js you implement *resources* as instances of classes implementing the Resource interface and add these instance to
the Site object.

Applications written with relax.js do not require you to specify any routing since the path in a URL call specify a resource.

URL Resource locator
------------------------

Relax.js implement a simple convention to convert a path in the request URL into a query to a specific resource.

Resources need to be added to the root singleton resource: the Site. The site resource is accessible by using is predefined type alias "/":

```
http://yoursite.com/
```

We can add resources of different types to the Site. These will be accessible using the type name in the URL:

```
http://yoursite.com/<child-resource-type-name>
```

So for example if we have a resource called CopyrightInfo added to the Site we can access it with this url:

```
http://yoursite.com/copyrightinfo
```

Note: the site resource can have as many child resource as you want, but can only have one resource for each type.
This means you cannot add multiple CopyrightInfo resource directly as Site child resource.

To add multiple resource of the same type to the Site you must use a Collection.
For example, if you want to have multiple users in your application you should create a Collection derived object Users
and add it to the site and then add the users to the collection:

```
var mysite = relaxjs.site('mysite.com');
var myusers = mySite.addResource( new Users() );
myusers.addResource( new User('john','Smith'));
```

To access the user list we will use this address

```
http://yoursite.com/users
```

To access a specific user we will add the primary key (see later) in the URL:

```
http://yoursite.com/users/user/john_smith
```


More info here soon...
