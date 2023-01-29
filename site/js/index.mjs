// more modules
import * as Events from "./Events.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";

// models
import * as DataModel from "./DataModel.mjs";
// import * as StatsModel from "./StatsModel.mjs";
import * as QueryModel from "./QueryModel.mjs";
// import * as IndexModel from "./IndexerModel.mjs";

// views
import * as IndexOverlayView from "./views/indexterms.mjs";
import * as StatsView from "./views/stats.mjs";

// pull up the System with a basic configuration

const scrollLimit = 600;
const maxScrollRecords = 500

Events.listen.queryUpdate(handleQueryUpdate);
Events.listen.queryUpdate(handleQueryUpdateIndex);

Events.listen.queryExtra(handleQueryExtraUpdate);
Events.listen.dataUpdate(handleDataUpdate);

Events.listen.bookmarkUpdate(() => {});

Events.listen.partialMatchingTerm(conditionalIndexButtonPartial);
Events.listen.fullMatchingTerm(conditionalIndexButtonOn);
Events.listen.invalidMatchingTerm(conditionalIndexButtonOff);

Events.listen.queryUpdate(renderSearchOptions);

Events.listen.queryError(showQueryError);

await init();

async function init() {
    await Config.init("config.json", {
        "proto": "",
        "host": "",
        "path": "mock/api/feed.json",
        "static": 1,
        "debug": 2
    });

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));    

    addSearchElement();
    addSearchTerm();

    // dropSearchElement();

    initTools();
    initScroll()

    initEvents();

    // QueryModel.init();
    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;

    document.querySelector('.scroll-limit').textContent = maxScrollRecords;

    Logger.debug("call update from init!");
    Events.trigger.changeCategory({category});
    Events.trigger.queryUpdate();
}

// function definitions

// Signal helpers
function initEvents() {
    const evAnchor = document.querySelector("#zhaw-about");

    Events.init(evAnchor);
}

function initTools() {
    const evAnchor = document.querySelector(".navbar.navbar-right");
    const menuAnchor = document.querySelector(".menuoverlay");
    const menuTitle = menuAnchor.querySelector("#overlaytitle");
    const menuContent = menuAnchor.querySelector("#overlaycontent");

    const funcs = {
        "indexmatcher_menu": () => {Events.trigger.indexTermData(); Events.trigger.indexTermUpdate(QueryModel.query());},
        "bookmark_menu": Events.trigger.bookmarkData,
        "configure": () => {}
    };

    evAnchor.addEventListener("click", (ev) => {
        if (["indexmatcher_menu", "configure", "bookmark_menu"].includes(ev.target.id)) {
            const title = ev.target.dataset.title;
            const overlaySize = ev.target.dataset.size;
            const prevActive = evAnchor.querySelector(".active");
            const ttip = bootstrap.Tooltip.getInstance(ev.target);

            if (ttip) {
                ttip.hide()
            }

            ev.preventDefault();

            if (ev.target.parentNode.classList.contains("active")) {
                // close
                menuAnchor.setAttribute("hidden", "hidden");
                menuAnchor.classList.remove("mini");

                ev.target.parentNode.classList.remove("active")

                return;
            }

            if (prevActive) {
                prevActive.classList.remove("active");
                menuAnchor.classList.remove("mini");
            }

            if (overlaySize && overlaySize.length) {
                menuAnchor.classList.add(overlaySize);
            }

            ev.target.parentNode.classList.add("active");

            menuTitle.textContent = title;
            menuContent.textContent = "";

            menuAnchor.removeAttribute("hidden");

            // trigger event to load the content
            funcs[ev.target.id]();
        }
    });

    document.querySelectorAll(".navbar-left .cat.nav-link")
        .forEach((n) => n.addEventListener("click", handleCategoryChange));
}

