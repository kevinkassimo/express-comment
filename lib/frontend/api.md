# `express-comment` Frontend API
This is the front end API of `express-comment`, which are wrappers for `XMLHttpRequest` that aims for high readability and ease of use.

## Preparation
`express-comment` support both Node/Browser. You need to supply the `window` object and the mounted path of backend middleware to create the instance of use for API.  
```javascript
// for ReactJS or similar frameworks on Node
import ec from 'express-comment';
const comment = ec.frontend(window, '/middleware/path');

// for <script />
const comment = commentFactory(window, '/middleware/path');
```

## General Syntax
The API consists of a list of prepositions and action words that, when chained together, creates a readable command and initiates request when `.fire()` is called.  

__Prepositions__ are used to create *filter* of actions, or provide some necessary parts and information for a certain action to work correctly. The following are provided prepositions:
```javascript
/*
 * Targeting specific post with postId
 */
[ACTION].of(postId)

/*
 * targeting specific post as the new post's parent
 * (the post that is replied to)
 */
[ACTION].to(parentId)

/*
 * specify the user who is associated with command
 */
[ACTION].by(username)

/*
 * specify user-defined article unique identifier (assoc) 
 * that the command is operating on
 */
[ACTION].on(assoc)

/*
 * specify that the result in the returned array 
 * should have length of maximum maxNum
 */
[ACTION].only(maxNum)
```

__Actions__ specify what we want to *achieve*, for example, inserting/updating/deleting/updating posts. The following are provided actions:
```javascript
/*
 * Create a new comment on a specific article, with body as 'body'
 * and opaque data (user defined string data that is opaque 
 * to the express-comment system, but have certain importance 
 * that is has to be stored with the entry) as 'opaque'
 * 
 * The ID of added comment will be returned as result in callback/Promise
 */
[API].comment(body[, opaque])

/*
 * Similar to .comment, but for replying to an existing post
 * 
 * The ID of added comment will be returned as result in callback/Promise
 */
[API].reply(body[, opaque])

/*
 * Update a certain comment/post
 */
[API].update(body[, opaque])

/*
 * Delete posts with matching categories. NOTICE that 
 * deleting a post would AUTOMATICALLY delete all its replies!
 */
[API].delete()

/*
 * Get the count of posts that matches certain filter
 * 
 * Count will be returned as result in callback/Promise
 */
[API].count()

/*
 * Find a SINGLE post that matches a filter. 
 * 
 * 'isRecursive' (boolean) means should we recursively fetch the replies 
 * on this found post or not (if true, then yes, recurse to the very end)
 * 
 * 'maxRecurseLevel' (integer) means the maximum level that we would attempt
 * to recurse. For example, if a chain of replies has 3 levels, specifying
 * 'maxRecurseLevel = 2' would result in the reply of the 3rd level not found
 * when searching root level comments (those which does NOT have a parent)
 * 
 * When 'isRecursive' or 'maxRecurseLevel' is specified, the replies found
 * would be populated in 'entry.reply', which is an array (could be empty).
 * 
 * NOTICE that due to performance and system usability considerations, sometimes
 * NEITHER 'isRecursive' NOR 'maxRecurseLevel' should be set. For example, when
 * searching by 'username', it is likely that you will found a user replying to
 * himself/herself. In this condition, recursive search would be unreasonable
 * due to repetitive results appearing in the reply chain. This is exceptionally
 * bad when the comment tree is deep. Therefore, you will get a frontend error
 * that forbids you to set the recursive options when this happens.
 * (ACTUALLY, try only recursively search when a single postId is given. If you
 * need to fetch all comments recursively on an article, use .findRoot/.findRootAll
 * as specified below)
 * 
 * The comment object will be returned as result in callback/Promise
 */
[API].find(isRecursive|maxRecurseLevel)

/*
 * Similar to above, but find ALL matching results instead (returning an array)
 * 
 * Array of comment objects will be returned as result in callback/Promise
 */
[API].findAll(isRecursive|maxRecurseLevel)

/*
 * Find a SINGLE root comment on an article (comments without parent)
 * 
 * The comment object will be returned as result in callback/Promise
 */
[API].findRoot(isRecursive|maxRecurseLevel)

/*
 * Find ALL root comments on an article (comments without parent)
 * NOTICE that this, with recursive info set is VERY useful if you want to
 * load every comment under an article
 * 
 * Array of comment objects will be returned as result in callback/Promise
 */
[API].findRootAll(isRecursive|maxRecurseLevel)
```

