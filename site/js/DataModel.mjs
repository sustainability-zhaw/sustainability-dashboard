import { json_to_gql, pretty_gql } from "./gql.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Filter from "./DqlFilter.mjs";

const method = "POST"; // all requests are POST requests
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

function initDQLUri(){
    const buri = Config.get("staturi");
    if (buri && buri.length) {
        Logger.debug("got staturi");
        return buri;
    }

    Logger.debug("prepare staturi");

    const proto = Config.get("proto") || "https://",
          host  = Config.get("host") || "",
          path  = Config.get("stats") || "";


    const baseuri = `${host.length ? proto : ""}${host}${(host.length && host.at(-1) !== "/") ? "/" : ""}${path}`

    Logger.debug("set staturi to " + baseuri);

    Config.set("staturi", baseuri);

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

    const queryTerms = queryObj;
    const objects = gqlSearchQuery(type, queryTerms);

    const dqlQuery = buildDQLQueryString(type, queryObj);

    // Logger.debug("DQL Follows");
    // Logger.debug("------------------------------");
    // Logger.debug(dqlQuery);
    // Logger.debug("------------------------------");

    try {
        Model[type] = await executeDQLQuery(dqlQuery);
        // Model[type] = await executeQuery({objects});
    }
    catch (err) {
        Model[type] = [];
        Message.message = err.message;
        Logger.info(`error: ${Message.message}`);
    }
}

async function executeDQLQuery(body) {
    const url = initDQLUri();
    const {signal} = RequestController;

    const headers = {
        'Content-Type': 'application/dql'
    };

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });

    const result = await response.json();

    if (Object.hasOwn(result, "data")) {
        // Logger.info(`response: \n ${ JSON.stringify(result, null, "  ") }`);
        return processModel(result);
    }
    else {
        Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    }

    return []
}

async function executeQuery(query) {  
    let body  = json_to_gql(query);

    const headers = {
        'Content-Type': 'application/graphql'
    };
    
   
    if (Config.get("debug")) {
        body = pretty_gql(body);
        // Logger.debug(body);
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
        Logger.info(`response: \n ${ JSON.stringify(result, null, "  ") }`);
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
        if (record.sdg && record.sdg.length) {
            record.sdg = record.sdg.map(sdg => sdg.id.split("_").pop()).map((sdg) => `${Number(sdg)< 10 ? "0": ""}${sdg}`);
        }
        else {
            record.sdg = [];
        }

        if (record.dept && record.dept.length) {
            record.dept = record.dept.map(d => d.id.split("_").pop());
        }
        else {
            record.dept = [];
        }

        if (!record.keywords) {
            record.keywords = [];
        }
        if (!record.class) {
            record.class = [];
        }
        record.persons = record.authors.reduce((akk, val) => {
            if(val.person) {
                val.department = val.person.department.id.split("_").pop();
            }
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

    if (queryTerms) {
        if (queryTerms.persons && queryTerms.persons.length) {
            queryInfoObject.authors.person["@options"].filter.initials = {
                in: queryTerms.persons
            };
            queryInfoObject.authors.person["@required"] = true;
        }
        else {
            queryInfoObject.authors.person["@options"].filter.has = "department";
        }

        if (queryTerms.sdgs && queryTerms.sdgs.length) {
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

        if (queryTerms.departments && queryTerms.departments.length) {
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

        if (queryTerms.terms && queryTerms.terms.length) {
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
    }
    return queryInfoObject;
}

function buildDQLQueryString(category, queryObj) {
    const items = []
        .concat(Filter.buildFilter(queryObj))
        .concat(Filter.buildObjectTypeFilter(category))
        .concat(buildSelector());

    return `{ ${items.join("\n")} }`;
}

function buildSelector() {
    return [
        "objects (func: uid(vFilter), orderdesc: InfoObject.year, orderdesc: InfoObject.link, first: 20) @filter(uid_in(InfoObject.category, uid(vObjectType)))",
        "{",
        ...Filter.selectorAlias([
            "title",
            "abstract",
            "year",
            "extras",
            "link"
        ], "InfoObject"),
        "authors: InfoObject.authors {",
        "fullname: Author.fullname",
        "person: Author.person {",
        ...Filter.selectorAlias(["fullname", "initials", "title", "mail", "ipphone", "gender"],"Person"),
        "department: Person.department {",
        "id: Department.id",
        "}",
        "}",
        "}",
        "dept: InfoObject.departments { id: Department.id }",
        "sdg: InfoObject.sdgs { id: Sdg.id }",
        "keywords: InfoObject.keywords { name: Keyword.name }",
        "subtype: InfoObject.subtype { name: InfoObjectSubType.name }",
        "class: InfoObject.class { id: PublicationClass.id name: PublicationClass.name }",
        "}"
    ];
}
