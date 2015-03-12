# relax.js

Relax.js is a simple node framework for building truly RESTful web applications in Javascript (or Typescript) using node.js.

Relax.js is written itself in Typescript but it is packaged as a regular node component and, as such, does not require the use of Typescript.

The spirit of this framework is to encourage a fully REST approach when developing web services.
In Relax.js you implement **resources** and add them to the Site being served by your server.
In Relax.js you cannot route URL patterns to functions - in fact - there is no routing facility.
The mapping of each URL to the appropriate resource is done automatically on the base of the structure of your resource tree.

Check the [wiki](https://github.com/micurs/relax.js/wiki) to understand how it works.

## Get It

Install the latest version in your node_modules subdirectory using `npm`

```
npm install relaxjs
```

After that you can start using relax in your javascript node.js code. This is a very simple example of a relax.js app:

```
var r = require('relaxjs');
var site = r.site('Simple Service');
site.add( { name: 'hello', data: { message: "Hello World!" } });
site.serve().listen(3000);
```

To learn more check the [wiki](https://github.com/micurs/relax.js/wiki).

## Compile it

You can clone this repo and compile and test this module using Gulp:

- `gulp` Will compile, Lint
- `gulp watch` To watch for changes in the Typescript files under src and compile automatically.

or via npm:

`npm run build`

## Test it

The unit-testing is performed using [Jasmine 2.0](http://jasmine.github.io/2.0/introduction.html).
To invoke the full test suite you can use this command:

`jasmine-node --verbose --color tests`

or via npm:

`npm run test`

## Getting started

The [wiki](https://github.com/micurs/relax.js/wiki) contains a detailed introduction on
how to use Relax.js to build node based web services.
