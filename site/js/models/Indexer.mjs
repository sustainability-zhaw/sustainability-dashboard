import * as Config from "./Config.mjs";
import * as Logger from "../Logger.mjs";
import * as Events from "../Events.mjs";

import * as Filter from "./DqlFilter.mjs";
import * as QueryModel from "./Query.mjs";

const Model = {
    records: {},
    data: [],
    filter: [],
    query: ""
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
        const query = Model.records[id].qterms
            .filter(t => t.type !== "sdg")
            .map(t => Object.assign({}, t));
        
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
async function createRecord(ev) {
    Logger.debug(`create INDEX Term from ${JSON.stringify(ev.detail)}`);

    const sdgMatch = ev.detail.reduce((agg, {type, value}) => {
        switch(type) {
        case "notterm":
            agg.forbidden_context = value;
            break;
        case "lang":
            agg.language = value.toLowerCase();
            break;
        case "sdg":
            agg.sdg = {id: `sdg_${value}`};
            break;
        default:
            if ("keyword" in agg) {
                agg.required_context = value;
                break;
            }
            agg.keyword = value;
            break;
        }
        return agg;
    }, {});

    // get next construct
    sdgMatch["construct"] = await findMaxId(sdgMatch.sdg.id, sdgMatch.language);

    Logger.debug(`matchobject ${JSON.stringify(sdgMatch, null, "  ")}`);

    const qstring = `mutation addSdgMatch($sdgMatch: AddSdgMatchInput!) {
        addSdgMatch(input: [$sdgMatch]) {
          n: numUids
          sdgMatch {
            construct
          }
        }        
    }`;

    await mutateData(qstring, {sdgMatch});
}

async function findMaxId(sdg, lang) {
    const qstring = `query querySdgMatch($sdgfilter: SdgFilter!) {
    result: querySdgMatch @cascade {
      id: construct
      sdg(filter: $sdgfilter) {
        id
      }
    }
}`;
    const variables = {
        sdgfilter: {
            id: {
                eq: sdg
            }
        }
    };

    const data = await gqlQurey(qstring, variables);

    // this will yield different ids after a while
    if ("result" in data && data.result.length) {
        const nextid = data.result.map(r => Number(r.id.split("_")[1].replace("c","")))
            .reduce((a,b) => Math.max(a,b)) + 1

        return `${sdg.replace("_", "")}_c${nextid}_${lang}`;
    }
    
    return `${sdg.replace("_", "")}_c1_${lang}`;
}

/**
 * Deletes a single record from the matching terms in the backend
 * 
 * @param {Event} ev 
 */
async function deleteRecord(ev) {
    Logger.debug(`delete record ${ev.detail}`);

    const query = "mutation deleteSdgMatch($filter: SdgMatchFilter!) { result: deleteSdgMatch(filter: $filter) { msg sdgMatch { construct language } } }";
    const variables = {
        filter: {
            construct: { 
                eq: ev.detail
            }
        }
    };

    await mutateData(query, variables);
}

async function gqlQurey(query, variables) {
    const url = Config.initGQLUri();
    const body = JSON.stringify({query,variables});
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const headers = {
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });
    
    // console.log(">>> post request");
    
    const result = await response.json();

    // Logger.debug(`error ${JSON.stringify(result, null, "  ")}`);
    
    return result.data || {};
}

async function mutateData(query, variables) {
    const data = await gqlQurey(query,variables);

    if ("result" in data) {
        Logger.debug(`Result is ${data.result.msg}`);
    }

    await loadData();
}

async function loadData() {
    const data = await Filter.indexQuery(QueryModel.query(), 100, 0, RequestController);

    if (data && "sdgmatch" in data) {
        Model.data = data.sdgmatch.map(parseRecord);
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
            {type: "sdg", value: rec.sdg.id.replace("sdg_", "")}
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
