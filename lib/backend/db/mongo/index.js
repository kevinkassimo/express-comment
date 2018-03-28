const MongoDB = require('mongodb');
const MongoClient = MongoDB.MongoClient;
const inspect = require('util').inspect;
const {
  createReject: _createReject,
  createError: _createError,
  createDebug: _createDebug,
  isNullOrUndefined: _isNullOrUndefined,
  isDefined: _isDefined,
  isObject: _isObject,
  isNumber: _isNumber,
} = require('../../utils');

const _MONGO = {
  url: 'mongodb://localhost:27017',
  dbName: 'express-comment-db',
  collName: 'comments',
  settings: undefined,

  // private fields
  client: null,
  db: null,
  coll: null,
};

let _ecSettings = {};

const _reject = _createReject('mongo');
const _debug = _createDebug('express-comment:db:mongo', 'mongo');
const _error = _createError('mongo');

// convert to ObjectId if s is string (avoid undefined || null)
function _toObjectId(s) {
  return typeof s === 'string' ? MongoDB.ObjectId.createFromHexString(s) : s;
}
// convert ObjectId to string in an array of entries, to comply with API requirement
function _stringifyIdFieldOfArray(arr) {
  arr.forEach(e => e._id = e._id.toString());
}
// convert ObjectId to string in an array of entries, to comply with API requirement
function _stringifyParentIdFieldOfArray(arr) {
  arr.forEach((e) => {
    if (_isDefined(e.parentId)) {
      e.parentId = e.parentId.toString();
    }
  });
}
// stringify only when s is not null/undefined, otherwise force to null
function _toStringIfExist(s) {
  return _isDefined(s) ? s.toString() : null;
}
// to floor number only when s is not null/undefined, otherwise force to null
function _toFloorNumberIfExist(n) {
  if (_isDefined(n)) {
    const _n = +n;
    if (!!_n) {
      return Math.floor(_n);
    }
  }
  return null;
}
// to floored number or boolean (if not number)
function _toFloorNumberOrBool(v) {
  switch (typeof v) {
    case 'boolean':
      return v;
    case 'number':
      return Math.floor(v);
    default:
      return !!v;
  }
}
// decr or follow boolean
function _decrementOrFollow(v) {
  switch (typeof v) {
    case 'boolean':
      return v;
    case 'number':
      return Math.floor(v) - 1;
    default:
      return !!v;
  }
}
// reject if required is missing
function _checkRequired(action, name, prop) {
  if (_isNullOrUndefined(prop)) {
    return _reject(action, `${name} is required`);
  }
}

