const assert = require('assert');
const MongoClient = require('mongodb').MongoClient;
const mongo = require('../../lib/backend/db/mongo');

describe('backend/db/mongo', function() {
  let cli;
  let db;
  let coll;
  this.timeout(100000);

  before(function(done) {
    console.log('Initialize Mongo Client...');
    // use our dev db instead of production
    mongo.configure({
      dbName: 'express-comment-db-test',
    })

    MongoClient.connect('mongodb://localhost:27017')
      .then(function(client) {
        cli = client;
        db = client.db('express-comment-db-test');
        coll = db.collection('comments');
        done();
      });
  });

  it('should insert entry', function(done) {
    let insertedId;
    mongo.insert('user0', 'body0', 'assoc', null, '{}')
      .then(function(id) {
        insertedId = id;
        return mongo.findById(id);
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
        return mongo.delete(insertedId);
      })
      .then(function() {
        done();
      });
  });

  it('should update entry', function(done) {
    let insertedId;
    mongo.insert('user0', 'body0', 'assoc', null, '{}')
      .then(function(id) {
        insertedId = id;
        return mongo.update(insertedId, 'B', 'C');
      })
      .then(function() {
        return mongo.findById(insertedId);
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
        return mongo.delete(insertedId);
      })
      .then(function() {
        done();
      });
  });

  it('should insert nested entry and delete correctly', function(done) {
    let childId, parentId;
    let sameAssocId;
    let diffAssocId;
    mongo.insert('user0', 'A', 'assoc', null, '{}')
      .then(function(id) {
        parentId = id;
        return mongo.insert('reply00', 'B', 'assoc', parentId, '{}');
      })
      .then(function(id) {
        childId = id;
        return mongo.findById(parentId, true); // recursive
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
        return mongo.insert('reply01', 'C', null, parentId, '{}');
      })
      .then(function() {
        return mongo.insert('user1', 'D', 'assoc', null, '{}');
      })
      .then(function(id) {
        sameAssocId = id;
        return mongo.insert('user0', 'E', 'assoc1', null, '{}');
      })
      .then(function(id) {
        diffAssocId = id;
        return mongo.findRootByAssoc('assoc', true);
      })
      .then(function(results) {
        const ids = results.map(e => e._id);
        assert(ids.includes(parentId));
        assert(ids.includes(sameAssocId));
        assert(!ids.includes(diffAssocId));
        const replyIds = results.filter(e => e._id === parentId)[0].reply.map(e => e._id);
        assert(replyIds.includes(childId));

        return mongo.delete(null, null, 'assoc', null);
      })
      .then(function() {
        return mongo.findRootByAssoc('assoc');
      })
      .then(function(result) {
        assert.equal(result.length, 0);
        return mongo.findRootByAssoc('assoc1');
      })
      .then(function(result) {
        assert.equal(result.length, 1);
        return mongo.delete(null, null, 'assoc1', null);
      })
      .then(function() {
        done();
      })
  });

  after(function(done) {
    console.log('Cleaning up...')
    db.dropDatabase()
      .then(function() {
        return Promise.all([cli.close(), mongo.close()]);
      })
      .then(function() {
        return done();
      });
  });
});