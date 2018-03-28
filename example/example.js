const express = require('express');
const bodyParser = require('body-parser');
// const jwt = require('jsonwebtoken')
const app = express();
const comment = require('../lib/backend');
const driverTypes = comment.driverTypes;
const drivers = comment.drivers;

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

const ecSettings = {
  // maxReplyLevel: 3,
  // maxRecurseLevel: 2,
};

app.use('/comment', bodyParser.urlencoded({ extended: true }), /* authCheck, */ comment(drivers.mongo({}), ecSettings));


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