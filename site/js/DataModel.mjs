import { json_to_gql, pretty_gql } from "./gql.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Filter from "./DqlFilter.mjs";
import * as Events from "./Events.mjs";
import * as QueryModel from "./QueryModel.mjs";

const method = "POST"; // all requests are POST requests
const cache = "no-store";

const Message = {
    message: ""
};

const Model = {
    records: [],
    offset: 0,
    active: false,
    complete: false
};

const queryLimit = 20;

const RequestController = new AbortController();

Events.listen.queryUpdate(handleLoadData);
Events.listen.moreData(handleMoreData);
Events.listen.changeCategory(categoryChange);

export function feed() {
    return Model.records;
}

export function offset() {
    return Model.offset;
}

export function is_complete() {
    return Model.complete;
}

async function handleLoadData(ev) {
    if (Model.active) {
        Logger.debug("abort previous fetch!");
        RequestController.abort();
    }

    Model.complete = false;

    await fetchData(Model.category, true);
}

async function handleMoreData(ev) {
    if (Model.active || Model.complete) {
        return;
    }

    Logger.debug("load more data");

    await fetchData(Model.category, false);
}

async function fetchData(category, reset) {
    Logger.debug("fetch data from server");

    Model.offset = reset ? 0 : Model.offset + Model.records.length;
    Model.records = [];
    
    Model.active = true;
    const success = await loadData(category, QueryModel.query());
    if (success) {
        Events.trigger.dataUpdate({reset});
    }
    Model.active = false;

}

function categoryChange(ev) {
    Model.category = ev.detail.category;
}

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

export async function loadData(type, queryObj) {
    Model.message = "";
    Model[type] = [];

    // const queryTerms = queryObj;
    // const objects = gqlSearchQuery(type, queryTerms);

    const dqlQuery = buildDQLQueryString(type, queryObj);

    // Logger.debug("DQL Follows");
    // Logger.debug("------------------------------");
    // Logger.debug(dqlQuery);
    // Logger.debug("------------------------------");

    try {
        Model.records = await executeDQLQuery(dqlQuery);
        // Model[type] = await executeQuery({objects});
        
    }
    catch (err) {
        if (err.name == "AbortError") {
            Logger.info(`error: cancel request ${err.message}`); 
        }
        else {
            // Model[type] = [];
            Message.message = err.message;
            Logger.info(`error (${err.name}): ${Message.message}`);
        }
        return false;
    }

    Model.complete = !Model.records.length || Model.records.length < queryLimit;
    
    if (Model.complete) {
        Logger.debug("Query is complete!");
    }
    return true;
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

    if ("data" in result) {
        // Logger.info(`response: \n ${ JSON.stringify(result, null, "  ") }`);
        return result.data.objects;
    }
    else {
        Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    }

    return []
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
        "objects (func: uid(vFilter), orderdesc: InfoObject.year, orderdesc: InfoObject.link,",
        Model.offset ? `offset: ${Model.offset},` : "",  
        `first: ${queryLimit}) `,
        "@filter(uid_in(InfoObject.category, uid(vObjectType)))",
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
        "fullname: Person.fullname",
        "qvalue.person: Person.initials",
        "department: Person.department {",
        "id: Department.id",
        "}",
        "}",
        "}",
        "department: InfoObject.departments { id: Department.id }",
        "sdg: InfoObject.sdgs { id: Sdg.id }",
        "keywords: InfoObject.keywords { name: Keyword.name }",
        "subtype: InfoObject.subtype { name: InfoObjectSubType.name }",
        "classification: InfoObject.class { itemid: PublicationClass.id name: PublicationClass.name }",
        "}"
    ];
}
