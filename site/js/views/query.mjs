import * as Events from "../Events.mjs";
// import * as Logger from "../Logger.mjs";
import * as Config from "./Config.mjs";

import * as QueryModel from "./Query.mjs";

export function init() {
    const sidebarelement = document.querySelector(".searchtools");

    sidebarelement.addEventListener("click", loadExportData);
    sidebarelement.addEventListener("click", clearSearch);
}

function clearSearch(ev) {
    if (
        ev.target.id !== "newsearch" &&
        ev.target.parentNode.id !== "newsearch"
    ) {
        return;
    }

    document.querySelector("#searchcontainer .searchoptions").innerHTML = "";
    Events.trigger.queryClear();
}

async function loadExportData(ev) {
    if (
        ev.target.id !== "download_results" &&
        ev.target.parentNode.id !== "download_results"
    ) {
        return;
    }

    const query = QueryModel.query();
    const category = QueryModel.category();

    const RequestController = new AbortController();

    const {signal} = RequestController;
    const dataurl = Config.getUri("/download");
    const cache = "no-store";
    const headers = {
        "Content-Type": "application/json"
    };
    const method = "POST";
    const body = {
        query,
        category
    };

    try {
        const response = await fetch(dataurl, {
            signal,
            method,
            body,
            cache,
            headers
        });

        const blob = await response.blob();

        const hlink = document.createElement("a");
        const url = URL.createObjectURL(blob);

        hlink.href = url;
        hlink.download = "foobar.xlsx";
        hlink.click();

        URL.revokeObjectURL(url);
    }
    catch (err) {
        console.log(`failed to load data ${err.message}`);
    }
}
