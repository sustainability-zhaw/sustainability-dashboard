# JSON Notation for Graphql

Because compiling GraphQL in code is hard, a JSON inspired notation is preferred. 

This is also important to avoid code injection attacks. 

GraphQL has three different types of core information: 

1. Selectors
2. Options 
3. Directives

In addition to these core types, `alias`-selectors  are possible. This allows the frontend to override a selector to have a different name in the result. Alias Selectors are just for output purposes and cannot get queried in dgraph. Using `alias`-selectors is useful for the case that one needs to filter on some attribute, but the output should include the content of that attribute. 

Dgraph introduces custom Options and Directives.

On aspect of programmatically controlling graphQL queries, are constraints on filtered fields. For programming it should be possible to mark a field as `required` for a query. This allows a data-driven approach to query modelling. 

## Selectors

A selector is a regular string as a JSON key. This key is translated to an attribute name. If a selector is empty, it will show just the name. In case a selector refers to a complex object, it must also state, which attributes from that object are selected. 

Selectors are directly provided as the names that appear in the query result. 

## Options

Options are presented as parameters to selectors. We use four types of options: 

- Filters
- Sorting 
- Pagination start
- Pagination limit

The selector object needs to include an `@options`-attribute that contains an object with the possible types. 

## Directives

GraphQL directives are relevant for contraining the output of a query. The `@cascade`-directive will remove all entries that contain empty fields (or specific fields). 

Dgraph supports a caching directive. To trigger it, we need to use the `caching` directive, which takes the TTL of a cache object in seconds. 


All Directives are collected under the `@directives`-attribute. 

Normally, we will use the `@required` as an attribute of a sub-selector, to initiate the `@cascade`-directive on the parent object. This is really handy, because this allows to manage the `@cascade`-directive at the selector level, directly, rather than managing information at two locations. 

## Aliases

Aliases are an important concept for graphQL. In order to define an alias, one has to place the field alias in the JSON notation. The assigned object MUST include an `@alias`-key using the original name of the attribute. 

## Examples 

### Example - minimal Query 

Input: 

```json
```

Result: 

```graphql
{ 
    queryInfoObject
}
```

### Example - Auto Cascading and Aliases

```json
{
    "queryInfoObject": {
        "sdgs": {
            "@required": true
        },
        "title": null,
        "year": null,
        "authors": {
            "fullname": null,
            "@alias": "persons"
        }
    }
}
```

Generates the query: 

```graphql
{ 
    queryInfoObject @cascade( fields: [ "sdgs" ] ) {
        title 
        year 
        sdgs 
        authors: persons {
           fullname 
        } 
    } 
}
```

### Example - Filters, Sorting and Pagination

Input: 

```json
{
    "queryInfoObject": {
        "@options": {
            "filter": { 
                "or": [
                {
                    "people": {
                        "in": ["\"foo\"", "\"bar\""]
                    }
                },
                {
                    "people": {
                        "in": ["\"bar\"", "\"baz\""]
                    }
                }
                ]
            },
            "order": [ {"asc": "title"}, {"desc": "year"} ],
            "limit": 5,
            "offset": 5
        },
        "title": null,
        "authors": {
            "fullname": null,
            "@alias": "people"
        }
    }
}
```

Result: 

```graphql
{ 
    queryInfoObject ( 
        filter: { 
            or: [
                { people: { in: [ "foo", "bar" ] } } , 
                { people: { in: [ "bar", "baz" ] } }  
            ] 
        } , 
        order: { asc: title, then: { desc: year } }, 
        first: 5, 
        offset: 5 
    ) {
        title 
        authors: people { 
            fullname 
        } 
    } 
} 
```

### Example Subqueries

Input: 

```json
{
    "queryInfoObject": {
        "sdgs": {
            "@required": true,
            "id": null,
            "@options": {
                "filter": {
                    "id": {
                        "in": ["sdg_4", "sdg_7"]
                    }
                }
            }
        },
        "title": null,
        "year": null,
        "persons": {
            "fullname": null,
            "@required": true,
            "@options": {
                "filter": {
                    "has": "department"
                }
            }
        }
    }
}
```

Result: 

```graphql
{ 
    queryInfoObject @cascade( fields: [ "sdgs", "persons" ] ) { 
        title 
        year 
        sdgs ( 
            filter: { 
                id: { 
                    in: [ sdg_4, sdg_7 ] 
                } 
            }
        ) { 
            id 
        } 
        persons ( 
            filter: { 
                has: [ department ] 
            }  
        ) { 
            fullname 
        } 
    } 
}
```
