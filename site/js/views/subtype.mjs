/**
 * This view is responsible for the overlays for classifications and publication types
 */

import * as Events from "../Events.mjs";
import * as Logger from "../Logger.mjs";

import * as QueryModel from "../models/Query.mjs";

import * as ClassificationModel from "../models/Classification.mjs";
import * as PubTypeModel from "../models/SubTypes.mjs";

Events.listen.classificationData(renderClassifications);
Events.listen.subtypeData(renderSubtypes);
Events.listen.queryUpdate(updateView);

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
export function isActive() {
    const menuitemCls  = document.querySelector(".active #classification-menu");

    if (menuitemCls) {
        return "classification";
    }

    const menuitemSubT = document.querySelector(".active #subtypes-menu");

    if (menuitemSubT) {
        return "subtype";
    }

    return "none";
}

const trigger = {
    "classification": (q) => {
        Events.trigger.classificationUpdate(q);
    },
    "subtype": (q) => {
        Events.trigger.subtypeUpdate(q);
    }
};

function updateView() {
    trigger[isActive()]?.(QueryModel.query());
}

/**
 * renders the classifications within the current query
 */
function renderClassifications() {
    if (!isActive("classification")) {
        return;
    }

    Logger.debug("render classification items");

    renderItems(ClassificationModel);
}

/**
 * renders the publication types within the active query
 */
function renderSubtypes() {
    if (!isActive("subtype")) {
        return;
    }

    Logger.debug("render subtype items");

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
        result.querySelector(".subtype").addEventListener("click", () => {
            Events.trigger.queryAddItem({ type: "type", value: rec.name });
        });

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
