const Sequelize = require('sequelize');
const Op = Sequelize.Op;
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

let sql = null;
const _SQL = {
  database: null,
  username: null,
  password: null,
  settings: {},
};

let _ecSettings = {};

let Comments = null;

function connectSQL() {
  if (sql) {
    return Promise.resolve(sql);
  }
  if (_SQL.settings) {
    if (_SQL.settings.query) {
      _SQL.settings.query.raw = true; // force to be raw objects
    } else {
      _SQL.settings.query = { raw: true };
    }
    // Disable deprecation warnings
    _SQL.settings.operatorsAliases = false;
    if (_SQL.settings.logging === undefined) {
      _SQL.settings.logging = false; // turn off log if user not specified
    }
  }
  sql = new Sequelize(_SQL.database, _SQL.username, _SQL.password, _SQL.settings);
  Comments = sql.define('express-comment-db', {
    _id: {
      type: Sequelize.BIGINT, // this is BIGINT!!!
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    username: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    body: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    assoc: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    level: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    parentId: {
      type: Sequelize.BIGINT,
      allowNull: true,
      defaultValue: null,
    },
    opaque: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    createdAt: Sequelize.DATE,
    modifiedAt: Sequelize.DATE,
  });

  return Comments.sync()
    .then(() => {
      return sql;
    });
}

function configure(o, ecSettings) {
  if (_isObject(o)) {
    const {
      database,
      username,
      password, 
      settings,
    } = o;
    if (database) {
      _SQL.database = database;
    }
    if (username) {
      _SQL.username = username;
    }
    if (password) {
      _SQL.password = password;
    }
    if (_isObject(settings)) {
      _SQL.settings = settings;
    }
  }
  
  if (_isObject(ecSettings)) {
    _ecSettings = Object.assign({}, _ecSettings, ecSettings);
  }
}

// stringify certain fields of array, to comply with API requirement
function _stringifyCustomFieldsOfArray(arr) {
  arr.forEach((e) => {
    e._id = e._id.toString();
    if (_isDefined(e.parentId)) {
      e.parentId = e.parentId.toString();
    }
    e.createdAt = e.createdAt.toISOString();
    e.modifiedAt = e.modifiedAt.toISOString();
  })
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

const _error = _createError('sequelize');
const _reject = _createReject('sequelize');
const _debug = _createDebug('sequelize');

// reject if required is missing
function _checkRequired(action, name, prop) {
  if (_isNullOrUndefined(prop)) {
    return _reject(action, `${name} is required`);
  }
}

function close() {
  return sql.close();
}

function insertComment(username, body, assoc, parentId, opaque) {

  try {
    parentId = _toFloorNumberIfExist(parentId); // to number instead
  } catch (e) {
    return Promise.reject(e);
  }

  return connectSQL()
    .then(() => _checkRequired('insert', 'username', username))
    .then(() => _checkRequired('insert', 'body', body))
    .then(() =>{
      if (username === '') { // username extra non-empty check
        return _reject('insert', 'username should not be empty');
      }
    })
    .then(() => {
      if (_isNullOrUndefined(parentId)) {
        if (_isNullOrUndefined(assoc)) {
          return _reject('insert', 'assoc must be given if is root comment (no parentId specified)');
        }
        _debug('insert', 'parentId not specified, use null');
        return true;
      } else {
        _debug('insert', 'checking parentId');
        return Comments.findById(parentId); // Promise<Model|null>
      }
    })
    .then((result) => {
      if (!result) {
        return _reject('insert', 'cannot chain to a non-existent parent id');
      }

      const entry = {
        username,
        body,
        assoc: null, // assign later
        parentId,
        opaque,
        level: 0, // level of comment, 0 for root level comment
        createdAt: new Date(),
        modifiedAt: new Date(),
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

      return Comments.create(entry);
    })
    .then((result) => {
      _debug('insert', `created entry = ${result}`);
      return Promise.all([result._id.toString(), Comments.sync()]);
    })
    .then(results => results[0]);
}

/*
Remove ability to change parent, since it is never useful and will introduce cyclic search
if used incorrectly (exploited)
*/
function updateComment(postId, body, opaque) {

  try {
    postId = _toFloorNumberIfExist(postId);
  } catch (e) {
    return Promise.reject(e);
  }

  return connectSQL()
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
      _debug('update', `updating entry = ${inspect(entry)}`);
      return Comments.update(entry, {
        where: {
          _id: {
            [Op.eq]: postId,
          },
        },
      });
    })
    .then(result => {
      _debug('update', `(affectedCount, affectedRows)[] = ${result}`);
      return Comments.sync();
    });
}

function deleteComment(postId, username, assoc, parentId) {

  try {
    postId = _toFloorNumberIfExist(postId);
    parentId = _toFloorNumberIfExist(parentId);
  } catch (e) {
    return Promise.reject(e);
  }

  let idArr;
  return connectSQL()
    .then(() => {
      let entry = null;
      if (_isDefined(postId)) {
        entry = entry || {};
        entry._id = {
          [Op.eq]: postId,
        };
      }
      if (_isDefined(username)) {
        entry = entry || {};
        entry.username = {
          [Op.eq]: username,
        };
      }
      if (_isDefined(assoc)) {
        entry = entry || {};
        entry.assoc = {
          [Op.eq]: assoc,
        };
      }
      if (_isDefined(parentId)) {
        entry = entry || {};
        entry.parentId = {
          [Op.eq]: parentId,
        };
      }
      if (entry) {
        return Comments.findAll({
          attributes: ['_id'],
          where: entry,
        })
      } else {
        _debug('delete', 'no match found, fail silently');
        return [];
      }
    })
    .then((arr) => {
      idArr = arr.map(e => e._id);
      if (idArr.length > 0) {
        return Comments.destroy({
          where: {
            _id: {
              [Op.in]: idArr, // equal to _id Op.in idArr
            },
          },
        }); // Promise<Integer>
      } else {
        return 0;
      }
    })
    .then((result) => {
      if (result > 0) { // actually deleting something
        _debug('delete', `delete count (one round) = ${result}`);
      }
      // recursively delete
      // a possible problem is stack overflow
      const childDeleteArr = idArr.map(id => deleteComment(null, null, null, id));
      // parallel deleteComments
      return Promise.all(childDeleteArr);
    })
    .then(() => Comments.sync());
}

function countComment(postId, username, assoc, parentId) {

  try {
    postId = _toFloorNumberIfExist(postId);
    parentId = _toFloorNumberIfExist(parentId);
  } catch (e) {
    return Promise.reject(e);
  }

  let idArr;
  return connectSQL()
    .then(() => {
      let entry = null;
      if (_isDefined(postId)) {
        entry = entry || {};
        entry._id = {
          [Op.eq]: postId,
        };
      }
      if (_isDefined(username)) {
        entry = entry || {};
        entry.username = {
          [Op.eq]: username,
        };
      }
      if (_isDefined(assoc)) {
        entry = entry || {};
        entry.assoc = {
          [Op.eq]: assoc,
        };
      }
      if (_isDefined(parentId)) {
        entry = entry || {};
        entry.parentId = {
          [Op.eq]: parentId,
        };
      }
      if (entry) {
        return Comments.count({
          attributes: ['_id'],
          where: entry,
        });
      } else {
        _debug('delete', 'no property specified, return 0 matched');
        return 0;
      }
    });
}

function findCommentsByParentId(parentId, isRecursive = false, recursedLevel = 0) {

  try {
    parentId = _toFloorNumberIfExist(parentId);
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
  const _basePromise = connectSQL()
    .then(() => _checkRequired('findByParentId', 'parentId', parentId))
    .then(() => {
      return Comments.findAll({
        where: {
          parentId: {
            [Op.eq]: parentId,
          },
        },
      });
    })
    .then((arr) => {
      _stringifyCustomFieldsOfArray(arr);
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
      });
  }
}

// This finds only 1 single comment entry
function findCommentById(postId, isRecursive = false) {

  try {
    postId = _toFloorNumberIfExist(postId);
    isRecursive = _toFloorNumberOrBool(isRecursive);
  } catch (e) {
    return Promise.reject(e);
  }

  if (_isNumber(isRecursive) && isRecursive <= 0) {
    return Promise.resolve([]);
  }

  let resultArr;
  const _basePromise = connectSQL()
    .then(() => _checkRequired('findById', 'postId', postId))
    .then(() => {
      return Comments.findAll({
        where: {
          _id: {
            [Op.eq]: postId,
          },
        },
      });
    })
    .then((arr) => {
      _stringifyCustomFieldsOfArray(arr);
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
        })
        return resultArr;
      });
  }
}

