import * as Events from "../Events.mjs";
// import * as Logger from "../Logger.mjs";
import * as Config from "../models/Config.mjs";

import * as QueryModel from "../models/Query.mjs";

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

    if (QueryModel.isEmpty()) {
        console.log("avoid downloading empty query");
        return;
    }

    const query = QueryModel.query();
    const category = QueryModel.category();

    const RequestController = new AbortController();

    const {signal} = RequestController;
    const dataurl = Config.getUri("download/");
    const cache = "no-store";
    const headers = {
        "Content-Type": "application/json"
    };
    const method = "POST";
    const body = JSON.stringify({
        query,
        category
    });

    try {
        const response = await fetch(dataurl, {
            signal,
            method,
            body,
            cache,
            headers
        });

        if (response.status !== 200) {
            throw new Error("Bad response");
        }

        const contentType = response.headers.get("Content-Type");

        // protect against backdoor logouts
        if (!(contentType && contentType === "application/vnd.ms-excel")) {
            throw new Error("EXCEL file expected");
        }

        const dispoheader = response.headers.get("Content-Disposition");
        const filename = dispoheader?.split(";").filter((el) => el.trim().startsWith("filename=")).pop()?.replace("filename=", "").trim();

        if (!(filename && filename.length)) {
            throw new Error("filename expected");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const hlink = document.createElement("a");

        hlink.href = url;
        hlink.download = filename;
        hlink.click();

        URL.revokeObjectURL(url);
    }
    catch (err) {
        console.log(`failed to load data: ${err.message}`);
    }
}
