import { json_to_gql, pretty_gql } from "../site/js/gql.mjs";

function a() {
    console.log(json_to_gql({
        queryInfoObject: {
            "@options": {
                filter: { 
                    and: [
                    {people: {
                        in: ["\"foo\"", "\"bar\""]
                    }},
                    {people: {
                        in: ["\"bar\"", "\"baz\""]
                    }}
                    ]
                },
                order: [{asc: "title"}, {desc: "year"} ],
                limit: 5,
                offset: 5
            },
            title: null,
            authors: {
                fullname: null,
                "@alias": "people"
            }
        }
    }));
}

function b() {
    console.log(json_to_gql({queryInfoObject: {}}));
}

function e() {
    console.log(json_to_gql({
        queryInfoObject: {
            sdgs: {
                "@required": true
            },
            title: null,
            year: null,
            authors: {
                fullname: null,
                "@alias": "persons"
            }
        }
    }));
}


function c() {
    console.log(json_to_gql({
        "queryInfoObject": {
            "sdgs": {
                "@required": true,
                "id": null
            },
            "title": null,
            "year": null,
            "authors": {
                "fullname": null,
                "@alias": "persons"
            }
        }
    }));
}



function d() {
    return json_to_gql({
        "objects": {
            "@alias": "queryInfoObject",
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
    });
}

console.log(d());
console.log(pretty_gql(d()));