import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";

const Model = {
    records: {},
    data: []
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
    if (Model.records.id) {
        return Model.records.id;
    }

    return {qterms: []};
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

}

/**
 * Deletes a single record from the matching terms in the backend
 * 
 * @param {Event} ev 
 */
async function deleteRecord(ev) {

}

/**
 * loads all matching terms
 */
async function loadData() {

}
