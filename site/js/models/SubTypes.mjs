import * as Logger from "../Logger.mjs";
// import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";

Events.listen.startUserInterface(initUI);
Events.listen.subtypeUpdate(loadSubtype);
Events.listen.changeCategory(categoryChange);

const Model = {
    types: [],
    records: [],
    category: ""
};

function categoryChange(ev) {
    Model.category = ev.detail.category;
}

async function initUI() {
    Logger.debug("Subtype fetch: Initializing types");
    const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                queryInfoObjectSubType {
                    name
                }
            }`
        })
    });

    if (!response.ok) {
        console.error("SubType fetch: Server responded with ", response.status);
        return;
    }

    try {
        const result = await response.json();

        Model.types = result.data.queryInfoObjectSubType.map(subType => subType.name);
    }
    catch (error) {
        console.error("SubType fetch:", error);
    }
}

export function getSubTypes() {
    return Model.types;
}

export function getRecords() {
    return Model.records;
}

/**
 *
 * @param {CustomEvent} event - the event payload
 *
 * loads the subtype for the present query. The query will be passed
 * as the event payload.
 */
async function loadSubtype(event){
    Model.records = [{ id: "1", name: "test1", objects: "1" }, { id: "2", name: "test2", objects: "2" }];
    Events.trigger.subtypeData();
}
