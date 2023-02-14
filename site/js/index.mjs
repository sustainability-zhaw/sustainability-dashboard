// more modules
import * as Events from "./Events.mjs";
import * as Config from "./models/Config.mjs";
import * as Logger from "./Logger.mjs";

// models
// import * as StatsModel from "./StatsModel.mjs";
import * as QueryModel from "./models/Query.mjs";
// import * as IndexModel from "./IndexerModel.mjs";

// views
import * as IndexOverlayView from "./views/indexterms.mjs";
import * as StatsView from "./views/stats.mjs";
import * as RecordsView from "./views/records.mjs";

// pull up the System with a basic configuration
Events.listen.queryUpdate(handleQueryUpdate);
Events.listen.queryUpdate(handleQueryUpdateIndex);

Events.listen.queryExtra(handleQueryExtraUpdate);

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
    RecordsView.init();
    // initScroll()

    initEvents();

    

    // QueryModel.init();
    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;


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

    const mainArea = document.querySelector("#mainarea");

    const funcs = {
        "indexmatcher_menu": () => {
            Events.trigger.indexTermData(); 
            // Events.trigger.queryUpdate(); 
            Events.trigger.indexTermUpdate(QueryModel.query());

            if (!mainArea.classList.contains("indexterms")) {
                mainArea.classList.add("indexterms");
            }
        },
        "bookmark_menu": Events.trigger.bookmarkData,
        "configure": () => {}
    };

    const closeFuncs = {
        "indexmatcher_menu": () => {
            Events.trigger.queryUpdate();
        }
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
            mainArea.classList.remove("indexterms");

            if (ev.target.parentNode.classList.contains("active")) {
                // close the same menu
                menuAnchor.setAttribute("hidden", "hidden");
                menuAnchor.classList.remove("mini");

                ev.target.parentNode.classList.remove("active");

                closeFuncs[ev.target.id]?.();
                return;
            }

            if (prevActive) {
                prevActive.classList.remove("active");
                menuAnchor.classList.remove("mini");
                closeFuncs[prevActive.id]?.();
            }

            if (overlaySize && overlaySize.length) {
                menuAnchor.classList.add(overlaySize);
            }

            ev.target.parentNode.classList.add("active");

            menuTitle.textContent = title;
            menuContent.textContent = "";

            menuAnchor.removeAttribute("hidden");

            // trigger event to load the content
            funcs[ev.target.id]?.();
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

// UI Usability functions 

function addQType(evt) {
    // console.log("click");
    if (evt.target.classList.contains("cat") || 
        evt.target.classList.contains("mark") ||
        evt.target.dataset.qtype) {
        // console.log("got qtype");
        let target = evt.target;
        if (!(target.dataset.qtype && target.dataset.qtype.length)) {
            target = target.parentNode;
        }
        const type = target.dataset.qtype;
        let value = target.dataset.qvalue;

        // console.log(`${type} -> ${value} `);
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
