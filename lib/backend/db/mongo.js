const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const debug = require('debug')('express-comment:db:mongo');
const inspect = require('util').inspect;

const _MONGO = {
  url: 'mongodb://localhost:27017',
  dbName: 'express-comment-db',
  collName: 'comments',
  settings: undefined,
  client: null,
  db: null,
  coll: null,
};

function configure(o) {
  if (_isDefined(o.url)) {
    _MONGO.url = o.url;
  }
  if (_isDefined(o.dbName)) {
    _MONGO.dbName = o.dbName;
  }
  if (_isDefined(o.collName)) {
    _MONGO.collName = o.collName;
  }
  if (_isDefined(o.settings)) {
    _MONGO.settings = o.settings;
  }
}

function close() {
  return _MONGO.client.close();
}

function _isNullOrUndefined(v) {
  return v === null || v === undefined;
}
function _isDefined(v) {
  return v !== null && v !== undefined;
}
// convert to ObjectId if s is string (avoid undefined || null)
function _toObjectId(s) {
  return typeof s === 'string' ? MongoDB.ObjectId.createFromHexString(s) : s;
}
function _stringifyIdFieldOfArray(arr) {
  arr.forEach(e => e._id = e._id.toString());
}

function connectMongo() {
  if (_MONGO.db) {
    return Promise.resolve(_MONGO.db);
  }
  return MongoClient.connect(_MONGO.url, _MONGO.settings)
  .then((client) => {
    _MONGO.client = client;
    _MONGO.db = client.db(_MONGO.dbName);
    _MONGO.coll = _MONGO.db.collection(_MONGO.collName);
    return _MONGO.db;
  });
}

function insertComment(username, body, assoc, parentId, opaque) {
  parentId = _toObjectId(parentId);
  return connectMongo()
    .then(() => {
      if (!parentId) {
        if (_isNullOrUndefined(assoc)) {
          return Promise.reject(new Error('assoc must be given if is root comment'));
        }
        debug('mongo#insertComment: parentId not specified, use null');
        return true;
      } else {
        debug('mongo#insertComment: check parentId');
        return _MONGO.coll.findOne({ _id: parentId });
      }
    })
    .then((result) => {
      if (!result) {
        return Promise.reject(new ReferenceError('Cannot chain to a non-existent parent id'));
      }
      if (_isDefined(assoc) && assoc !== result.assoc) {
        debug('mongo#insertComment: assoc does not match parent assoc, use assoc of parent instead');
      }

      const entry = {
        username: username || '(unknown)',
        body: body || '',
        assoc: result === true ? assoc : result.assoc, // use parent assoc
        parentId: parentId || null,
        opaque: opaque || null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }
      return _MONGO.coll.insertOne(entry);
    })
    .then((result) => {
      debug('mongo#insertComment: insertOneWriteOpResult = ' + inspect(result.result));
      return result.insertedId.toString();
    });
}

/*
Remove ability to change parent, since it is never useful and will introduce cyclic search
if used incorrectly (exploited)
*/
function updateComment(postId, username, body, opaque) {
  postId = _toObjectId(postId);
  return connectMongo()
    .then(() => {
      const entry = {
        modifiedAt: new Date().toISOString(),
      }
      // only change field values if explicitly set
      // means that cannot set field to null/undefined after initial set
      if (_isDefined(username)) {
        entry.username = username;
      }
      if (_isDefined(body)) {
        entry.body = body;
      }
      if (_isDefined(opaque)) {
        entry.opaque = opaque;
      }
      debug('mongo#updateComment: update entry = ' + inspect(entry));
      return _MONGO.coll.updateOne({ _id: postId }, { $set: entry });
    })
    .then(result => {
      debug('mongo#updateComment: updateWriteOpResult = ' + inspect(result.result));
      return true;
    });
}

