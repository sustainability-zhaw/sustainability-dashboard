import * as Events from "../Events.mjs";
import * as Logger from "../Logger.mjs";

import * as IndexModel from "../models/Indexer.mjs";

Events.listen.indexTermData(renderIndexTerms);

export function init(target) {
    target.addEventListener("click", handleIndexActivate);
    target.addEventListener("click", handleIndexDelete);
}

export function isActive() {
    const menuitem = document.querySelector(".active #indexmatcher_menu");

    if (menuitem) {
        return true;
    }

    return false;
}

function handleIndexActivate(ev) {
    if (!ev.target.parentNode.classList.contains("indexterm") || ev.target.classList.contains("disabled")) {
        return;
    }

    const idxid = ev.target.parentNode.id.replace("index-", "");

    IndexModel.getOneRecord(idxid);
}

function handleIndexDelete(ev) {
    if (!ev.target.classList.contains("bi-trash-fill") || ev.target.classList.contains("disabled")) {
        return;
    }

    const id = ev.target.parentNode.id.replace("index-","");
    Logger.debug(`drop index ${id}`);

    Events.trigger.indexTermDelete(id);
}

function renderIndexTerms() {
    // only render if the index terms are shown.
    
    Logger.debug("render index terms");

    const menuitem = document.querySelector(".active #indexmatcher_menu");
    if(!menuitem) {
        return; 
    }    

    const templateList = document.querySelector("#templateIndexTerm");
    // const templateQuery = document.querySelector("#searchoption");
    const container = document.querySelector("#overlaycontent");

    container.textContent = "";
    container.scrollTop = 0;

    IndexModel.getRecords().forEach(
        (rec) => {
            const result = templateList.content.cloneNode(true);
            const lang = rec.qterms.filter(t => t.type === "lang").map(r => r.value).join("");
            const sdg = rec.qterms.filter(t => t.type === "sdg").map(r => r.value).pop();
            const terms = rec.qterms
                .filter(t => t.type === "term" || t.type === "notterm")
                .map(t => `${t.type === "notterm" ? "not:" : ""}${t.value}`)
                .join(", ");

            result.querySelector(".indexterm").id = "index-" + rec.id;
            result.querySelector(".index-sdg").classList.add("mark");
            result.querySelector(".index-sdg").classList.add(`sdg_${sdg}`);
            result.querySelector(".index-lang").textContent = lang;
            result.querySelector(".index-query").textContent = terms;

            container.appendChild(result);
        }
    );
}

