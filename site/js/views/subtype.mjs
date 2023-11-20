/**
 * This view is responsible for the overlays for classifications and publication types
 */

import * as Events from "../Events.mjs";
import * as Logger from "../Logger.mjs";

import * as ClassificationModel from "../models/Classification.mjs";
import * as PubTypeModel from "../models/SubTypes.mjs";

Events.listen.classificationData(renderClassifications);
Events.listen.subtypeData(renderSubtypes);

// TODO: listen for query update and check which of the views is active
// if one is, send the correct signal to load the data

export function init(target) {
    target.addEventListener("click", handleTermActivate);
}

/**
 * checks whether an overlay is active
 *
 * @param {*} type - the overlay to handle
 * @returns boolean - True if the given type is activ
 */
export function isActive(type) {
    if (type === "classification") {
        const menuitemCls  = document.querySelector(".active #classification_menu");

        if (menuitemCls) {
            return true;
        }
    }

    if (type === "subtype") {
        const menuitemSubT = document.querySelector(".active #classification_menu");

        if (menuitemSubT) {
            return true;
        }
    }

    return false;
}

/**
 * renders the classifications within the current query
 */
function renderClassifications() {
    Logger.debug("render classification items");

    if (!isActive("classification")) {
        return;
    }

    renderItems(ClassificationModel);
}

/**
 * renders the publication types within the active query
 */
function renderSubtypes() {
    Logger.debug("render classification items");

    if (!isActive("subtype")) {
        return;
    }

    renderItems(PubTypeModel);
}

/**
 * renders the available records
 *
 * @param {*} model - Data Model for the active overlay
 */
function renderItems(model) {
    const template = document.querySelector("#templateSubTypeItem");
    // const templateQuery = document.querySelector("#searchoption");
    const container = document.querySelector("#overlaycontent");

    container.textContent = "";

    model.getRecords().reduce((acc, rec) => {
        const result = acc.template.content.cloneNode(true);

        result.querySelector(".subtype").id = "stype-" + rec.id;

        result.querySelector(".type-id-name").textContent = rec.id;
        result.querySelector(".type-text").textContent = rec.name || "";
        result.querySelector(".type-stat").textContent = rec.objects;

        acc.container.appendChild(result);
        return acc;
    }, {template, container});

}

/**
 * add a Term/classification to the query
 */
function handleTermActivate() {
    // add query term
}