function handleCategoryChange(ev) {
    const category = ev.currentTarget.dataset.category;

    ev.currentTarget
        .parentNode
        .querySelectorAll(".nav-link")
        .forEach((e) => e.classList.remove("active"));
    
    ev.currentTarget.classList.add("active");

    // Inform all models that changes are due
    Events.trigger.changeCategory({category});
    // once everything is set up, reload the data.
    Events.trigger.queryUpdate();
}

function initScroll() {
    const mainContent = document.querySelector("#mainarea");

    mainContent.addEventListener("scroll", (ev) => {

        const vpHeight = window.visualViewport.height;
        const height = mainContent.scrollHeight - vpHeight;
        const offset = mainContent.scrollTop;

        // Logger.debug(`${height} - ${offset}`);

        if ((height - offset) < scrollLimit) {
            if (!DataModel.is_complete() && DataModel.offset() < maxScrollRecords) {
                document.querySelector("#mainarea .intransit").removeAttribute("hidden");
            }

            if (DataModel.offset() < maxScrollRecords) {
                Events.trigger.moreData();
            }
        }
    });

}

// UI Usability functions 

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


function addQType(evt) {
    // console.log("click");
    if (evt.target.classList.contains("cat") || 
        evt.target.classList.contains("mark") ||
        evt.target.dataset.qtype) {
        console.log("got qtype");
        let target = evt.target;
        if (!(target.dataset.qtype && target.dataset.qtype.length)) {
            target = target.parentNode;
        }
        const type = target.dataset.qtype;
        let value = target.dataset.qvalue;

        console.log(`${type} -> ${value} `);
        Events.trigger.queryAddItem({type, value});            
    }
}

// search query functions 

function showQueryError(ev) {
    const searchTermElement = document.querySelector("#searchterms");
    
    searchTermElement.classList.add("error");            
            
    // tell the user that something is missing
    const tooltip = bootstrap.Tooltip.getOrCreateInstance(searchTermElement, {
       title: ev.detail.message,
       placement: "bottom",
       popperConfig: {
            placement: "bottom-start",                 
       }
    });

    tooltip.show();
}

function clearQueryError() {
    const searchTermElement = document.querySelector("#searchterms");
    
    searchTermElement.classList.remove("error");            
            
    // tell the user that something is missing
    const ttip = bootstrap.Tooltip.getInstance(searchTermElement);
    if (ttip) {
        ttip.dispose();
    }
}

// Self registering UI Events

function addSearchTerm() {
    const searchFormElement = document.querySelector("#liveinput");
    const searchFormButton = document.querySelector("#basic-addon2");
    const searchTermElement = document.querySelector("#searchterms");

    async function handleSubmit(evt) {
        var currentValue = searchTermElement.value.trim();
        
        Logger.debug(`click on ${evt.target.id}`);
    
        let [type, value] = currentValue.split(":").map(str => str.trim());

        let info = "";

        if (value === undefined) {
            // if no colon is in the current value, the query is definitely a term.
            type = "term";
            value = currentValue;   
        } 

        searchTermElement.classList.remove("error");
        bootstrap.Tooltip.getOrCreateInstance(searchTermElement).dispose();

        Events.trigger.queryAddItem({type, value});

        evt.preventDefault();
    }

    searchFormElement.addEventListener("submit", handleSubmit);
    searchFormButton.addEventListener("click", handleSubmit);
}

function addSearchElement() {
    const sidebarelement = document.querySelector(".widgets");
    
    sidebarelement.addEventListener("click", clearQueryError);

    sidebarelement.addEventListener("click", addQType);
    sidebarelement.addEventListener("click", foldResults);
    sidebarelement.addEventListener("click", clearSearch);
    sidebarelement.addEventListener("click", saveIndexQuery);
    sidebarelement.addEventListener("click", dropSearchElement);
    sidebarelement.addEventListener("click", editSearchElement);
    
    IndexOverlayView.init(sidebarelement);
    StatsView.init(sidebarelement);
}

