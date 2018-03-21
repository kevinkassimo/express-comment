/*
Spec:

In mongo,

action = insert
username = username
body = any
assoc? = assoc_id // e.g. passage id
parent? = parent_id
extra? = JSONString

action = update
postid = id
username? = username
body? = any
assoc? = assoc_id // e.g. passage id
parent? = parent_id
extra? = JSONString

action = delete
postid? = id
username? = username
assoc? = assoc_id
parent? = parent_id

action = findbypost
postid = id
recursive? = true|false

action = findbyusername
username = username
recursive? = true|false

action = findbyassoc
assoc = assoc_id
recursive? = true|false

{
    username: "username",
    body: "body",
    assoc: "",
    parent: "",
}

/some/path?action=insert&body=
*/


function pathDispatcher(req, res) {
}

function commentHandler(req, res) {
    
}