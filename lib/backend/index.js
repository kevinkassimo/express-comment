/*
Spec:

action = insert
username = username
body = any
assoc? = assoc_id // e.g. passage id
parentId? = parent_id
opaque? = JSONString

action = update
postId = id
username? = username
body? = any
opaque? = JSONString

action = delete
postId? = id
username? = username
assoc? = assoc_id
parentId? = parent_id

action = findById
postId = id
isRecursive? = true|false

action = findByUsername
username = username

action = findRootByAssoc
assoc = assoc_id
isRecursive? = true|false

{
    username: "username",
    body: "body",
    assoc: "",
    parent: "",
}

/some/path?action=insert&body=
*/

const db = require('./db');
const driverTypes = db.driverTypes;

const actionTypes = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  FIND_BY_ID: 'findbyid',
  FIND_BY_USERNAME: 'findbyusername',
  FIND_ROOT_BY_ASSOC: 'findrootbyassoc',
};

function _isObject(o) {
  return typeof o === 'object' && o !== null;
}

function _isNullOrUndefined(v) {
  return v === null || v === undefined;
}
function _isDefined(v) {
  return v !== null && v !== undefined;
}

function _selectDriver(driverType, settings) {
  let driver;
  switch (driverType) {
    case driverTypes.MONGO: 
      driver = db.mongo;
      break;
    default:
      throw new Error('driver not implemented');
  }
  if (_isObject(settings)) {
    driver.configure(settings);
  }
  return driver;
}

function _handleInsert(driver, query, res, next) {
  const {
    username,
    body,
    assoc,
    parentId,
    opaque,
  } = query;
  driver.insert(username || '', body || '', assoc || null, parentId || null, opaque || null)
    .then((id) => {
      res.status(201).json({ postId: id });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleUpdate(driver, query, res, next) {
  const {
    postId,
    username,
    body,
    opaque,
  } = query;
  if (_isNullOrUndefined(postId)) {
    next('postId is required');
    return;
  }
  driver.update(postId, username || null, body || null, opaque || null)
    .then(() => {
      res.status(200).json({});
    })
    .catch((err) => {
      next(err);
    });
}

function _handleDelete(driver, query, res, next) {
  const {
    postId,
    username,
    assoc,
    parentId,
  } = query;
  driver.delete(postId || null, username || null, assoc || null, parentId || null)
    .then(() => {
      res.status(204).json({});
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindById(driver, query, res, next) {
  const {
    postId,
    isRecursive,
  } = query;
  if (_isNullOrUndefined(postId)) {
    next('postId is required');
    return;
  }
  driver.findById(postId, isRecursive || false)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindByUsername(driver, query, res, next) {
  const {
    username,
  } = query;
  if (_isNullOrUndefined(username)) {
    next('username is required');
    return;
  }
  driver.findByUsername(username)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindRootByAssoc(driver, query, res, next) {
  const {
    assoc,
    isRecursive,
  } = query;
  if (_isNullOrUndefined(assoc)) {
    next('assoc is required');
    return;
  }
  driver.findRootByAssoc(assoc, isRecursive || false)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      next(err);
    });
}

function createMiddleware(driverType, settings) {
  const driver = _selectDriver(driverType);
  return function(req, res, next) {
    const {
      query,
    } = req;
    switch (query.action.toLowerCase()) { // to lower case always
      case actionTypes.INSERT:
        _handleInsert(driver, query, res, next);
        break;
      case actionTypes.UPDATE:
        _handleUpdate(driver, query, res, next);
        break;
      case actionTypes.DELETE:
        _handleDelete(driver, query, res, next);
        break;
      case actionTypes.FIND_BY_ID:
        _handleFindById(driver, query, res, next);
        break;
      case actionTypes.FIND_BY_USERNAME:
        _handleFindByUsername(driver, query, res, next);
        break;
      case actionTypes.FIND_ROOT_BY_ASSOC:
        _handleFindRootByAssoc(driver, query, res, next);
        break;
      default:
        next('action not recognized');
    }
  }
}

createMiddleware.driverTypes = driverTypes;

module.exports = createMiddleware;
