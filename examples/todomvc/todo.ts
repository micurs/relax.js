// todomvc with React.js (front-end) and Relax.js (back-end) plus redis as datastore

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/redis/redis.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import _ = require("lodash");
import redis = require("redis");
import r = require('relaxjs');

var todosite = r.site('todomvc');

todosite.add( {
  name: 'todo',
  view: 'index',
  data: { version: '0.1.2' }
});


todosite.serve().listen(3000);