When Actions and Prepositions combine, and eventually called with `.fire()`, you will be successfully conducting an API call.

`.fire()` takes both `callback` and `Promise` styled async handling. When a `cb` is provided as an argument, you trigger the callback mode. Otherwise, `.fire()` returns a `Promise`. This is very similar to that of Node Mongo Native Driver.
```javascript
// callback style
[API].[ACTION].[[PROPOSITIONS]].fire((err, result) => {
  if (err) {
    // error
  }
  // ...
})

// callback style
[API].[ACTION].[[PROPOSITIONS]].fire()
  .then((result) => { /* ... */ })
  .catch((err) => { /* ... */ })
```

The following is ALL *valid combinations*. Don't try to remember them (use them as reference instead) when using, since usually the intuition will work when you construct the 
```javascript
comment.comment(body[, opaque]).by(username).on(assoc).fire();

comment.reply(body[, opaque]).by(username).to(parentId).fire();

comment.update(body[, opaque]).of(postId).fire();

comment.delete().by(username).fire();
comment.delete().on(assoc).fire();
comment.delete().by(username).on(assoc).fire();
comment.delete().of(postId).fire();

comment.find().of(postId).fire();
comment.find(true|integer).of(postId).fire();
comment.findAll().of(postId).fire();
comment.findAll(true|integer).of(postId).fire();

// .on/.by search disallow recursive attempts
comment.find().on(assoc).fire();
comment.find().by(username).fire();
comment.find().by(username).on(assoc).fire();
comment.findAll().on(assoc).fire();
comment.findAll().on(assoc).only(limit).fire();
comment.findAll().by(username).fire();
comment.findAll().by(username).only(limit).fire();
comment.findAll().by(username).on(assoc).fire();
comment.findAll().by(username).on(assoc).only(limit).fire();

comment.findRoot().on(assoc).fire();
comment.findRoot(true|integer).on(assoc).fire();
comment.findRootAll().on(assoc).fire();
comment.findRootAll().on(assoc).only(limit).fire();
comment.findRootAll(true|integer).on(assoc).fire();
comment.findRootAll(true|integer).on(assoc).only(limit).fire();

comment.count().of(postId).fire();
comment.count().by(username).fire();
comment.count().on(assoc).fire();
comment.count().by(username).on(assoc).fire();
```

## Example
```javascript
// for ReactJS or similar frameworks
import ec from 'express-comment';
const comment = ec.frontend(window, '/middleware/path');

// for <script />
const comment = commentFactory(window, '/middleware/path');


let myCommentID;
let myReplyID;
// Add a new comment
comment
  .comment('That\'s very sad...', '{ likes: 5 }')
  .by('Kevin')
  .on('Farewell Node.js (TJ)')
  .fire((err, id) => { // callback styled
    if (err) {
      console.log('ERROR!');
      return;
    }
    myCommentID = id;
  });

// ... somewhere in the code structure, when we know we have myCommentID set
comment
  .reply('DO YOU WANNA HAVE A BAD TOM?')
  .by('Saness')
  .to(myCommentID)
  .fire()
  .then((id) => myReplyID = id);

// ... somewhere in the code structure, when we know we have myCommentID set
comment
  .delete()
  .of(myCommentID)
  .fire()
  .then(() => console.log('Here goes nothing...'));

// Get all comments, recursively, on an article
comment
  .findRootAll(true)
  .on('Farewell Node.js (TJ)')
  .fire()
  .then((arr) => setState({ comments: arr }));
```

## Raw Query Format
If you just don't like this API design, you can directly make HTTP requests using `XMLHttpRequest`s. These are query formats for reference if you want to create your own requests.  

### `POST` actions
```
# insert
action = insert
username = username
body = any
assoc? = assoc_id
parentId? = parent_id
opaque? = opaque data || JSONString

# update
action = update
postId = id
body? = any
opaque? = opaque data || JSONString

# delete
action = delete
postId? = id
username? = username
assoc? = assoc_id
parentId? = parent_id
```

### `GET` actions  
```
# count
action = count
postId? = id
username? = username
assoc? = assoc_id
parentId? = parent_id

# findById
action = findById
postId = id
isRecursive? = true|false

# findByUsernameAndAssoc
action = findByUsernameAndAssoc
username? = username
assoc? = assoc_id
limit? = limit_count

# findRootByAssoc
action = findRootByAssoc
assoc = assoc_id
isRecursive? = true|false
limit? = limit_count
```