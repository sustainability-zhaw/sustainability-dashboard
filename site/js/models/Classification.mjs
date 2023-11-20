import * as Events from "../Events.mjs";
import * as Filter from "./DqlFilter.mjs";

Events.listen.startUserInterface(initUI);
Events.listen.classificationUpdate(loadClassification);

const RequestController = new AbortController();

async function initUI() {
    // fetch all substypes from Database
}

const Model = {
    records: []
};

/**
 *
 * @returns an array of records
 *
 * This will return all classification records. As the overall classification is
 * small, the worst case will be less than 250 items with an empty query.
 */
export function getRecords() {
    return Model.records;
}

/**
 *
 * @param {CustomEvent} event - the event payload
 *
 * loads the classification for the present query. The query will be passed
 * as the event payload.
 */
async function loadClassification(event){
    const query = event.detail;

    if (query) {
        const data = await Filter.classicationQuery(query, RequestController);

        if (data && "class" in data) {
            Model.records = data.class.map((e) => {
                e.objects = e.obj.n;
                delete e.obj;
                return e;
            });
            Events.trigger.classicationData();
        }

    }
}
