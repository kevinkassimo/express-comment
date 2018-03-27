# `express-comment` simple article comment/post system middleware

## Condition
This package is under __active development__ and is not even entering its alpha stage. However, you could still have a taste of how it works. For backend setup, check `example/*` files as examples. For frontend API calls, it is defined in `lib/frontend/index.js`, in which some same API calls to insert/delete/find comments are written as comments. If you want to use it in browser, simply run `lib/frontend/index.js` in browser and run `let comment = commentFactory(window, '/comment/api/mount/path')` to expose the comment API for use.

## Example

### Front-end API
```javascript
// frontend code
// remember to run `lib/frontend/index.js` first, possibly through <script />
let comment = commentFactory(window, '/api/express-comment/mounted/path');

// If you use React/Node instead, you can likely to be able to simply (not yet tested)
import comment from 'express-comment';
commentFactory = comment.frontend;
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

// with MongoDB (Mongo Native Client)
app.use('/path/middleware/mounted', bodyParser.urlencoded({ extended: true }), comment(drivers.mongo({})));

// or if with Sequelize.js (supporting MySQL, PostgreSQL, SQLite, etc.)
const sequelize_config = {
  /* Sequelize config settings, check Sequelize docs about config settings. */
  host: 'localhost',
  dialect: 'mysql',

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  /* 
    However, the following 3 fields are REQUIRED all the time, that are not Sequelize defined:
  */ 
  database: 'ec',
  username: 'root',
  password: '',
}
app.use('/path/middleware/mounted', bodyParser.urlencoded({ extended: true }), comment(drivers.sql(sequelize_config)));

/* ... */

// You are good to go!
```

## TODOs
API stability, settlement of final design, better documentation, etc.

## Ideas
1. Insert cap (max reply level, implement with adding an extra field (level, 0 as root comment)to each entry) (__DONE__)
2. `comment(driverType.MONGO, settings)` -> `comment(driver.mongo(settings), comment_settings)`
3. implement range for recursive actions (`comment.findAll(startRange, endRange)`)