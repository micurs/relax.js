Relax.js Sample 02
=======================================

In this example we creates a real Typescript data web service.

Since this demo is in Typescript first thing you need to do is to compile it into Javascript:

```
npm run build
```

And then you can start the server:

```
npm start
```

The data served by this mini-app is a list of users. If you go to the root resource with your browser you should get this page:

[screen1]: https://github.com/micurs/micurs.com/blob/master/sample02/example2.png "Site home page for Example #2"

![alt text][screen1]

You can explore the resources available in this site by clicking on them. Each one has a very specific URL.
For example the **users** collection is on `http://localhost:3000/users` while one of the user can be seen
using this address `http://localhost:3000/users/john_smith`.

## Implementation

In this example we see how we can nest resources inside other resources using the **resources** field.
At the same time this example shows how these resources can be accessed using the URL. No explicit routing rules are needed.