function deleteComment(postId, username, assoc, parentId) {
  parentId = _toObjectId(parentId);
  let idArr;
  return connectMongo()
    .then(() => {
      const coll = _MONGO.coll;
      let entry = null;
      if (_isDefined(postId)) {
        entry = entry || {};
        entry._id = _toObjectId(postId);
      }
      if (_isDefined(username)) {
        entry = entry || {};
        entry.username = username;
      }
      if (_isDefined(assoc)) {
        entry = entry || {};
        entry.assoc = assoc;
      }
      if (_isDefined(parentId)) {
        entry = entry || {};
        entry.parentId = parentId;
      }
      if (entry) {
        return coll.find(entry, { projection: { _id: 1 } }).toArray();
      } else {
        debug('mongo#deleteComment: no match found, fail silently');
        return [];
      }
    })
    .then((arr) => {
      idArr = arr.map(e => e._id);
      if (idArr.length > 0) {
        return _MONGO.coll.deleteMany({ _id: { $in: idArr } });
      } else {
        return null;
      }
    })
    .then((result) => {
      if (result !== null) { // actually deleting something
        debug('mongo#deleteComment: deleteWriteOpResult (one round) = ' + inspect(result.result));
      }
      // recursively delete
      // a possible problem is stack overflow
      const childDeleteArr = idArr.map(id => deleteComment(null, null, null, id));
      // parallel deleteComments
      return Promise.all(childDeleteArr);
    });
}

function findCommentsByParentId(parentId, isRecursive = false) {
  parentId = _toObjectId(parentId);
  if (!isRecursive) {
    return connectMongo()
      .then(() => {
        return _MONGO.coll.find({ parentId }).toArray();
      })
      .then((arr) => {
        _stringifyIdFieldOfArray(arr);
        return arr;
      });
  }

  let resultArr;

  return connectMongo()
    .then(() => {
      return _MONGO.coll.find({ parentId }).toArray();
    })
    .then((arr) => {
      resultArr = arr;
      _stringifyIdFieldOfArray(resultArr);
      return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, true)));
    })
    .then((childArr) => {
      resultArr.forEach((e, i) => {
        e.reply = childArr[i];
      });
      return resultArr;
    });
}

// This finds only 1 single comment entry
function findCommentById(postId, isRecursive = false) {
  postId = _toObjectId(postId);
  if (!isRecursive) {
    return connectMongo()
      .then(() => {
        return _MONGO.coll.find({ _id: postId }).toArray();
      })
      .then((arr) => {
        _stringifyIdFieldOfArray(arr);
        if (arr.length === 0) {
          return null;
        } else {
          return arr[0];
        }
      });
  }

  let resultArr;

  return connectMongo()
    .then(() => {
      return _MONGO.coll.find({ _id: postId }).toArray();
    })
    .then((arr) => {
      resultArr = arr;
      _stringifyIdFieldOfArray(resultArr);
      return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, true)));
    })
    .then((childArr) => {
      if (resultArr.length === 0) {
        return null;
      } else {
        resultArr.forEach((e, i) => {
          e.reply = childArr[i];
        })
        return resultArr[0];
      }
    });
}

// DISABLE recursive search here
function findCommentsByUsername(username) {
  return connectMongo()
    .then(() => {
      return _MONGO.coll.find({ username }).toArray();
    })
    .then((arr) => {
      _stringifyIdFieldOfArray(arr);
      return arr;
    });
}

// find only root comments by assoc
function findRootCommentsByAssoc(assoc, isRecursive = false) {
  if (!isRecursive) {
    return connectMongo()
      .then(() => {
        return _MONGO.coll.find({ assoc, parentId: null }).toArray();
      })
      .then((arr) => {
        _stringifyIdFieldOfArray(arr);
        return arr;
      });
  }

  let resultArr;

  return connectMongo()
    .then(() => {
      return _MONGO.coll.find({ assoc, parentId: null }).toArray();
    })
    .then((arr) => {
      resultArr = arr;
      _stringifyIdFieldOfArray(resultArr);
      return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, true)));
    })
    .then((childArr) => {
      resultArr.forEach((e, i) => {
        e.reply = childArr[i];
      });
      return resultArr;
    });
}

module.exports = {
  configure,
  close,
  insert: insertComment,
  update: updateComment,
  delete: deleteComment,
  findById: findCommentById,
  findByParentId: findCommentsByParentId,
  findByUsername: findCommentsByUsername,
  findRootByAssoc: findRootCommentsByAssoc,
};