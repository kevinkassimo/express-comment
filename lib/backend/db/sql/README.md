# `express-comment` SQL (Sequelize) Driver
This is a SQL (multi-flavored) driver for `express-comment`. It complies with the API requirements as specified in `/lib/backend/db/api.md`. It internally uses the `Sequelize.js`.

## WARNING
It is likely that for some SQL dialects, `Sequelize.js` requires additional packages (only `mysql2` comes with this package). Install them based on instructions from it (usually will pop up error about installation details)

## Configuration
`driver.configure(opts, ecSettings)` takes the `ecSettings`, same as described in `/lib/backend/db/api.md`. For the database `opts`, it requires the following format:
```javascript
const opts = {
  database, // name of the database, NO DEFAULT
  username, // username, NO DEFAULT
  password, // password to the database, NO DEFAULT
  settings, // settings for Sequelize, including necessary fields such as 'dialect'. See [http://docs.sequelizejs.com/manual/] for detailed configuration settings (as used in MongoClient.connect(url, settings))
}
```

## Usage
```javascript
const comment = require('express-comment');
const drivers = comment.drivers;

// to create a middleware
const middleware = comment(drivers.sql(opts), ecSettings);

app.use('/middleware/path', middleware);
```