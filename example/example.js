const express = require('express');
// const jwt = require('jsonwebtoken')
const app = express();
const comment = require('../lib/backend');
const driverTypes = comment.driverTypes;

const secret = 'my_secret';

/*
const authCheck = function(req, res, next) {
  try {
    const decoded = jwt.verify(req.cookies.jwt, secret);
    if (decoded.username !== req.query.username) {
      next('unauthorized'); // reject
    } else {
      next();
    }
  } catch (e) {
    next('unauthorized');
  }
}
*/

app.use('/comment', /* authCheck, */ comment(driverTypes.MONGO, {}));

app.use((err, req, res, next) => {
  if (err === 'unauthorized') {
    res.sendStatus(401);
  } else {
    res.status(400).send(err.toString());
  }
});

app.listen(3000);