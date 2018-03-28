# `express-comment` MongoDB Driver
This is a MongoDB driver for `express-comment`. It complies with the API requirements as specified in `/lib/db/api.md`. It internally uses the `mongodb` native NodeJS client.

## Configuration
`driver.configure(opts, ecSettings)` takes the `ecSettings`, same as described in `/lib/db/api.md`. For the database `opts`, it requires the following format:
```javascript
const opts = {
  url, // url to mongodb, default to 'mongodb://localhost:27017'
  dbName, // name of the database, default to 'express-comment-db'
  collName, //name of the collection, default to 'comments'
  settings, // settings for the Mongo Native Driver. See [https://mongodb.github.io/node-mongodb-native/] for detailed configuration settings (as used in MongoClient.connect(url, settings))
}
```

## Usage
```javascript
const comment = require('express-comment');
const drivers = comment.drivers;

// to create a middleware
const middleware = comment(drivers.mongo(opts), ecSettings);

app.use('/middleware/path', middleware);
```