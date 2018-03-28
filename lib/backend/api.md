# `express-comment` Backend API
Comparing to the frontend, the backend API of `express-comment` is just SO simple... You create the middleware, give is a driver instance with settings, and mount it on a path. Just be careful that you have to use `body-parser` with `urlencoded` before the middleware such that the POST operations could be correctly conducted. Done.

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const comment = require('express-comment').backend;
const drivers = comment.drivers;

const ecSettings = {
  maxReplyLevel: 3,
  maxRecurseLevel: 2,
};

const mongoSettings = {};

app.use('/comment', bodyParser.urlencoded({ extended: true }), comment(drivers.mongo(mongoSettings), ecSettings));
// If certain actions requires authentication, consider writing a simple middleware to check the username and (such as) JWT
// If you want to forbid certain actions from the frontend (e.g. delete), learn about the Raw Query in '/lib/frontend/api.md' and write a middleware to check the parameter 'action' to disallow them.


app.get('/', (req, res, next) => {
  res.sendStatus(200);
});

app.use((err, req, res, next) => {
  if (err === 'unauthorized') {
    res.sendStatus(401);
  } else {
    res.status(400).send(err.toString());
  }
  console.log(err);
});

app.listen(3000);

```

## EC Settings
These are settings that affect certain backend behavior. Plug them in as in the example above if you need them.
```javascript
const ecSettings = {
  maxReplyLevel: 3, // max reply level. With it set to 3, you could only reply, at most, to a reply of a root comment, but not creating any longer reply chain.
  maxRecurseLevel: 2, // max recurse level. With it set to 2, when you try to call whatever recursion settings in the frontend, you will at most get 2 levels of comments for any find attempts (meaning the .reply of the second level comments will always be empty)
};
```

## Available Drivers
Currently, only MongoDB driver and SQL driver are available. See their own corresponding `api.md` in their folders under `/lib/backend/db` to learn about their specific settings requirements.
```javascript
const comment = require('express-comment').backend;
const drivers = comment.drivers;

drivers.mongo(settings);
drivers.sql(settings);
```