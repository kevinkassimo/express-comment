const db = require('./db');
const driverTypes = db.driverTypes;
const {
  isObject: _isObject,
  isNullOrUndefined: _isNullOrUndefined,
  isDefined: _isDefined,
  createError: _createError,
  createDebug: _createDebug,
} = require('../common');

const actionTypes = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  FIND_BY_ID: 'findbyid',
  FIND_BY_USERNAME_AND_ASSOC: 'findbyusernameandassoc',
  FIND_ROOT_BY_ASSOC: 'findrootbyassoc',
};

const _error = _createError('backend');
const _debug = _createDebug('express-comment:backend', 'backend');

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
  driver.update(postId, body || null, opaque || null)
    .then(() => {
      res.status(200).json({ response: true });
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
      // Changed to status code 200 to ensure response is extracted by xhr side
      res.status(200).json({ response: true });
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

function createMiddleware(driver, settings) {
  // this unused `settings` will be used to configure settings such as 'MAX allowed levels of reply'
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
createMiddleware.drivers = db.drivers;

module.exports = createMiddleware;
