import { json_to_gql, pretty_gql } from "./gql.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";

const method = "POST"; // all requests are POST requests
const headers = {
    'Content-Type': 'application/graphql'
};
const cache = "no-store";

const offsets = {
    people: 0,
    publications: 0,
    projects: 0,
    modules: 0
};

const stats = {
    main: {},
    filter: {}
};

const Message = {
    message: ""
};

const Model = {
    publications: [],
    projects: [],
    modules: [],
    people: [],
};

const RequestController = new AbortController();

function initBaseUri(){
    const buri = Config.get("baseuri");
    if (buri && buri.length) {
        Logger.debug("got baseuri");
        return buri;
    }

    Logger.debug("prepare baseuri");

    const proto = Config.get("proto") || "https://",
          host  = Config.get("host") || "",
          path  = Config.get("path") || "";


    const baseuri = `${host.length ? proto : ""}${host}${(host.length && host.at(-1) !== "/") ? "/" : ""}${path}`

    Logger.debug("set baseuri to " + baseuri);

    Config.set("baseuri", baseuri);

    return baseuri;
}

export function feed(type) {
    if (Object.hasOwn(Model, type)) {
        return Model[type];
    }
    
    return [];
}

export async function loadData(type, queryObj) {
    Model.message = "";
    Model[type] = [];

    if (Config.get("static")) {
        Logger.debug("load from mock API");

        try {
            Model[type] = await loadStatic();
        }
        catch (err) {
            Model[type] = [];
            Message.message = err.message;
            Logger.info(`error: ${Message.message}`);
        }
    }
    else {
        Logger.debug("load from real API");

        const queryTerms = collectQueryTerms(queryObj);
        const objects = gqlSearchQuery(type, queryTerms);

        try {
            Model[type] = await executeQuery({objects});
        }
        catch (err) {
            Model[type] = [];
            Message.message = err.message;
            Logger.info(`error: ${Message.message}`);
        }
    }
}

async function loadStatic() {
    const url = initBaseUri();

    Logger.debug(`fetch update from static ${url}`);

    const {signal} = RequestController;
 
    const response = await fetch(`${url}`, {signal, cache});
    const result = await response.json();

    return processModel(result);
}

async function executeQuery(query) {  
    let body  = json_to_gql(query);
   
    if (Config.get("debug")) {
        body = pretty_gql(body);
        Logger.debug(body);
    }

    if (!body.length) {
        Logger.debug("no query to fetch");
        return [];
    }

    const url = initBaseUri();
    const {signal} = RequestController;

    Logger.debug(`fetch update from dynamic ${url}`);

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });

    const result = await response.json();

    if (Object.hasOwn(result, "data")) {
        return processModel(result);
    }
    else {
        Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    }

    return [];
}

function processModel(feed) {
    Logger.debug(`fetched ${feed.data.objects.length} objects`);

    const upfeed = feed.data.objects.map((record) => {
        record.sdg = record.sdg.map(sdg => sdg.id.split("_").pop()).map((sdg) => `${Number(sdg)< 10 ? "0": ""}${sdg}`);
        record.dept = record.dept.map(d => d.id.split("_").pop());
        record.persons = record.persons.reduce((akk, val) => {
            val.department = val.department.id.split("_").pop();
            akk[val.fullname] = val; 
            return akk;
        }, {});
        return record;
    });

    return upfeed;
}

function gqlBaseInfoObjectQuery(type) {
    const queryInfoObject  = {
        "@alias": "queryInfoObject",
        "@options": {
            order: [{desc: "year"}, {asc: "title"}],
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
        authors: {
            fullname: null,
            person: {
                "fullname": null, 
                "initials": null, 
                "title": null, 
                "mail": null, 
                "ipphone": null, 
                "gender": null, 
                "department": {
                    id: null
                },
                "@options": {
                    filter: {}
                }
            }
        }
    };

    return queryInfoObject ;
}

export function gqlRootQuery(type) {
    const queryInfoObject = gqlBaseInfoObjectQuery(type);

    queryInfoObject.authors.person["@options"].filter.has = "department";

    return queryInfoObject;
}

export function gqlSearchQuery(type, queryTerms) {
    const queryInfoObject = gqlBaseInfoObjectQuery(type);

    if (queryTerms.persons.length) {
        queryInfoObject.authors.person["@options"].filter.initials = {
            in: queryTerms.persons
        };
        queryInfoObject.authors.person["@required"] = true;
    }
    else {
        queryInfoObject.authors.person["@options"].filter.has = "department";
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
            and: termFilter
        };
    }

    return queryInfoObject;
}
