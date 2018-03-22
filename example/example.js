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

app.use((err, req, res) => {
  if (e === 'unauthorized') {
    res.sendStatus(401);
  } else {
    res.sendStatus(404);
  }
});

app.listen(3000);