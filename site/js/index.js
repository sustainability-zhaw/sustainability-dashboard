const QueryModel = {
    qterms: [],
    extra: "",
    config: {}
}

const DataModel = {
    feed: {},
    message: ""
}

const RequestController = new AbortController();

// pull up the System with a basic configuration

async function init() {
    const response = await fetch("/config.json");
    const Config = await response.json();

    Config.api.baseurl = `${Config.api.host.length ? "https://" : ""}${Config.api.host.length ? Config.api.host : ""}/${Config.api.path}`;

    addSearchElement();
    addSearchTerm();
    toggleResultDetails();

    clearSearch();
    dropSearchElement();

    registerModelEvents();

    QueryModel.config = Config;
    QueryModel.events = initEventTrigger();
}

init().then(() => QueryModel.events.queryUpdate());

// stub for Bootstrap Tooltips

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// function definitions

// Signal helpers
function initEventTrigger() {
    const evAnchor = document.querySelector("#zhaw-about");

    const queryUpdate        = new CustomEvent("queryupdate", {});
    const queryExtraUpdate   = new CustomEvent("queryupdate.extra", {});

    const dataUpdate         = new CustomEvent("dataupdate", {});
    const dataUpdateStat     = new CustomEvent("dataupdate.stat", {});
    const dataUpdatePerson   = new CustomEvent("dataupdate.person", {});
    const dataUpdatePub      = new CustomEvent("dataupdate.publication", {});
    const dataUpdateEdu      = new CustomEvent("dataupdate.education", {});
    const dataUpdatePrj      = new CustomEvent("dataupdate.project", {});
    const dataUpdateBookmark = new CustomEvent("dataupdate.bookmark", {});

    const triggers = {
        queryUpdate: () => evAnchor.dispatchEvent(queryUpdate),
        queryExtra: () => evAnchor.dispatchEvent(queryExtraUpdate),

        queryAddItem: (type, value) => evAnchor.dispatchEvent(new CustomEvent("queryadd", {detail: {type, value}})),

        dataUpdate: () => evAnchor.dispatchEvent(dataUpdate),
        
        statUpdate: () => evAnchor.dispatchEvent(dataUpdateStat),
        pubUpdate: () => evAnchor.dispatchEvent(dataUpdatePub),
        projectUpdate: () => evAnchor.dispatchEvent(dataUpdatePrj),
        eduUpdate: () => evAnchor.dispatchEvent(dataUpdateEdu),
        personUpdate: () => evAnchor.dispatchEvent(dataUpdatePerson),
        bookmarkUpdate: () => evAnchor.dispatchEvent(dataUpdateBookmark)
    };
    
    // prevent from accidental dynamic changes
    return Object.freeze(triggers);
}

function addModelHandler(event, handler) {
    const evAnchor = document.querySelector("#zhaw-about");
    evAnchor.addEventListener(event, handler);
}

function registerModelEvents() {
    const evAnchor = document.querySelector("#zhaw-about");

    evAnchor.addEventListener("queryupdate", handleQueryUpdate);
    evAnchor.addEventListener("queryupdate", renderSearchOptions);

    evAnchor.addEventListener("queryupdate.extra", handleQueryExtraUpdate);
    evAnchor.addEventListener("queryadd", handleQueryAdd);
    
    evAnchor.addEventListener("dataupdate", () => {});
    evAnchor.addEventListener("dataupdate.stat", () => {});
    evAnchor.addEventListener("dataupdate.publication", () => {});
    evAnchor.addEventListener("dataupdate.project", () => {});
    evAnchor.addEventListener("dataupdate.education", () => {});
    evAnchor.addEventListener("dataupdate.person", () => {});
    evAnchor.addEventListener("dataupdate.bookmark", () => {});
}

// UI Usability functions 

function toggleResultDetails() {
    const e = document.querySelector('.results'); 

    e.addEventListener("click", function (evt) {
        const targetParent = evt.target.parentNode.parentNode;

        if (evt.target.classList.contains("resultfold")) {
            const toggleElements = targetParent.querySelectorAll(".extra");

            evt.target.classList.toggle("bi-layer-backward");
            evt.target.classList.toggle("bi-layer-forward");
            [...toggleElements].map(togglable => togglable.hidden = !togglable.hidden);

            if (evt.target.classList.contains("bi-layer-backward")) {
                evt.target.setAttribute("data-bs-original-title", "Show Details");
            }
            else {
                evt.target.setAttribute("data-bs-original-title", "Hide Details");
            }
        }
    });
} 

// search query functions 

// Self registering UI Events

