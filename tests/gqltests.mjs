import { json_to_gql } from "../site/js/gql.mjs";

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
            people: { 
                name: null, 
                "@required": 1
            },
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

function c() {
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

c();