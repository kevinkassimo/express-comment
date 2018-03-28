# `express-comment` Simple Article Post/Comment Management Middleware
`express-comment` is a middleware bundled with frontend API utilities that allows you to create a simple yet highly usable post/comment system with minimal code.

## Condition
This package is under __active development__, and is just entering its alpha stage. The API may change with new features added in the future.

## How to use
Check [`/lib/frontend/api.md`](/lib/frontend/api.md) and [`/lib/backend/api.md`](/lib/backend/api.md) for details, and [`/example/*`](/example) for examples of backend use. In general, you can simply mount the middleware on a path with minimal configuration, and use `/lib/frontend` predefined API for simple query and update.

## Demo
### Front-end API
```javascript
// frontend code
// remember to run `lib/frontend/index.js` first, possibly through <script />
let comment = commentFactory(window, '/api/express-comment/mounted/path');

// If you use React/Node instead, you can likely to be able to simply (not yet tested)
import ec from 'express-comment';
commentFactory = ec.frontend;
let comment = commentFactory(window, '/api/express-comment/mounted/path');

// begin:

let commentID;
let replyID;

// Callback styled
comment
  .comment('Hello world')
  .by('Kevin')
  .on('Article-01')
  .fire((err, id) => {
    if (err) throw err;
    commentID = id;
  });

// Promise styled
comment
  .reply('This is a reply!')
  .by('Tom')
  .to(commentID)
  .fire()
  .then((id) => replyID = id)
  .catch((err) => console.log('ERROR!', err));

comment
  .update('I want this as reply body instead!')
  .of(replyID)
  .fire();

comment
  .findAll(true) // true if you want to get all replies to the comment found, will be accessible at entry[i].reply
  .of(commentID)
  .fire()
  .then(console.log);

// find root comments on an article
comment
  .findRootAll() // true if you want to get all replies to the comment found, will be accessible at entry[i].reply
  .on('Article-01')
  .fire()
  .then(console.log);

// Delete!
comment
  .delete()
  .by('Tom')
  .fire()
  .then(() => console.log('Sadly, Tom\'s replies are deleted...'))
  .catch((err) => console.log('ERROR!', err));

comment
  .delete()
  .of(commentID)
  .fire()
  .then(() => console.log('Sadly, Kevin\'s first comment is deleted...'))
  .catch((err) => console.log('ERROR!', err));

```

### Back-end API
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const comment = require('../lib/backend');
const drivers = comment.drivers;

// General settings
const ecSettings = {}

// with MongoDB (Mongo Native Client)
const mongo_config = {
  /* ... */
  // see /lib/backend/db/mongo/README.md
};
app.use('/api/express-comment/mounted/path', bodyParser.urlencoded({ extended: true }), comment(drivers.mongo(mongo_config), ecSettings));

// or if with Sequelize.js (supporting MySQL, PostgreSQL, SQLite, etc.)
const sequelize_config = {
  database: 'ec',
  username: 'root',
  password: '',
  settings: {
    /* Sequelize config settings, check Sequelize docs about config settings. */
    host: 'localhost',
    dialect: 'mysql',

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
  }
}
app.use('/path/middleware/mounted', bodyParser.urlencoded({ extended: true }), comment(drivers.sql(sequelize_config), ecSettings));

/* ... */

// You are good to go!
```
