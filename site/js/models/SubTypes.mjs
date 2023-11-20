import * as Logger from "../Logger.mjs";
// import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";

Events.listen.startUserInterface(initUI);

const Model = {
    types: []
};

async function initUI() {
    Logger.debug("Subtype fetch: Initializing types");
    await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                queryInfoObjectSubType {
                    name
                }
            }`
        })
    })
        .then(async response => {
            if (!response.ok) {
                console.error("SubType fetch: Server responded with ", response.status);
                return;
            }
            const result = await response.json();

            Model.types = result.data.queryInfoObjectSubType.map(subType => subType.name);
        })
        .catch(error => {
            console.error("SubType fetch:", error);
        });
}

export function getRecords() {
    return Model.types;
}