// o for db specific settings, ecSettings for ec specific settings
function configure(o, ecSettings) {
  if (_isObject(o)) {
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

  if (_isObject(ecSettings)) {
    _ecSettings = {
      ..._ecSettings,
      ...ecSettings,
    };
  }
}

function close() {
  return _MONGO.client.close();
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

  try {
    username = _toStringIfExist(username);
    body = _toStringIfExist(body);
    assoc = _toStringIfExist(assoc);
    parentId = _toObjectId(parentId);
    opaque = _toStringIfExist(opaque);
  } catch (e) {
    return Promise.reject(e);
  }

  return connectMongo()
    .then(() => _checkRequired('insert', 'username', username))
    .then(() => _checkRequired('insert', 'body', body))
    .then(() => {
      if (username === '') { // username extra non-empty check
        return _reject('insert', 'username should not be empty');
      }
    })
    .then(() => {
      if (_isNullOrUndefined(parentId)) {
        if (_isNullOrUndefined(assoc)) {
          return _reject('insert', 'assoc must be given if is root comment (no parentId specified)');
        }
        _debug('insert', 'parentId not specified, use null (root comment)');
        return true; // placeholder, differentiable from the found object
      } else {
        _debug('insert', 'checking parentId');
        return _MONGO.coll.findOne({ _id: parentId });
      }
    })
    .then((result) => {
      if (!result) {
        return _reject('insert', 'cannot reply to a non-existent parent id');
      }

      const entry = {
        username,
        body,
        assoc: null, // assign later
        parentId,
        opaque,
        level: 0, // level of comment, 0 for root level comment
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      if (result === true) { // root level comment, no parentId
        entry.assoc = assoc;
        entry.level = 0;
      } else {
        if (_isDefined(assoc) && assoc !== result.assoc) {
          _debug('insert', 'assoc does not match parent assoc, use assoc of parent instead');
        }
        entry.assoc = result.assoc;
        entry.level = (result.level + 1) || 0; // incr level
      }

      // ecSettings
      if (_isDefined(_ecSettings.maxReplyLevel)) {
        if (_ecSettings.maxReplyLevel <= entry.level) {
          return _reject('insert', 'max reply level reached');
        }
      }

      return _MONGO.coll.insertOne(entry);
    })
    .then((result) => {
      _debug('insert', `insertOnWriteOpResult = ${inspect(result.result)}`);
      return result.insertedId.toString();
    });
}

/*
Remove ability to change parent, since it is never useful and will introduce cyclic search
if used incorrectly (exploited)
*/
function updateComment(postId, body, opaque) {

  try {
    postId = _toObjectId(postId);
    body = _toStringIfExist(body);
    opaque = _toStringIfExist(opaque);
  } catch (e) {
    return Promise.reject(e);
  }

  return connectMongo()
    .then(() => _checkRequired('update', 'postId', postId))
    .then(() => {
      const entry = {
        modifiedAt: new Date().toISOString(),
      };
      // only change field values if explicitly set
      // means that cannot set field to null/undefined after initial set
      if (_isDefined(body)) {
        entry.body = body;
      }
      if (_isDefined(opaque)) {
        entry.opaque = opaque;
      }
      _debug('update', `update entry = ${inspect(entry)}`);
      return _MONGO.coll.updateOne({ _id: postId }, { $set: entry });
    })
    .then(result => {
      _debug('update', `updateWriteOpResult = ${inspect(result.result)}`);
      return true;
    });
}

function deleteComment(postId, username, assoc, parentId) {

  try {
    postId = _toObjectId(postId);
    username = _toStringIfExist(username);
    assoc = _toStringIfExist(assoc);
    parentId = _toObjectId(parentId);
  } catch (e) {
    return Promise.reject(e);
  }

  let idArr;
  return connectMongo()
    .then(() => {
      const coll = _MONGO.coll;
      let entry = null;
      if (_isDefined(postId)) {
        entry = entry || {};
        entry._id = postId;
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
        _debug('delete', 'no match found, fail silently');
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
        _debug('delete', `deleteWriteOpResult (one round) = ${inspect(result.result)}`);
      }
      // recursively delete
      // a possible problem is stack overflow
      const childDeleteArr = idArr.map(id => deleteComment(null, null, null, id));
      // parallel deleteComments
      return Promise.all(childDeleteArr);
    });
}

function countComment(postId, username, assoc, parentId) {

  try {
    postId = _toObjectId(postId);
    username = _toStringIfExist(username);
    assoc = _toStringIfExist(assoc);
    parentId = _toObjectId(parentId);
  } catch (e) {
    return Promise.reject(e);
  }

  return connectMongo()
    .then(() => {
      const coll = _MONGO.coll;
      let entry = null;
      if (_isDefined(postId)) {
        entry = entry || {};
        entry._id = postId;
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
        return coll.count(entry);
      } else {
        _debug('count', 'no property specified, return 0 matched');
        return 0;
      }
    });
}

function findCommentsByParentId(parentId, isRecursive = false, recursedLevel = 0) {

  try {
    parentId = _toObjectId(parentId);
    isRecursive = _toFloorNumberOrBool(isRecursive);
  } catch (e) {
    return Promise.reject(e);
  }

  // Short circuit if capped by maxRecurseLevel
  if (_ecSettings.maxRecurseLevel && recursedLevel >= _ecSettings.maxRecurseLevel) {
    return Promise.resolve([]);
  }

  // Short circuit if DONE by isRecursive
  if (_isNumber(isRecursive) && isRecursive <= 0) {
    return Promise.resolve([]);
  }

  let resultArr;
  // _basePromise conducts only 1 level
  const _basePromise = connectMongo()
    .then(() => _checkRequired('findByParentId', 'parentId', parentId))
    .then(() => {
      return _MONGO.coll.find({ parentId }).toArray();
    })
    .then((arr) => {
      _stringifyIdFieldOfArray(arr);
      _stringifyParentIdFieldOfArray(arr);
      resultArr = arr;
      return arr;
    });
  
  if (isRecursive === false) {
    return _basePromise;
  } else {
    return _basePromise
      .then(() => {
        const nextIsRecursive = _decrementOrFollow(isRecursive);
        return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, nextIsRecursive, recursedLevel + 1)));
      })
      .then((childArr) => {
        resultArr.forEach((e, i) => {
          e.reply = childArr[i];
        });
        return resultArr;
      })
  }
}

