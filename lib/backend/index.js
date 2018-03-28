const db = require('./db');
const {
  isObject: _isObject,
  isNullOrUndefined: _isNullOrUndefined,
  isDefined: _isDefined,
  createError: _createError,
  createDebug: _createDebug,
} = require('./utils');

const actionTypes = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
  COUNT: 'count',
  FIND_BY_ID: 'findbyid',
  FIND_BY_USERNAME_AND_ASSOC: 'findbyusernameandassoc',
  FIND_ROOT_BY_ASSOC: 'findrootbyassoc',
};

const _error = _createError('backend');
const _debug = _createDebug('express-comment:backend', 'backend');

// to floored number or boolean (if not number)
// this is to fix a design flaw
function _recoverURLParamBooleanOrInteger(v) {
  if (_isNullOrUndefined(v)) {
    return false; // false if not specified
  }
  let lv = v.toString().toLowerCase();
  let nv = +v;
  if (lv === 'true') {
    return true;
  } else if (lv === 'false') {
    return false;
  }
  if (nv === nv) {
    return Math.floor(nv);
  }
  return false; // default to false
}

function _recoverURLParamString(s) {
  if (_isNullOrUndefined(s)) {
    return null;
  } else {
    return s.toString();
  }
}

function _recoverURLParamInteger(n) {
  if (_isNullOrUndefined(n)) {
    return null;
  } else {
    let _n = +n;
    if (_n === _n) {
      return Math.floor(_n);
    } else {
      return null;
    }
  }
}

// make sure query types are correctly interpreted
function _processQuery(q) {
  return {
    postId: _recoverURLParamString(q.postId),
    username: _recoverURLParamString(q.username),
    body: _recoverURLParamString(q.body),
    assoc: _recoverURLParamString(q.assoc),
    parentId: _recoverURLParamString(q.parentId),
    opaque: _recoverURLParamString(q.opaque),
    isRecursive: _recoverURLParamBooleanOrInteger(q.isRecursive),
    limit: _recoverURLParamInteger(q.limit),
  };
}

function _handleInsert(driver, query, res, next) {
  const q = _processQuery(query);
  // directly send required fields, OR the optional fields with null
  driver.insert(q.username, q.body, q.assoc, q.parentId, q.opaque)
    .then((id) => {
      res.status(200).json({ response: id });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleUpdate(driver, query, res, next) {
  const q = _processQuery(query);
  driver.update(q.postId, q.body, q.opaque)
    .then(() => {
      res.status(200).json({ response: true });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleDelete(driver, query, res, next) {
  const q = _processQuery(query);
  driver.delete(q.postId, q.username, q.assoc, q.parentId)
    .then(() => {
      // Changed to status code 200 to ensure response is extracted by xhr side
      res.status(200).json({ response: true });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleCount(driver, query, res, next) {
  const q = _processQuery(query);
  driver.count(q.postId, q.username, q.assoc, q.parentId)
    .then((c) => {
      res.status(200).json({ response: c });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindById(driver, query, res, next) {
  const q = _processQuery(query);
  driver.findById(q.postId, q.isRecursive, q.limit)
    .then((result) => {
      res.status(200).json({ response: result });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindByUsernameAndAssoc(driver, query, res, next) {
  const q = _processQuery(query);
  driver.findByUsernameAndAssoc(q.username, q.assoc, q.limit)
    .then((result) => {
      res.status(200).json({ response: result });
    })
    .catch((err) => {
      next(err);
    });
}

function _handleFindRootByAssoc(driver, query, res, next) {
  const q = _processQuery(query);
  driver.findRootByAssoc(q.assoc, q.isRecursive, q.limit)
    .then((result) => {
      res.status(200).json({ response: result });
    })
    .catch((err) => {
      next(err);
    });
}

function _justifyECSettings(ecSettings) {
  if (_isObject(ecSettings)) {
    if (ecSettings.maxReplyLevel && +ecSettings.maxReplyLevel < 0) {
      _error('justifyECSettings', 'maxReplyLevel should be >= 0');
    }
    if (ecSettings.maxRecurseLevel && +ecSettings.maxRecurseLevel < 1) {
      _error('justifyECSettings', 'maxRecurseLevel should be >= 1');
    }
  }
  return ecSettings;
}

function createMiddleware(driver, settings) {
  if (_isObject(settings)) {
    settings = _justifyECSettings(settings);
    driver.configure(null, settings); // configure ecSettings
  }
  // this unused `settings` will be used to configure settings such as 'MAX allowed levels of reply'
  return function(req, res, next) {
    let query;
    const _isPost = req.method.toUpperCase() === 'POST';
    if (_isPost) {
      if (!req.body) {
        next('body-parser middleware (urlencoded) should be mounted before express-comment');
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
        if (!_isPost) {
          next('insert action should have method POST');
        } else {
          _handleInsert(driver, query, res, next);
        }
        break;
      case actionTypes.UPDATE:
      if (!_isPost) {
          next('update action should have method POST');
        } else {
          _handleUpdate(driver, query, res, next);
        }
        break;
      case actionTypes.DELETE:
        if (!_isPost) {
          next('delete action should have method POST');
        } else {
          _handleDelete(driver, query, res, next);
        }
        break;
      case actionTypes.COUNT:
        _handleCount(driver, query, res, next);
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

createMiddleware.drivers = db.drivers;

module.exports = createMiddleware;
