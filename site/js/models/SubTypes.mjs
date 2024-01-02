import * as Logger from "../Logger.mjs";
import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";

Events.listen.startUserInterface(initUI);
Events.listen.subtypeUpdate(loadSubtype);
Events.listen.changeCategory(categoryChange);

const RequestController = new AbortController();

const Model = {
    types: [],
    records: [],
    remainingRecords: [],
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

export function getRemainingRecords() {
    return Model.remainingRecords;
}

/**
 *
 * @param {CustomEvent} event - the event payload
 *
 * loads the subtype for the present query. The query will be passed
 * as the event payload.
 */
async function loadSubtype(event){
    const query = event.detail;

    Logger.debug("hello");

    const data = await Filter.subtypeQuery(query, Model.category, RequestController);

    if (data && "subtypes" in data) {
        Model.records = data.subtypes.map((e) => {
            e.objects = e.obj[0].n;
            delete e.obj;
            return e;
        });

        if (query.subtypes.length) {
            const unfiltered = await Filter.subtypeQuery({ ...query, subtypes: [] }, Model.category, RequestController)
            Model.remainingRecords = unfiltered.subtypes.map((e) => {
                e.objects = e.obj[0].n;
                delete e.obj;
                return e;
            });
            Model.remainingRecords = Model.remainingRecords
                .filter(rr => !Model.records.find(r => rr.id === r.id));
        }
        else {
            Model.remainingRecords = [];
        }

        console.log(Model);

        Events.trigger.subtypeData();
    }
}
