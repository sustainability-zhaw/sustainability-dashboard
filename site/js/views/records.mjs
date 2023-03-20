import * as Events from "../Events.mjs";
import * as Logger from "../Logger.mjs";

import * as DataModel from "../models/Data.mjs";

// import * as IndexTerms from "./indexterms.mjs";

const scrollLimit = 600;
const maxScrollRecords = 500;

Events.listen.dataUpdate(renderRecords);

export function init() {
    const sidebarElement = document.querySelector("#mainarea");

    sidebarElement.addEventListener("click", foldResults);
    sidebarElement.addEventListener("scroll", scrollLoader);

    document.querySelector(".scroll-limit").textContent = maxScrollRecords;
}

function scrollLoader() {
    const mainContent = document.querySelector("#mainarea");

    const vpHeight = window.visualViewport.height;
    const height = mainContent.scrollHeight - vpHeight;
    const offset = mainContent.scrollTop;

    // Logger.debug(`${height} - ${offset}`);

    if (height - offset < scrollLimit) {
        if (!DataModel.is_complete() && DataModel.offset() < maxScrollRecords) {
            document.querySelector("#mainarea .intransit").removeAttribute("hidden");
        }

        if (DataModel.offset() < maxScrollRecords) {
            Events.trigger.moreData();
        }
    }
}

function foldResults(evt) {
    const targetParent = evt.target.parentNode.parentNode;

    if (evt.target.classList.contains("resultfold")) {
        const toggleElements = targetParent.querySelectorAll(".extra");
        const toggleTools = targetParent.querySelectorAll(".tool.resultfold");

        [...toggleTools].forEach(togglable => {
            togglable.classList.toggle("bi-layer-backward");
            togglable.classList.toggle("bi-layer-forward");
        });

        [...toggleElements].forEach(togglable => togglable.hidden = !togglable.hidden);

        if (evt.target.classList.contains("bi-layer-backward")) {
            evt.target.setAttribute("data-bs-original-title", "Show Details");
        }
        else {
            evt.target.setAttribute("data-bs-original-title", "Hide Details");
        }
    }
}

// FLCH


function renderRecords(ev) {
    Logger.debug("data update");

    const targetsection = document.querySelector(".results");

    const section = document.querySelector(".nav-link.active");
    const category = section.dataset.category;

    if (!["publications", "projects", "modules", "people"].includes(category)) {
        Logger.debug( "not in a data category. nothing to render");
        return;
    }

    // set the result type
    document.querySelector("#mainarea .info").removeAttribute("hidden");
    document.querySelector("#mainarea .intransit").setAttribute("hidden", "hidden");

    // when we get the first results of a fresh search, reset the results section
    // TODO Pagination
    if (ev.detail.reset) {
        Logger.debug("reset data section");
        targetsection.innerHTML = "";
    }

    targetsection.dataset.resulttype = category;

    if (!ev.detail.nochange) {
        // this block handles the case when the query has changed and there is something to render
        // nochange is present, only if the model identified that two subsequent queries are equal.

        const template = document.querySelector("#resultcontainer");

        DataModel.feed().reduce((section, object) => {
            const element = Object.keys(object).reduce((result, k) => {
                let sel = `.${k}`;

                if (k === "link") {
                    [...result.querySelectorAll(sel)].forEach(e => e.href = object[k]);
                    return result;
                }

                if (typeof object[k] !== "object") {
                    result.querySelector(sel).innerText = object[k];
                    return result;
                }

                let templateId = `#${sel.slice(1)}template`;

                if (["sdg", "department"].includes(k)) {
                    templateId = "#cattemplate";
                    sel = ".categories";
                }
                else if (["subtype", "classification", "keywords"].includes(k)) {
                    templateId = "#listitemtemplate";
                }
                else if (k === "matches" && object[k].length > 1) {
                    // first sort by SDG and then by primary keyword
                    object[k] = object[k].sort((a,b) => Number(a.mark?.id.replace("sdg_", "") || 0) - Number(b.mark?.id.replace("sdg_", "") || 0) || a.keyword?.localeCompare(b.keyword || "") );
                }

                const template = document.querySelector(templateId);

                sel += ".list";
                if (Array.isArray(object[k])) {
                    object[k].reduce(
                        handleListElement(template),
                        result.querySelector(sel)
                    );

                    return result;
                }

                handleListElement(template)(result.querySelector(sel), object[k]);

                return result;
            }, template.content.cloneNode(true));

            section.appendChild(element);

            return section;
        }, targetsection);
    }

    if (DataModel.is_complete() && DataModel.feed().length){
        document.querySelector("#mainarea .EOF").removeAttribute("hidden");
    }

    document.querySelector("#mainarea").removeAttribute("hidden", "hidden");
    document.querySelector("#warnings").setAttribute("hidden", "hidden");
    document.querySelector("#loading_data").setAttribute("hidden", "hidden");

    if (!ev.detail.nochange) {
        if (!DataModel.feed().length && !DataModel.offset()) {
            document.querySelector("#no_data").removeAttribute("hidden");
            document.querySelector("#warnings").removeAttribute("hidden", "hidden");
            document.querySelector("#mainarea .EOF").setAttribute("hidden", "hidden");
            document.querySelector("#mainarea .limit-reached").setAttribute("hidden", "hidden");
        }

        if (DataModel.offset() > maxScrollRecords && !DataModel.is_complete()) {
            document.querySelector("#mainarea .intransit").setAttribute("hidden", "hidden");
            document.querySelector("#mainarea .limit-reached").removeAttribute("hidden");
        }
    }
    if (ev.detail.reset) {
        // this MUST be the very last, so the rendering can catch up.
        // if this is optimised with the earlier reset block, then some browsers will
        // not alter the scroll!
        targetsection.parentNode.scrollTop = 0;
    }
}

function handleField(tmpl, field, key, value) {
    if (!field) {
        return tmpl;
    }

    if (key.startsWith("qvalue")) {
        field.dataset.qvalue = value;
        return tmpl;
    }

    if (key === "id") {
        field.classList.add(value);

        if ("qtype" in field.dataset && field.dataset.qtype.length === 0) {
            // Logger.debug("set dataset type and value");
            const [qtype, qvalue] = value.split("_");

            field.dataset.qtype = qtype;
            field.dataset.qvalue = qvalue;
        }

        return tmpl;
    }

    if (key === "department") {
        field.querySelector(".id").classList.add(value.id);
        return tmpl;
    }

    if (typeof value === "object") {
        return Object.keys(value).reduce((agg, k) => {
            return handleField(agg, agg.querySelector(`.${k}`), k, value[k]);
        }, tmpl);
    }

    field.innerHTML = value;
    return tmpl;
}

function handleListElement(template) {
    return (a, e) => {
        const element = Object.keys(e).reduce((tmpl, k) => {
            return handleField(tmpl, tmpl.querySelector(`.${k}`), k,  e[k]);
        }, template.content.cloneNode(true));

        a.appendChild(element);

        return a;
    };
}
