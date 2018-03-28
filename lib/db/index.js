const {
  isDefined,
  createError,
  createDebug,
} = require('../utils');
const _debug = createDebug('express-comment:db', 'db');
const _error = createError('db');

function _configureDriver(_driver, settings) {
  if (settings) {
    _driver.configure(settings);
  }
  return _driver;
}

const drivers = {
  mongo: (settings) => _configureDriver(require('./mongo'), settings),
  sql: (settings) => _configureDriver(require('./sql'), settings),
};

module.exports = {
  drivers,
  mongo: require('./mongo'),
  sql: require('./sql'),
};