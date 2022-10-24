import { json_to_gql, pretty_gql } from "./gql.mjs";

const method = "POST"; // all requests are POST requests
const headers = {
    'Content-Type': 'application/graphql'
};

const offsets = {
    people: 0,
    publications: 0,
    projects: 0,
    modules: 0
};

const stats = {};

const Message = {
    message: ""
};

const Model = {
    publications: [],
    projects: [],
    modules: [],
    people: [],

};

const Config = {
    baseuri: "/api/",
    static: false,
    debug: false
};

const RequestController = new AbortController();

export function init(cfg) {
    console.log("init data Model");

    Config.baseuri = `${cfg.host.length ? "https://" : ""}${cfg.host.length ? (cfg.host + "/"): ""}${cfg.path}`;

    Config.static  = Object.hasOwn(cfg, "static")  ? cfg.static  : Config.static;
    Config.debug   = Object.hasOwn(cfg, "debug")   ? cfg.debug   : Config.debug;

    console.log(JSON.stringify(Config));
}

export function feed(type) {
    if (Object.hasOwn(Model, type)) {
        console.log(`have model ${type}`);
        console.log(`model has data ${Model[type].length}`);

        return Model[type];
    }
    
    return [];
}

export async function loadData(type, queryObj) {
    Model.message = "";
    Model[type] = [];

    if (Config.static) {
        console.log("load from mock API");

        try {
            Model[type] = await loadStatic();
        }
        catch (err) {
            Model[type] = [];
            Message.message = err.message;
            console.log(`error: ${Message.message}`);
        }
    }
    else {
        console.log("load from real API");

        const queryTerms = collectQueryTerms(queryObj);
        const objects = gqlSearchQuery(type, queryTerms);

        try {
            Model[type] = await executeQuery({objects}, RequestController, Config.debug);
        }
        catch (err) {
            Model[type] = [];
            Message.message = err.message;
            console.log(`error: ${Message.message}`);
        }
    }
}

async function loadStatic() {
    const url = Config.baseuri;

    console.log(`fetch update from ${url}`);

    const {signal} = RequestController;
 
    const response = await fetch(`${url}`, {signal});
    const result = await response.json();

    return processModel(result);
}

async function executeQuery(query, { signal }, pretty) {  
    let body  = json_to_gql(query);
   
    if (pretty) {
        body = pretty_gql(body);
        console.log(body);
    }

    const response = await fetch(Config.baseuri, {
        signal,
        method,
        headers,
        body
    });

    const result = await response.json();

    if (Object.hasOwn(result, "data")) {
        return processModel(result);
    }
    else {
        console.log(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    }

    return [];
    // cancel _all_ previous requests
}

function processModel(feed) {
    console.log(`fetched ${feed.data.objects.length} objects`)

    const upfeed = feed.data.objects.map((record) => {
        record.sdg = record.sdg.map(sdg => sdg.id.split("_").pop()).map((sdg) => `${Number(sdg)< 10 ? "0": ""}${sdg}`);
        record.dept = record.dept.map(d => d.id.split("_").pop());
        return record;
    });

    return upfeed;
}

function gqlBaseInfoObjectQuery(type) {
    const queryInfoObject  = {
        "@alias": "queryInfoObject",
        "@options": {
            order: [{asc: "year"}, {asc: "title"}],
            limit: 20
        },
        title: null,
        abstract: null,
        year: null, 
        language: null,
        link: null,
        extras: null,
        authors: {
            "@alias": "persons",
            fullname: null
        },
        class: {
            id: null,
            name: null
        },
        subtype: {
            name: null
        },
        keywords: {
            name: null
        },
        category: {
            "@options": {
                filter: {
                    name: {
                        in: JSON.stringify(type)
                    }
                }
            },
            "@required": true,
            name: null
        },
        sdg: {
            id: null,
            "@alias": "sdgs"
        },
        dept: {
            id: null,
            "@alias": "departments"
        },
        persons: {
            "fullname": null, 
            "initials": null, 
            "title": null, 
            "mail": null, 
            "ipphone": null, 
            "gender": null, 
            "department": {
                id: null
            },
            "team": { 
                name: null 
            },
            "@options": {
                filter: {}
            }
        }
    };

    return queryInfoObject ;
}

export function gqlRootQuery(type) {
    const queryInfoObject = gqlBaseInfoObjectQuery(type);

    queryInfoObject.persons["@options"].filter.has = "department";

    return queryInfoObject;
}

export function gqlSearchQuery(type, queryTerms) {
    const queryInfoObject = gqlBaseInfoObjectQuery(type);

    if (queryTerms.persons.length) {
        queryInfoObject.persons["@options"].filter.initials = {
            in: queryTerms.persons
        };
        queryInfoObject.persons["@required"] = true;
    }
    else {
        queryInfoObject.persons["@options"].filter.has = "department";
    }

    if (queryTerms.sdgs.length) {
        queryInfoObject.sdgs = {
            id: null,
            "@required": true,
            "@options": {
                filter: {
                    id: {
                        in: queryTerms.sdgs
                    }
                }
            }
        };
    }

    if (queryTerms.departments.length) {
        queryInfoObject.departments = {
            id: null,
            "@required": true,
            "@options": {
                filter: {
                    id: {
                        in: queryTerms.departments
                    }
                }
            }
        };
    }

    if (queryTerms.terms.length) {
        const termFilter = [ "title", "abstract" ].map((fld) => {
            const res = {};
            res[fld] = {
                alloftext: queryTerms.terms
            };
            return res;
        });

        queryInfoObject["@options"].filter = {
            or: termFilter
        };
    }

    return queryInfoObject;
}

// helper functions for preparing the GQL queries

function prefixAndQuote(value, prefix) {
    if (prefix) {
        value = prefix + value;
    }
    else {
        value = JSON.stringify(value);
    }
    return value;
}

function collectType(qterms, type) {
    const prefix = ["department", "sdg"].includes(type) ? type + "_" : "";
    
    return qterms
        .filter(i => i.type === type)
        .map(i => i.value)
        .map((val) => prefixAndQuote(val, prefix));
}

function collectQueryTerms(query) {
    return {
        sdgs:        collectType(query, "sdg"),
        departments: collectType(query, "department"),
        persons:     collectType(query, "person"),
        terms:       collectType(query, "term"),
    };
}
