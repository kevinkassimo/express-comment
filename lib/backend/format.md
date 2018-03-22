# Query Format

## `POST` actions
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
username? = username
body? = any
opaque? = opaque data || JSONString

# delete
action = delete
postId? = id
username? = username
assoc? = assoc_id
parentId? = parent_id
```

## `GET` actions  
```
# findById
action = findById
postId = id
isRecursive? = true|false

# findByUsername
action = findByUsername
username = username

# findRootByAssoc
action = findRootByAssoc
assoc = assoc_id
isRecursive? = true|false
```