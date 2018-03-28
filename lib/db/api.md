# `express-comment` DB Driver API

## API requirement
The following API must be complied to correctly inject database operations to backend of `express-comment` (__NO EXCEPTION__):  

```javascript
/*
 * Configure settings of DB connection and operation
 * @param {Object|null} opts: db specific settings, null means no change to previous config
 * @param {Object|null} ecSettings: express-comment specific, null means no change to previous config. This is required, since some ecSettings would only we actually implemented in the Driver level
 */
db.configure(opts, ecSettings);

/*
 * Close the db connection
 * @returns {Promise}
 */
db.close();

/*
 * Insert a new comment into database
 * @param {string} username *required* *non-empty*
 * @param {string} body *required*
 * @param {string} assoc: associated article identifier, should be string
 * @param {string|null} parentId: id of parent comment which this comment is replying to. null if root comment (no parent). At least one of assoc and parentId should be defined
 * @param {string|null} opaque: extra customizable storage data, preferring JSON format
 * @returns {Promise} with param insertedId: id of inserted comment (should always convert to string)
 */
db.insert(username, body, assoc, parentId, opaque);

/*
 * Update an existing comment by postId. null if no change needed for fields
 * @param {string} postId *required*
 * @param {string|null} body
 * @param {string|null} opaque
 * @returns {Promise}
 */
db.update(postId, body, opaque);

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
 * @param {string} postId *required*
 * @param {boolean|number} [isRecursive]: true => recurse to the end; false => no recursion, single layer; number => recurse a maximum of specified layers
 * @returns {Promise} with param entry (type Object|null): found entry. Would have entry.reply populated by child comments if isRecursive = true
 */
db.findById(postId, isRecursive = false);

/*
 * Find by username and assoc, must be flat and non-recursive
 * @param {string} username
 * @param {string} assoc
 * @param {number|null} [limit]
 * @returns {Promise} with param entries (type Object[]): found flat entries
 */
db.findByUsernameAndAssoc(username = null, assoc = null, limit = null);

/*
 * Find root comments associated by assoc, default non-recursive (entries.$.reply not populated)
 * @param {string} assoc: associated article identifier, should be string *required*
 * @param {boolean|number} [isRecursive]: true => recurse to the end; false => no recursion, single layer; number => recurse a maximum of specified layers
 * @param {number|null} [limit]
 * @returns {Promise} with param entries (type Object[]): found entries. Would have entries.$.reply populated by child comments if isRecursive = true
 */
db.findRootByAssoc(assoc, isRecursive = false, limit = null);
```

## Settings Requirement
The following settings is required to be implemented. If cannot, must be explicitly specified in the README of the driver.

```javascript
const ecSettings = {
  maxReplyLevel, // maximum allowed reply level to be inserted
  maxRecurseLevel, // maximum level allowed to be performed in a recursive search
}
```

## Fields of Entry
The following fields are interface to the user. Could be implement differently internally, since it should be transparent to user.
```javascript
const entry = {
  _id, // unique id {string} UNIQUE
  username, // username {string}
  body, // body {string}
  assoc, // user defined id of associated article {string|null}
  parentId, // _id of parent comment {string|null}
  opaque, // opaque, user defined data {string}
  level, // level of comment, 0 for root level comment {integer}
  createdAt, // ISO representation of date of creation {string}
  modifiedAt, // ISO representation of date of modification {string}
}
```