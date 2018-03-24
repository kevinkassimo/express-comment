const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const debug = require('debug')('express-comment:db:sequelize');
const inspect = require('util').inspect;

let sql = null;
const _SQL = {
  database: null,
  username: null,
  password: null,
  settings: null,
};
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

function configure(o) {
  const {
    database,
    username,
    password, 
    ...settings
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
  _SQL.settings = settings;
}

function _isNullOrUndefined(v) {
  return v === null || v === undefined;
}
function _isDefined(v) {
  return v !== null && v !== undefined;
}
// convert ObjectId to string in an array of entries, to comply with API requirement
function _stringifyIdFieldOfArray(arr) {
  arr.forEach(e => e._id = e._id.toString());
}
// stringify only when s is not null/undefined, otherwise force to null
function _toStringIfExist(s) {
  return _isDefined(s) ? s.toString() : null;
}
// to number only when s is not null/undefined, otherwise force to null
function _toNumberIfExist(n) {
  return _isDefined(n) ? (+n || null) : null;
}
// reject wrapper
function _reject(action, msg) {
  return Promise.reject(new Error(`sequelize#${action}: ${msg}`));
}
// debug wrapper
function _debug(action, msg) {
  debug(`sequelize#${action}: ${msg}`);
}
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
    username = _toStringIfExist(username);
    body = _toStringIfExist(body);
    assoc = _toStringIfExist(assoc);
    parentId = _toNumberIfExist(parentId); // to number instead
    opaque = _toStringIfExist(opaque);
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
      if (_isDefined(assoc) && assoc !== result.assoc) {
        _debug('insert', 'assoc does not match parent assoc, use assoc of parent instead');
      }

      const entry = {
        username,
        body,
        assoc: result === true ? assoc : result.assoc, // use parent assoc
        parentId,
        opaque,
        createdAt: new Date(),
        modifiedAt: new Date(),
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
    postId = _toNumberIfExist(postId);
    body = _toStringIfExist(body);
    opaque = _toStringIfExist(opaque);
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
    postId = _toNumberIfExist(postId);
    username = _toStringIfExist(username);
    assoc = _toStringIfExist(assoc);
    parentId = _toNumberIfExist(parentId);
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

function findCommentsByParentId(parentId, isRecursive = false) {

  try {
    parentId = _toNumberIfExist(parentId);
  } catch (e) {
    return Promise.reject(e);
  }

  if (!isRecursive) {
    return connectSQL()
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
        _stringifyIdFieldOfArray(arr);
        return arr;
      });
  }

  let resultArr;

  return connectSQL()
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

  try {
    postId = _toNumberIfExist(postId);
  } catch (e) {
    return Promise.reject(e);
  }

  if (!isRecursive) {
    return connectSQL()
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
        _stringifyIdFieldOfArray(arr);
        return arr; // always returns an array
      });
  }

  let resultArr;

  return connectSQL()
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
      resultArr = arr;
      _stringifyIdFieldOfArray(resultArr);
      return Promise.all(resultArr.map(e => findCommentsByParentId(e._id, true)));
    })
    .then((childArr) => {
      resultArr.forEach((e, i) => {
        e.reply = childArr[i];
      })
      return resultArr;
    });
}

// DISABLE recursive search here
function findCommentsByUsernameAndAssoc(username = null, assoc = null, limit = null) {

  username = _toStringIfExist(username);
  assoc = _toStringIfExist(assoc);
  limit = _toNumberIfExist(limit);

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
      _stringifyIdFieldOfArray(arr);
      return arr;
    });
}

// find only root comments by assoc
function findRootCommentsByAssoc(assoc, isRecursive = false, limit = null) {

  assoc = _toStringIfExist(assoc);
  limit = _toNumberIfExist(limit);

  if (!isRecursive) {
    return connectSQL()
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
        _stringifyIdFieldOfArray(arr);
        return arr;
      });
  }

  let resultArr;

  return connectSQL()
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
  findByUsernameAndAssoc: findCommentsByUsernameAndAssoc,
  findRootByAssoc: findRootCommentsByAssoc,
};
