import * as Events from "../Events.mjs";
import * as Filter from "./DqlFilter.mjs";

import * as Logger from "../Logger.mjs";

Events.listen.startUserInterface(initUI);
Events.listen.classificationUpdate(loadClassification);
Events.listen.changeCategory(categoryChange);

const RequestController = new AbortController();

const Model = {
    category: "",
    clssifications: [],
    records: []
};

function categoryChange(ev) {
    Model.category = ev.detail.category;
}

async function initUI() {
    Logger.debug("Classification fetch: Initializing classifications");
    const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                queryPublicationClass {
                    name
                }
            }`
        })
    });

    if (!response.ok) {
        console.error("Classification fetch: Server responded with ", response.status);
        return;
    }

    try {
        const result = await response.json();

        Model.clssifications = result.data.queryPublicationClass.map(classification => classification.name);
    }
    catch (error) {
        console.error("Classification fetch:", error);
    }
}

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

export function getClassifications() {
    return Model.clssifications;
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

    // if (query) {
    Logger.debug("hello");

    const data = await Filter.classificationQuery(query, Model.category, RequestController);

    if (data && "classes" in data) {
        Model.records = data.classes.map((e) => {
            e.objects = e.obj[0].n;
            delete e.obj;
            return e;
        });

        Events.trigger.classificationData();
    }
    // }
}
