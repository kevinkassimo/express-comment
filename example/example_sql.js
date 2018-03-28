const express = require('express');
const bodyParser = require('body-parser');
// const jwt = require('jsonwebtoken')
const app = express();
const comment = require('../lib');
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

const config = {
  database: 'ec',
  username: 'root',
  password: '',

  settings: {
    host: 'localhost',
    dialect: 'mysql',

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
  },
}

app.use('/comment', bodyParser.urlencoded({ extended: true }), /* authCheck, */ comment(drivers.sql(config)));

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