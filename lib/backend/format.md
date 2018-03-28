# Raw Query Format
These are query formats for reference if you decide not to use the frontend code provided in `/lib/frontend`, and want to create your own requests.  

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