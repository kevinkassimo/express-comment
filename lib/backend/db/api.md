# `express-comment` DB Driver API

The following API must be complied to correctly inject database operations to backend of `express-comment`:  

```javascript
/*
 * Configure settings of DB connection
 * @param {Object} opts
 */
db.configure(opts);

/*
 * Close the db connection
 * @returns {Promise}
 */
db.close();

/*
 * Insert a new comment into database
 * @param {string} username
 * @param {string} body
 * @param {string} assoc: associated article identifier, should be string
 * @param {string|null} parentId: id of parent comment which this comment is replying to. null if root comment (no parent)
 * @param {string|null} opaque: extra customizable storage data, preferring JSON format
 * @returns {Promise} with param insertedId: id of inserted comment (should always convert to string)
 */
db.insert(username, body, assoc, parentId, opaque);

/*
 * Update an existing comment by postId. null if no change needed for fields
 * @param {string} postId
 * @param {string|null} username
 * @param {string|null} body
 * @param {string|null} opaque
 * @returns {Promise}
 */
db.update(postId, username, body, opaque);

/*
 * Delete comments by given fields. Though all optional, must have one non-null to make it effective
 * @param {string|null} postId
 * @param {string|null} username
 * @param {string|null} assoc
 * @param {string|null} parentId
 * @returns {Promise}
 */
db.delete(postId, username, assoc, parentId);

/*
 * Find by postId, default non-recursive (entry.reply not populated)
 * @param {string} postId
 * @param {boolean} [isRecursive]
 * @returns {Promise} with param entry (type Object|null): found entry. Would have entry.reply populated by child comments if isRecursive = true
 */
db.findById(postId, isRecursive = false);

/*
 * Find by parentId, default non-recursive (entries.$.reply not populated)
 * @param {string} parentId
 * @param {boolean} [isRecursive]
 * @returns {Promise} with param entries (type Object[]): found entries. Would have entries.$.reply populated by child comments if isRecursive = true
 */
db.findByParentId(parentId, isRecursive = false);

/*
 * Find by parentId, must be flat and non-recursive
 * @param {string} username
 * @returns {Promise} with param entries (type Object[]): found flat entries
 */
db.findByUsername(username);

/*
 * Find root comments associated by assoc, default non-recursive (entries.$.reply not populated)
 * @param {string} assoc: associated article identifier, should be string
 * @param {boolean} [isRecursive]
 * @returns {Promise} with param entries (type Object[]): found entries. Would have entries.$.reply populated by child comments if isRecursive = true
 */
db.findRootByAssoc(assoc, isRecursive = false);
```