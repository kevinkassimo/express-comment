# `express-comment` calls in broswer

### General Idea
First, create a comment module by calling `commentFactory(window, path)`, where `window` is the DOM window and `path` the path to API call (where backend is mounted on). 

Construct query with chained actions and prepositions. Actual sending action is triggered only when `.fire()` is called in the end.  

`.fire()` takes an optional callback of format `function(err, result) { ... }`, where `err` is the error when action fails and `result` the response object (parsed from JSON) from the server. If this callback is not supplied, `.fire()` returns a `Promise` instead, which will contain the `result` as in callback for `.then(function(result) { ... })`.  

### Valid actions
```javascript
.comment(body[, opaque]) // for comment 
.reply(body[, opaque]) // for reply to another comment
.delete() // delete a comment
.findOne() // find
```

```javascript
/*
 * General idea: construct query with chained action and preposition.
 * Triggers send when .fire() is eventually called.
 * .fire()
 */
/*
 * Add a comment on article identified with `assoc`
 * .fire() triggers request
 * if callback given to .fire(), returns ()
 */
comment.comment(username, body[, opaque]).on(assoc).fire([callback]);
```