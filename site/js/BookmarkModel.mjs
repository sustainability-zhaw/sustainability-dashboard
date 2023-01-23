import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";

const Model = {
    records: {},
    data: []
};

Events.listen.bookmarkChoose(chooseRecord);
Events.listen.bookmarkDelete(deleteRecord);
Events.listen.bookmarkUpdate(loadData);

function chooseRecord() {

}

function deleteRecord() {

}

async function loadData() {

}
