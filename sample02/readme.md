Relax.js Sample 02
=======================================

In this example we creates a real Typescript data web service.

The data served by this mini-app is a list of users.
You can explore the list by accessing the users resource

```
http://localhost:3000/users
```

or access a single user by accessing his resource

```
http://localhost:3000/users/user/john_smith
```

Alternative ways to access a specific user in the users collection are available using URL paramters.
So, for example, to access the 3rd user in users you will write:

```
http://localhost:3000/users/user?idx=2
```

Implementation
------

This example shows how to create a colletion resource : users and how to
add a list of child resources of type user.

```
class Users extends relaxjs.Collection {
  ...
}

var users = new Users();
users.addResource( new User('john','smith') );
```