function editSearchElement(evt) {
    if (!evt.target.classList.contains("searchoption")) {
        return;
    } 

    const targetParent = evt.target.parentNode;
    const type = targetParent.dataset.qtype;
    const value = targetParent.dataset.qvalue;

    if (type && (type === "sdg" || type === "department")) {
        return;
    }

    Events.trigger.queryDrop({type, value});
    const searchTermElement = document.querySelector("#searchterms");

    if (type === "term") {
        searchTermElement.value = `${value}`;
    }
    else {
        searchTermElement.value = `${type === "notterm" ? "not": type}:${value}`;
        searchTermElement.focus();
    }
}

function dropSearchElement(evt) {
    // const searchoptions = document.querySelector("#searchcontainer .searchoptions");
    if (!evt.target.classList.contains("optionclose")) {
        return;
    }

    Logger.debug("drop search element");

    const targetParent = evt.target.parentNode;
    const type = targetParent.dataset.qtype;
    
    const value = type === "sdg" ? 
                  Number(targetParent.dataset.qvalue) :
                  targetParent.dataset.qvalue;

    Events.trigger.queryDrop({type, value});
} 

function saveIndexQuery(ev) {
    if (ev.target.parentNode.id !== "savematcher") {
        return;
    }

    if (ev.target.classList.contains("part")) {
        Logger.debug("Incomplete Index Term. Nothing to do!");
        return;
    }

    Events.trigger.indexTermCreate(QueryModel.queryterms());
}

function clearSearch(ev) {
    if (
        ev.target.id !== "newsearch" && 
        ev.target.parentNode.id !== "newsearch" 
    ) {
        return;
    }
    
    document.querySelector('#searchcontainer .searchoptions').innerHTML = "";
    Events.trigger.queryClear();
} 


// QueryModel event handler

function handleQueryExtraUpdate(ev) {
    const searchterms = document.querySelector('#searchterms');

    if (searchterms.value.length) {
        extraterm = searchterms.value.trim();
    }

    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;

    Logger.debug("call extra update!");
    Events.trigger.queryUpdate({category});
} 

// QueryModel Support functions

// FIXME This should be part of the indexerModel.
function handleQueryUpdateIndex() {
    const menuitem = document.querySelector("#indexmatcher_menu");
    if(!menuitem.parentNode.classList.contains("active")) {
        return; 
    }

    Events.trigger.indexTermUpdate(QueryModel.query());
}

function handleQueryUpdate() {
    // trigger search request to the backend
    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;

    document.querySelector("#searchterms").value = "";

    document.querySelector("#mainarea").setAttribute("hidden", "hidden");
    document.querySelector("#warnings").removeAttribute("hidden", "hidden");
    document.querySelector("#no_data").setAttribute("hidden", "hidden");
    document.querySelector("#loading_data").removeAttribute("hidden", "hidden");
    document.querySelector("#mainarea .info").setAttribute("hidden", "hidden");
    
    // Events.trigger.queryUpdate({category});

    // DataModel.loadData(category, QueryModel.query()).then(() => Events.trigger.dataUpdate());
}

function renderSearchOptions() {
    const template = document.querySelector('#searchoption');
    const searchoptions = document.querySelector('#searchcontainer .searchoptions');

    searchoptions.innerHTML = ""; // delete all contents

    const iconClass = {
        notterm: "bi-slash-circle",
        lang: "bi-chat-dots",
        person: "bi-person-circle",
    };

    QueryModel.queryterms().forEach(term => {
        const result = template.content.cloneNode(true);
        const datafield = result.querySelector(".searchoption");

        datafield.parentNode.dataset.qtype = term.type;
        datafield.parentNode.dataset.qvalue = term.value;

        switch (term.type) {
            case "department":
            case "sdg":
                datafield.classList.add("marker");
                datafield.classList.add(`${term.type}_${term.value}`);
                break;
            default:
                if (Object.hasOwn(iconClass, term.type)) {
                    datafield.classList.add(iconClass[term.type]);
                }
                datafield.innerText = term.value;
                break;
        }

        searchoptions.appendChild(result);
    });
}

