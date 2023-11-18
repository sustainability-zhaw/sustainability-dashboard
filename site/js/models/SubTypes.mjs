// import * as Logger from "../Logger.mjs";
// import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";

Events.listen.startUserInterface(initUI);

async function initUI() {
    // fetch all substypes from Database
}

const Model = {
    types: []
};

export function getRecords() {
    // return list of valid subtypes
    return Model.types;
}
