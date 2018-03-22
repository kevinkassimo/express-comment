var commentFactory = function(window, path) {
  var XMLHttpRequest = window.XMLHttpRequest;
  if (!XMLHttpRequest) {
    throw new Error('XMLHttpRequest is not found');
  }
  var escape = window.encodeURIComponent;
  if (!escape) {
    throw new Error('encodeURIComponent is not found');
  }
  
  var Promise = window.Promise;

  if (path === '') {
    path = '/';
  }
  if (path.length > 1 && path[path.length-1] === '/') {
    path = path.substring(0, path.length-1);
  }

  var _isNullOrUndefined = function(v) {
    return v === null || v === undefined;
  };

  var _isDefined = function(v) {
    return !_isNullOrUndefined(v);
  };

  var _isFunction = function(f) {
    return typeof f === 'function';
  };
  
  var comment = {};

  var FIND_PROTO = 'find_proto';
  var FIND_ALL_PROTO = 'find_all_proto';

  /*
  comment.comment(username, body[, opaque]).on(assoc).fire();
  comment.reply(username, body[, opaque]).to(parentId).fire();
  comment.update(username, body[, opaque]).of(postId).fire();
  comment.delete().by(username).on(assoc).fire();
  comment.delete().of(postId).fire();
  comment.findOne().of(postId).fire();
  comment.findOne().of(postId).full().fire();
  comment.findAll().by(username).fire();
  comment.findAll().on(assoc).fire();
  comment.findAll().on(assoc).full().fire();
  */

  comment.comment = function(username, body, opaque) {
    if (_isNullOrUndefined(username) || username === '') {
      throw new Error('username must be specified and non-empty');
    }
    if (_isNullOrUndefined(body)) {
      throw new Error('username must be specified');
    }
    if (_isNullOrUndefined(opaque)) {
      opaque = null;
    }

    return new PreparedAction('insert', null, username, body, null, null, opaque);
  };

  comment.reply = comment.comment;

  comment.update = function(username, body, opaque) {
    if (_isNullOrUndefined(username) || username === '') {
      throw new Error('username must be specified and non-empty');
    }
    if (_isNullOrUndefined(body)) {
      throw new Error('username must be specified');
    }
    if (_isNullOrUndefined(opaque)) {
      opaque = null;
    }

    return new PreparedAction('update', null, username, body, null, null, opaque);
  };

  comment.delete = function() {
    return new PreparedAction('delete');
  };

  comment.findOne = function() {
    return new PreparedAction(FIND_PROTO);
  };

  comment.findAll = function() {
    return new PreparedAction(FIND_ALL_PROTO);
  };

  var PreparedAction = function(action, postId, username, body, assoc, parentId, opaque, isRecursive) {
    this.action = action || null;
    this.postId = postId || null;
    this.username = username || null;
    this.body = body || null;
    this.assoc = assoc || null;
    this.parentId = parentId || null;
    this.opaque = opaque || null;
    this.isRecursive = isRecursive || null;
  };

  PreparedAction.prototype.by = function(username) {
    this.username = username;
    if (this.action === FIND_ALL_PROTO) {
      this.action = 'findByUsername';
    } else if (this.action === FIND_PROTO) {
      throw new Error('use findAll() instead');
    }
    return this;
  };

  PreparedAction.prototype.of = function(postId) {
    this.postId = postId;
    if (this.action === FIND_PROTO) {
      this.action = 'findById';
    } else if (this.action === FIND_ALL_PROTO) {
      throw new Error('use findOne() instead');
    }
    return this;
  };

  PreparedAction.prototype.on = function(assoc) {
    this.assoc = assoc;
    if (this.action === FIND_ALL_PROTO) {
      this.action = 'findRootByAssoc';
    } else if (this.action === FIND_PROTO) {
      throw new Error('use findAll() instead');
    }
    return this;
  };

  PreparedAction.prototype.to = function(parentId) {
    this.parentId = parentId;
    return this;
  };

  PreparedAction.prototype.full = function() {
    this.isRecursive = true;
    return this;
  };

  PreparedAction.prototype.fire = function(cb) {
    var xhr = new XMLHttpRequest();
    var self = this;

    if (_isNullOrUndefined(this.action)) {
      throw new Error('action type is required');
    }

    var requestMethod = 'GET';
    if (['insert', 'update', 'delete'].indexOf(this.action.toLowerCase()) >= 0) {
      requestMethod = 'POST';
    }

    var queryArr = [];
    Object.getOwnPropertyNames(this).forEach(function(key) {
      if (_isDefined(self[key])) {
        queryArr.push(escape(key) + '=' + escape(self[key]));
      }
    });
    var queryString = queryArr.join('&');

    if (requestMethod === 'POST') {
      xhr.open(requestMethod, path, true);
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    } else {
      xhr.open(requestMethod, path + '?' + queryString, true);
    }

    if (typeof cb === 'function') {
      xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (Math.floor(+xhr.state / 100) === 2) {
            cb(null, JSON.parse(xhr.responseText));
          } else {
            cb('error', xhr.responseText);
          }
        }
      }
      if (requestMethod === 'POST') {
        xhr.send(queryString);
      } else {
        xhr.send(null);
      }
      // handle callback;
    } else {
      if (!Promise) {
        throw new Error('Promise required to present in scope, if no callback supplied')
      }
      return new Promise(function(resolve, reject) {
        xhr.onreadystatechange = function() {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (Math.floor(+xhr.status / 100) === 2) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(xhr.responseText);
            }
          }
        }
        if (requestMethod === 'POST') {
          xhr.send(queryString);
        } else {
          xhr.send(null);
        }
      });
    }
  };

  return comment;
};

if (typeof module === 'object') { // for Node use (e.g. React)
  module.exports = commentFactory;
}