function handleDataUpdate(ev) {
    Logger.debug("data update");
    
    const targetsection = document.querySelector('.results');

    const section = document.querySelector('.nav-link.active');
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
   
    const template = document.querySelector('#resultcontainer');

    // Logger.debug(`update ${ category }`);

    DataModel.feed().reduce((section, object) => {
        const element = Object.keys(object).reduce((result, k) => {
            let sel = `.${k}`;

            if (k === "link") {
                [...(result.querySelectorAll(sel))].forEach(e => e.href = object[k]);
                return result;
            }

            if (typeof(object[k]) !== "object") {
                result.querySelector(sel).innerText = object[k];
                return result;
            }          

            let templateId = `#${sel.slice(1)}template`;

            if (["sdg", "department"].includes(k)) {
                templateId = "#cattemplate";
                sel = ".categories";
            }
            else if (k !== "authors") {
                templateId = `#listitemtemplate`;
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

    
    if (DataModel.is_complete() && DataModel.feed().length){ 
        document.querySelector("#mainarea .EOF").removeAttribute("hidden");
    }
    
    document.querySelector("#mainarea").removeAttribute("hidden", "hidden");
    document.querySelector("#warnings").setAttribute("hidden", "hidden");
    document.querySelector("#loading_data").setAttribute("hidden", "hidden");

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

function handleListElement(template) {
    return (a, e) => {
        const element = Object.keys(e).reduce((tmpl, k) => {
            const field = tmpl.querySelector(`.${k}`);
            const value = e[k];
            if (!field) {
                return tmpl;
            }

            if (k.startsWith("qvalue")) {
                field.dataset.qvalue = value;
                return tmpl;
            }

            if (k === "id") {
                field.classList.add(value);

                if ("qtype" in field.dataset && field.dataset.qtype.length === 0) {

                    const [qtype, qvalue] = value.split("_");

                    field.dataset.qtype = qtype;
                    field.dataset.qvalue = qvalue;
                }
                
                return tmpl;
            }

            if (k === "department") {
                field.querySelector(".id").classList.add(value.id)
            }

            field.innerHTML = value;
            return tmpl;
        }, template.content.cloneNode(true));

        a.appendChild(element);

        return a;
    };
}


function conditionalIndexButtonOff() {
    const button = document.querySelector("#savematcher .btn");

    if (!button.classList.contains("disabled")) {
        button.classList.add("disabled");
    }
    if (!button.classList.contains("btn-outline-secondary")) {
        button.classList.add("btn-outline-secondary");
    }
    button.classList.remove("btn-outline-success");
    button.classList.remove("btn-outline-danger");

    bootstrap.Tooltip.getOrCreateInstance(button).dispose();
}

function conditionalIndexButtonOn() {
    const button = document.querySelector("#savematcher .btn");

    button.classList.remove("disabled");
    button.classList.remove("part");
    button.classList.remove("btn-outline-secondary");
    if (!button.classList.contains("btn-outline-success")) {
        button.classList.add("btn-outline-success");
    }
    button.classList.remove("btn-outline-danger");

    button.setAttribute("title", "Save Index Match");

    bootstrap.Tooltip.getOrCreateInstance(button).dispose();
    bootstrap.Tooltip.getOrCreateInstance(button).show();
}

function conditionalIndexButtonPartial(ev) {
    const button = document.querySelector("#savematcher .btn");
    button.classList.remove("disabled");
    if (!button.classList.contains("part")) {
        button.classList.add("part");
    }
    button.classList.remove("btn-outline-secondary");
    button.classList.remove("btn-outline-success");
    
    if (!button.classList.contains("btn-outline-danger")) {
        button.classList.add("btn-outline-danger");
    }

    const details = ev.detail;

    button.setAttribute("title", `Add ${details.join(" and ")} to complete index match!` );
    bootstrap.Tooltip.getOrCreateInstance(button).dispose();
    bootstrap.Tooltip.getOrCreateInstance(button).show();
}