// This finds only 1 single comment entry
function findCommentById(postId, isRecursive = false) {

  try {
    postId = _toObjectId(postId);
    isRecursive = _toFloorNumberOrBool(isRecursive);
  } catch (e) {
    return Promise.reject(e);
  }

  if (_isNumber(isRecursive) && isRecursive <= 0) {
    return Promise.resolve([]);
  }

  let resultArr;
  const _basePromise = connectMongo()
    .then(() => _checkRequired('findById', 'postId', postId))
    .then(() => {
      return _MONGO.coll.find({ _id: postId }).toArray();
    })
    .then((arr) => {
      _stringifyIdFieldOfArray(arr);
      _stringifyParentIdFieldOfArray(arr);
      resultArr = arr;
      return arr; // always returns an array
    });
  
  if (isRecursive === false) {
    return _basePromise;
  } else {
    return _basePromise
      .then(() => {
        const nextIsRecursive = _decrementOrFollow(isRecursive);
        return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, nextIsRecursive, 1)));
      })
      .then((childArr) => {
        resultArr.forEach((e, i) => {
          e.reply = childArr[i];
        })
        return resultArr;
      });
  }
}

// DISABLE recursive search here
function findCommentsByUsernameAndAssoc(username = null, assoc = null, limit = null) {

  try {
    username = _toStringIfExist(username);
    assoc = _toStringIfExist(assoc);
    limit = _toFloorNumberIfExist(limit);
  } catch (e) {
    return Promise.reject(e);
  }

  return connectMongo()
    .then(() => {
      let entry = null;
      if (_isDefined(username)) {
        entry = entry || {};
        entry.username = username;
      }
      if (_isDefined(assoc)) {
        entry = entry || {};
        entry.assoc = assoc;
      }

      if (!entry) {
        return [];
      } else {
        if (_isNullOrUndefined(limit) || limit === 0) {
          return _MONGO.coll.find(entry).toArray();
        } else {
          return _MONGO.coll.find(entry).limit(limit).toArray();
        }
      }
    })
    .then((arr) => {
      _stringifyIdFieldOfArray(arr);
      _stringifyParentIdFieldOfArray(arr);
      return arr;
    });
}

// find only root comments by assoc
function findRootCommentsByAssoc(assoc, isRecursive = false, limit = null) {

  try {
    assoc = _toStringIfExist(assoc);
    isRecursive = _toFloorNumberOrBool(isRecursive);
    limit = _toFloorNumberIfExist(limit);
  } catch (e) {
    return Promise.reject(e);
  }

  if (_isNumber(isRecursive) && isRecursive <= 0) {
    return Promise.resolve([]);
  }

  let resultArr;
  const _basePromise = connectMongo()
    .then(() => _checkRequired('findRootByAssoc', 'assoc', assoc))
    .then(() => {
      if (_isNullOrUndefined(limit) || limit === 0) {
        return _MONGO.coll.find({ assoc, parentId: null }).toArray();
      } else {
        return _MONGO.coll.find({ assoc, parentId: null }).limit(limit).toArray();
      }
    })
    .then((arr) => {
      _stringifyIdFieldOfArray(arr);
      _stringifyParentIdFieldOfArray(arr);
      resultArr = arr;
      return arr;
    });
  
  if (isRecursive === false) {
    return _basePromise;
  } else {
    return _basePromise
      .then(() => {
        const nextIsRecursive = _decrementOrFollow(isRecursive);
        return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, nextIsRecursive, 1)));
      })
      .then((childArr) => {
        resultArr.forEach((e, i) => {
          e.reply = childArr[i];
        });
        return resultArr;
      });
  }
}

module.exports = {
  configure,
  close,
  insert: insertComment,
  update: updateComment,
  delete: deleteComment,
  count: countComment,
  findById: findCommentById,
  findByUsernameAndAssoc: findCommentsByUsernameAndAssoc,
  findRootByAssoc: findRootCommentsByAssoc,
};
