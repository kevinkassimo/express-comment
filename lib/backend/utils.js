const debugFactory = require('debug');

function createReject(prefix) {
  return function(action, msg) {
    return Promise.reject(`${prefix}#${action}: ${msg}`);
  };
}

function createError(prefix) {
  return function(action, msg) {
    throw new Error(`${prefix}#${action}: ${msg}`);
  };
}

function createDebug(debugName, prefix) {
  const _debug = debugFactory(debugName);
  return function(action, msg) {
    _debug(`${prefix}#${action}: ${msg}`);
  };
}

function isObject(o) {
  return typeof o === 'object' && o !== null;
}
function isNumber(n) {
  return typeof n === 'number';
}
function isNullOrUndefined(v) {
  return v === null || v === undefined;
}
function isDefined(v) {
  return v !== null && v !== undefined;
}

module.exports = {
  createReject,
  createError,
  createDebug,

  isObject,
  isNumber,
  isNullOrUndefined,
  isDefined,
};
