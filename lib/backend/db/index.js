const driverTypes = {
    MONGO: 'mongo',
    SQL: 'sql',
};

module.exports = {
    driverTypes,
    mongo: require('./mongo'),
    sql: require('./sql'),
};