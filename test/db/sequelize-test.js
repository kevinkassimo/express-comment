const assert = require('assert');
const sql = require('../../lib/backend/db/sql');

describe('backend/db/sql', function() {
  let cli;
  let db;
  let coll;
  this.timeout(100000);

  before(function(done) {
    console.log('Initialize SQL...');
    // use our dev db instead of production
    sql.configure({
      database: 'ec',
      username: 'root',
      password: '',
    
      host: 'localhost',
      dialect: 'mysql',
    
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
    })
    done();
  });

  it('should insert entry', function(done) {
    let insertedId;
    sql.insert('user0', 'body0', 'assoc', null, '{}')
      .then(function(id) {
        insertedId = id;
        return sql.findById(id);
      })
      .then(function(result) {
        assert.equal(result[0].username, 'user0');
        assert.equal(result[0].body, 'body0');
        assert.equal(result[0].assoc, 'assoc');
        assert.equal(result[0].parentId, null);
        assert.equal(result[0].opaque, '{}');
        assert(!!result[0].createdAt);
        assert(!!result[0].modifiedAt);
      })
      .then(function() {
        return sql.delete(insertedId);
      })
      .then(function() {
        done();
      });
  });

  it('should update entry', function(done) {
    let insertedId;
    sql.insert('user0', 'body0', 'assoc', null, '{}')
      .then(function(id) {
        insertedId = id;
        return sql.update(insertedId, 'B', 'C');
      })
      .then(function() {
        return sql.findById(insertedId);
      })
      .then(function(result) {
        assert.equal(result[0].username, 'user0');
        assert.equal(result[0].body, 'B');
        assert.equal(result[0].assoc, 'assoc');
        assert.equal(result[0].parentId, null);
        assert.equal(result[0].opaque, 'C');
        assert(!!result[0].createdAt);
        assert(!!result[0].modifiedAt);
      })
      .then(function() {
        return sql.delete(insertedId);
      })
      .then(function() {
        done();
      });
  });

  it('should insert nested entry and delete correctly', function(done) {
    let childId, parentId;
    let sameAssocId;
    let diffAssocId;
    sql.insert('user0', 'A', 'assoc', null, '{}')
      .then(function(id) {
        parentId = id;
        return sql.insert('reply00', 'B', 'assoc', parentId, '{}');
      })
      .then(function(id) {
        childId = id;
        return sql.findById(parentId, true); // recursive
      })
      .then(function(result) {
        assert.equal(result[0].username, 'user0');
        assert.equal(result[0].body, 'A');
        assert.equal(result[0].assoc, 'assoc');
        assert.equal(result[0].parentId, null);
        assert.equal(result[0].opaque, '{}');
        assert(!!result[0].createdAt);
        assert(!!result[0].modifiedAt);

        assert.equal(result[0].reply[0].username, 'reply00');
        assert.equal(result[0].reply[0]._id, childId);
        return null;
      })
      .then(function() {
        return sql.insert('reply01', 'C', null, parentId, '{}');
      })
      .then(function() {
        return sql.insert('user1', 'D', 'assoc', null, '{}');
      })
      .then(function(id) {
        sameAssocId = id;
        return sql.insert('user0', 'E', 'beta', null, '{}');
      })
      .then(function(id) {
        diffAssocId = id;
        return sql.findRootByAssoc('assoc', true);
      })
      .then(function(results) {
        const ids = results.map(e => e._id);
        assert(ids.includes(parentId));
        assert(ids.includes(sameAssocId));
        assert(!ids.includes(diffAssocId));
        const replyIds = results.filter(e => e._id === parentId)[0].reply.map(e => e._id);
        assert(replyIds.includes(childId));

        return sql.delete(null, null, 'assoc', null);
      })
      .then(function() {
        return sql.findRootByAssoc('assoc');
      })
      .then(function(result) {
        assert.equal(result.length, 0);
        return sql.findRootByAssoc('beta');
      })
      .then(function(result) {
        assert.equal(result.length, 1);
        return sql.delete(null, null, 'beta', null);
      })
      .then(function() {
        done();
      })
  });

  after(function(done) {
    console.log('Cleaning up...');
    sql.close().then(() => done());
  });
});