function addSearchTerm() {
    const searchFormElement = document.querySelector("#liveinput");
    const searchFormButton = document.querySelector("#basic-addon2");
    const searchTermElement = document.querySelector("#searchterms");

    function handleSubmit(evt) {
        var currentValue = searchTermElement.value.trim();
        searchTermElement.value = "";
    
        let [type, value] = currentValue.split(":").map(str => str.trim());

        switch (type) {
            case "sdg": 
            case "person":
                break;
            case "dept":
            case "department":
                type = "department";
                break;
            default: 
                type = "term";
                value = currentValue; 
                break;
        }

        QueryModel.events.queryAddItem(type, value);

        evt.preventDefault();
    }

    searchFormElement.addEventListener("submit", handleSubmit);
    searchFormButton.addEventListener("click", handleSubmit);
}

function addSearchElement() {
    const sidebarelement = document.querySelector(".sidebar")
    
    sidebarelement.addEventListener("click", function(evt) {
        if (evt.target.classList.contains("cat")) {
            let target = evt.target;
            if (!(target.dataset.qtype && target.dataset.qtype.length)) {
                target = target.parentNode;
            }
            const type = target.dataset.qtype;
            const value = target.dataset.qvalue;

            QueryModel.events.queryAddItem(type, value);            
        }
    });
}

function dropSearchElement() {
    const searchoptions = document.querySelector("#searchcontainer .searchoptions");

    searchoptions.addEventListener("click", function (evt) {
        if (evt.target.classList.contains("optionclose"))  {
            var targetParent = evt.target.parentNode;

            const type = targetParent.dataset.qtype;
            const value = targetParent.dataset.qvalue;

            QueryModel.qterms = QueryModel.qterms.filter(term => !(term.type === type && term.value === value));

            QueryModel.events.queryUpdate();
        }
    });
} 

function liveQueryInput() {
    const searchTermElement = document.querySelector("#searchterms");

    searchTermElement.addEventListener("keyup", function(evt) {

    });
} 

function clearSearch() {
    const newsearch = document.querySelector('#newsearch');
    const searchoptions = document.querySelector('#searchcontainer .searchoptions');
    const searchEntries = document.querySelector(".searchoptions");

    newsearch.addEventListener("click", function (evt) {
        searchoptions.innerHTML = "";
        QueryModel.qterms = [];

        QueryModel.events.queryUpdate();
    });
} 

// QueryModel event handler

function handleQueryExtraUpdate(ev) {
    const searchterms = document.querySelector('#searchterms');

    if (searchterms.value.length) {
        QueryModel.extra = searchterms.value.trim();
    }

    QueryModel.events.queryUpdate();
} 

function handleQueryAdd(ev) {
    const type = ev.detail.type;
    const value = ev.detail.value;
    const nValue = Number(value);

    if (QueryModel.qterms.filter(obj => obj.type === type && obj.value === value).length) {
        console.log("item exists");
        return; // item already exists
    }

    if (type === "sdg" && !(nValue >= 1 && nValue <= 16)) {
        console.log("sdg out of bounds");
        return; // value out of bounds
    }

    if (type === "depatment" && !QueryModel.config.departments.includes(value)) {
        console.log("dept out of bounds");
        return; // value out of bounds
    }

    QueryModel.qterms.push({type, value});

    
    QueryModel.events.queryUpdate();
}

// QueryModel Support functions

function handleQueryUpdate(ev) {
    // trigger search request to the backend
    console.log("Query Update");

    const fetcher = QueryModel.qterms.length || QueryModel.extra.length ? dynamicQueryRequest : staticQueryRequest;

    // cancel _all_ previous requests
    RequestController.abort();
    fetcher().then(() => QueryModel.events.dataUpdate())
} 

async function dynamicQueryRequest() {
    await staticQueryRequest();
}

async function staticQueryRequest() {
    const { signal } = RequestController;
    DataModel.message = "";

    const response = await fetch(QueryModel.config.api.baseurl, {signal});

    try {
        DataModel.feed = await response.json();
    }
    catch (err) {
        DataModel.feed = {};
        DataModel.message = err.message;
    }
}

function renderSearchOptions() {
    const template = document.querySelector('#searchoption');
    const searchoptions = document.querySelector('#searchcontainer .searchoptions');

    searchoptions.innerHTML = ""; // delete all contents

    QueryModel.qterms.forEach(term => {
        const result = template.content.cloneNode(true);
        const datafield = result.querySelector(".searchoption");

        datafield.parentNode.dataset.qtype = term.type;
        datafield.parentNode.dataset.qvalue = term.value;

        switch (term.type) {
            case "department":
            case "sdg":
                datafield.classList.add("marker");
                datafield.classList.add(`cat-${Number(term.value) < 10 ? "0" : ""}${term.value}`);
                break;
            case "person": 
                datafield.classList.add("bi-person-circle");
            default:
                datafield.innerText = term.value;
                break;
        }

        searchoptions.appendChild(result);
    });
}
