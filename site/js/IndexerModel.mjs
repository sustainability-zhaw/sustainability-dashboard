import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";

import * as Filter from "./DqlFilter.mjs";

const Model = {
    records: {},
    data: [],
    filter: []
};

const RequestController = new AbortController();

Events.listen.indexTermCreate(createRecord);
Events.listen.indexTermDelete(deleteRecord);
Events.listen.indexTermUpdate(loadData);
Events.listen.queryUpdate(selectRecords);

/**
 * returns the list of records for the UI
 */
export function getRecords() {
   return Model.data;
}

/**
 * returns on record for being inserted in the QueryModel
 * 
 * @param {Int} id 
 */
export function getOneRecord(id) {
    if (Model.records[id]) {
        const query = Model.records[id].qterms.map(t => Object.assign({}, t));

        Events.trigger.queryReplace(query);
    }
}


/**
 * filter records for a specific language and/or SDG
 * 
 * @param {Event} ev 
 * 
 * the event passes `details` that inform the model, which Filter is applied. 
 */
function selectRecords(ev) {
    
}

/**
 * Creates a new matching term record in the backend
 * @param {Event} ev 
 */
function createRecord(ev) {
    Logger.debug(`create INDEX Term from ${JSON.stringify(ev.detail)}`);

    if (ev.detail.length) {
        const id = Model.data.length ? Math.max(...Model.data.map((e) => e.id)) + 1 : 1;

        const record = {id, qterms: ev.detail};
        Model.data.push(record);
        Model.records[id] = record;

        Events.trigger.indexTermData();
    }
}

/**
 * Deletes a single record from the matching terms in the backend
 * 
 * @param {Event} ev 
 */
async function deleteRecord(ev) {
    Logger.debug(`delete record ${ev.detail}`);

    // FIXME: delete the record from the database and reload data

    Model.data = Model.data.filter(r => r.id != ev.detail);
    delete Model.records[ev.detail];
    Events.trigger.indexTermData();
}

/**
 * loads all matching terms
 */
async function loadData(ev) {
    const query = ev.detail;

    Logger.debug("load matcher data")

    const url = initBaseStatsUri();
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const headers = {
        'Content-Type': 'application/dql'
    };

    let body  = buildQueryString(query);
    
    Logger.debug(body);

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });

    const result = await response.json();
    
    // Logger.debug(JSON.stringify(result, null, "  "));

    // if (Object.hasOwn(result, "errors")) {
    //     Logger.debug(result.errors[0].message);
    // } 

    if (Object.hasOwn(result, "data") && result.data && Object.hasOwn(result.data, "sdgmatch")) {
        Model.data = result.data.sdgmatch.map(parseRecord);
        Model.records = Model.data.reduce((a, r) => {
            a[r.id] = r;
            return a;
        }, {});
    }

    Events.trigger.indexTermData();
}

function parseRecord(rec) {
    const result = {
        id: rec.construct,
        qterms: [
            {type: "term", value: rec.keyword},
            {type: "lang", value: rec.language.toUpperCase()},
            {type: "sdg", value: Number(rec.sdg.id.replace("sdg_", ""))}
        ]
    };

    if (rec.required_context && rec.required_context.length) {
        result.qterms.push({type: "term", value: rec.required_context});
    }
    if (rec.forbidden_context && rec.forbidden_context.length) {
        result.qterms.push({type: "notterm", value: rec.forbidden_context});
    }
    return result;
}

function initBaseStatsUri() {
    const buri = Config.get("staturi");

    if (buri && buri.length) {
        Logger.debug("got staturi");
        return buri;
    }

    // Logger.debug("STATS prepare baseuri");

    const proto = Config.get("proto") || "https://",
          host  = Config.get("host") || "",
          path  = Config.get("stats") || "";

    const baseuri = `${host.length ? proto : ""}${host}${(host.length && host.at(-1) !== "/") ? "/" : ""}${path}`

    // Logger.debug("STATS set stats baseuri to " + baseuri);

    Config.set("staturi", baseuri);

    return baseuri;
}

function buildQueryString(queryObj) {
    // ensure valid query statement for match terms
    queryObj.departments = [];
    queryObj.persons = [];

    const items = []
        .concat(Filter.buildMatchFilter(queryObj))
        .concat(buildSelector());

    return `{ ${items.join("\n")} }`;
}

function buildSelector() {
    return [
       "sdgmatch (func: uid(vFilter)) {",
       ...Filter.selectorAlias([
            "construct",
            "keyword",
            "required_context",
            "forbidden_context",
            "language"
       ], "SdgMatch"),
       "sdg: SdgMatch.sdg {",
       "id: Sdg.id",
       "}",
       "}"
    ];
}
