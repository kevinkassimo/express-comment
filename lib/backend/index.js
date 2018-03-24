const db = require('./db');
const debug = require('debug')('express-comment:backend');
const driverTypes = db.driverTypes;

const actionTypes = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  FIND_BY_ID: 'findbyid',
  FIND_BY_USERNAME_AND_ASSOC: 'findbyusernameandassoc',
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
function _error(action, msg) {
  throw new Error(`backend#${action}: ${msg}`);
}
function _debug(action, msg) {
  debug(`backend#${action}: ${msg}`);
}

function _selectDriver(driverType, settings) {
  let driver;
  _debug('selectDriver', `using driver: ${driverType}`);
  switch (driverType) {
    case driverTypes.MONGO: 
      driver = db.mongo;
      break;
    default:
      _error('selectDriver', 'driver not implemented');
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
  // directly send required fields, OR the optional fields with null
  driver.insert(username, body, assoc || null, parentId || null, opaque || null)
    .then((id) => {
      res.status(201).json({ response: id });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleUpdate(driver, query, res, next) {
  const {
    postId,
    body,
    opaque,
  } = query;
  driver.update(postId, username || null, body || null, opaque || null)
    .then(() => {
      res.status(200).json({ response: null });
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
      res.status(204).json({ response: null });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindById(driver, query, res, next) {
  const {
    postId,
    isRecursive,
    limit,
  } = query;
  driver.findById(postId, isRecursive || false, limit || null)
    .then((result) => {
      if (result === null) {
        res.status(404).json({ response: result });
      } else {
        res.status(200).json({ response: result });
      }
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindByUsernameAndAssoc(driver, query, res, next) {
  const {
    username,
    assoc,
    limit,
  } = query;
  driver.findByUsernameAndAssoc(username || null, assoc || null, limit || null)
    .then((result) => {
      res.status(200).json({ response: result });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindRootByAssoc(driver, query, res, next) {
  const {
    assoc,
    isRecursive,
    limit,
  } = query;
  driver.findRootByAssoc(assoc, isRecursive || false, limit || null)
    .then((result) => {
      res.status(200).json({ response: result });
    })
    .catch((err) => {
      next(err);
    });
}

function createMiddleware(driverType, settings) {
  const driver = _selectDriver(driverType);
  return function(req, res, next) {
    let query;
    if (req.method.toUpperCase() === 'POST') {
      if (!req.body) {
        next('body-parser middleware should be mounted before express-comment');
        return;
      } else {
        query = req.body;
      }
    } else {
      query = req.query;
    }
    _debug('createMiddleware', `action type: ${query.action.toLowerCase()}`);
    switch (query.action.toLowerCase()) { // to lower case always
      case actionTypes.INSERT:
        if (req.method.toUpperCase() !== 'POST') {
          next('insert action should have method POST');
        } else {
          _handleInsert(driver, query, res, next);
        }
        break;
      case actionTypes.UPDATE:
        if (req.method.toUpperCase() !== 'POST') {
          next('update action should have method POST');
        } else {
          _handleUpdate(driver, query, res, next);
        }
        break;
      case actionTypes.DELETE:
        if (req.method.toUpperCase() !== 'POST') {
          next('delete action should have method POST');
        } else {
          _handleDelete(driver, query, res, next);
        }
        break;
      case actionTypes.FIND_BY_ID:
        _handleFindById(driver, query, res, next);
        break;
      case actionTypes.FIND_BY_USERNAME_AND_ASSOC:
        _handleFindByUsernameAndAssoc(driver, query, res, next);
        break;
      case actionTypes.FIND_ROOT_BY_ASSOC:
        _handleFindRootByAssoc(driver, query, res, next);
        break;
      default:
        next(`action not recognized: ${query.action}`);
    }
  }
}

createMiddleware.driverTypes = driverTypes;

module.exports = createMiddleware;