// DISABLE recursive search here
function findCommentsByUsernameAndAssoc(username = null, assoc = null, limit = null) {
  return connectSQL()
    .then(() => {
      let entry = null;
      if (_isDefined(username)) {
        entry = entry || {};
        entry.username = {
          [Op.eq]: username,
        };
      }
      if (_isDefined(assoc)) {
        entry = entry || {};
        entry.assoc = {
          [Op.eq]: assoc,
        };
      }

      if (!entry) {
        return [];
      } else {
        if (_isNullOrUndefined(limit) || limit === 0) {
          return Comments.findAll({
            where: entry,
          });
        } else {
          return Comments.findAll({
            where: entry,
            limit,
          });
        }
      }
    })
    .then((arr) => {
      _stringifyCustomFieldsOfArray(arr);
      return arr;
    });
}

// find only root comments by assoc
function findRootCommentsByAssoc(assoc, isRecursive = false, limit = null) {

  isRecursive = _toFloorNumberOrBool(isRecursive);

  if (_isNumber(isRecursive) && isRecursive <= 0) {
    return Promise.resolve([]);
  }

  let resultArr;
  const _basePromise = connectSQL()
    .then(() => _checkRequired('findRootByAssoc', 'assoc', assoc))
    .then(() => {
      if (_isNullOrUndefined(limit) || limit === 0) {
        return Comments.findAll({
          where: {
            assoc: {
              [Op.eq]: assoc,
            },
            parentId: {
              [Op.eq]: null,
            },
          },
        });
      } else {
        return Comments.findAll({
          where: {
            assoc: {
              [Op.eq]: assoc,
            },
            parentId: {
              [Op.eq]: null,
            },
          },
          limit,
        });
      }
    })
    .then((arr) => {
      _stringifyCustomFieldsOfArray(arr);
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
  findById: findCommentById,
  findByParentId: findCommentsByParentId,
  findByUsernameAndAssoc: findCommentsByUsernameAndAssoc,
  findRootByAssoc: findRootCommentsByAssoc,
};
