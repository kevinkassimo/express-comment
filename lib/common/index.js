const debugFactory = require('debug');

function createError(prefix) {
  return function(action, msg) {
    throw new Error(`backend#${action}: ${msg}`);
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
function isNullOrUndefined(v) {
  return v === null || v === undefined;
}
function isDefined(v) {
  return v !== null && v !== undefined;
}

module.exports = {
  createError,
  createDebug,

  isObject,
  isNullOrUndefined,
  isDefined,
};