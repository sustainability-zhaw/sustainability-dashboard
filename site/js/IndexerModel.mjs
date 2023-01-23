import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";

const Model = {
    records: {},
    data: [],
    filter: []
};

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
async function loadData() {

}
