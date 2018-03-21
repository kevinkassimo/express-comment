const MongoClient = require('mongodb').MongoClient;
const debug = require('debug')('express-comment:db:mongo');
const inspect = require('util').inspect;

const MONGO_SETTINGS = {
  url: 'mongodb://localhost:27017',
  dbName: 'express-comment-db',
  collName: 'comments',
  settings: undefined,
  db: null,
};

function connectMongo() {
  return new Promise((resolve, reject) => {
    if (MONGO_SETTINGS.db) {
      resolve(MONGO_SETTINGS.db);
    } else {
      MongoClient.connect(MONGO_SETTINGS.url, settings)
      .then((client) => {
        MONGO_SETTINGS.db = client.db(dbName);
        resolve(MONGO_SETTINGS.db);
      })
      .catch((err) => {
        reject(err);
      });
    }
  });
}

function insertComment(username, body, assoc, parentId, opaque) {
  return new Promise((resolve, reject) => {
    connectMongo()
    .then((db) => {
      const entry = {
        username: username || '(unknown)',
        body: body || '',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }
      if (assoc) {
        entry.assoc = assoc;
      }
      if (parentId) {
        entry.parentId = parentId;
      }
      if (opaque) {
        entry.opaque = opaque;
      }

      return db.collection(MONGO_SETTINGS.collName).insertOne(entry);
    })
    .then((result) => {
      debug('mongo#insertComment: insertOneWriteOpResult = ' + inspect(result));
      resolve(result.insertedId);
    })
    .catch((err) => {
      reject(err);
    });
  });
}

function updateComment(postId, username, body, assoc, parentId, opaque) {
  return new Promise((resolve, reject) => {
    connectMongo()
    .then((db) => {
      const entry = {
        modifiedAt: new Date().toISOString(),
      }
      if (username) {
        entry.username = username;
      }
      if (body) {
        entry.body = body;
      }
      if (assoc) {
        entry.assoc = assoc;
      }
      if (parentId) {
        entry.parentId = parentId;
      }
      if (opaque) {
        entry.opaque = opaque;
      }

      return db.collection(MONGO_SETTINGS.collName).updateOne({ _id: postId }, entry);
    })
    .then(result => {
      debug('mongo#updateComment: updateWriteOpResult = ' + inspect(result));
      resolve();
    })
    .catch((err) => {
      reject(err);
    });
  });
}

function deleteComment(postId, username, assoc, parent) {
  return new Promise((resolve, reject) => {
    connectMongo()
    .then((db) => {
      const coll = db.collection(MONGO_SETTINGS.collName);
      let entry = null;
      if (postId) {
        entry = entry || {};
        entry._id = postId;
      }
      if (username) {
        entry = entry || {};
        entry.username = username;
      }
      if (assoc) {
        entry = entry || {};
        entry.assoc = assoc;
      }
      if (parent) {
        entry = entry || {};
        entry.parent = parent;
      }
      if (entry) {
        return coll.find(entry, { projection: { _id: 1 } }).toArray();
      } else {
        return Promise.resolve([]);
      }
    })
    .then((arr) => {
      const idArr = arr.map(e => e._id);
      return Promise.all([
        idArr,
        db.collection(MONGO_SETTINGS.collName).deleteMany({ _id: { $in: idArr } })
      ]);
    })
    .then((results) => {
      debug('mongo#deleteComment: deleteWriteOpResult (one round) = ' + inspect(results[1]));
      const childDeleteArr = results[0].map(id => deleteComment(null, null, null, id));
      return Promise.all(childDeleteArr);
    })
    .catch((err) => {
      reject(err);
    });
  });
}

function findCommentById() {
  connectMongo()
  .then((db) => {

  });
}

function findCommentByUsername() {
  connectMongo()
  .then((db) => {

  });
}

function findCommentByAssoc() {
  connectMongo()
  .then((db) => {

  });
}

module.exports = {
  mongoURL
}