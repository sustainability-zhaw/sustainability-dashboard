/**
 * This view is responsible for the sub menus for categories and publication types
 */

import * as Events from "../Events.mjs";
import * as Logger from "../Logger.mjs";

// import * as ClassificationModel from "../models/Classification.mjs";
// import * as PubTypeModel from "../models/PubTypes.mjs";

Events.listen.classificationData(renderClassifications);
Events.listen.subtypeData(renderSubtypes);

export function init(target) {
    target.addEventListener("click", handleTermActivate);
}

export function isActive(type) {
    const menuitemCls  = document.querySelector(".active #classification_menu");
    const menuitemSubT = document.querySelector(".active #classification_menu");

    if (type === "classification" && menuitemCls) {
        return true;
    }

    if (type === "subtype" && menuitemSubT) {
        return true;
    }

    return false;
}

function renderClassifications() {
    Logger.debug("render classification items");

    if (!isActive("classification")) {
        return;
    }

    renderItems(ClassificationModel);
}

function renderSubtypes() {
    Logger.debug("render classification items");

    if (!isActive("subtype")) {
        return;
    }

    renderItems(PubTypeModel);
}

function renderItems(model) {
    const template = document.querySelector("#templateSubTypeItem");
    // const templateQuery = document.querySelector("#searchoption");
    const container = document.querySelector("#overlaycontent");

    model.getRecords().reduce((acc, rec) => {
        const result = acc.template.content.cloneNode(true);

        result.querySelector(".subtype").id = "index-" + rec.id;

        result.querySelector(".index-id-name").textContent = rec.id;
        result.querySelector(".index-text").textContent = rec.name;
        result.querySelector(".index-stat").textContent = rec.stat;

        acc.container.appendChild(result);
    }, {template, container});

}

function handleTermActivate() {
    // add query term
}
