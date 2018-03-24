const driverTypes = {
    MONGO: 'mongo',
};

module.exports = {
    driverTypes,
    mongo: require('./mongo'),
};