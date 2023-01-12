import * as DataModel from "./DataModel.mjs";
import * as StatsModel from "./StatsModel.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";

const QueryModel = {
    qterms: [],
    extra: "",
    config: {}
}

// pull up the System with a basic configuration

async function init() {
    await Config.init("config.json", {
        "proto": "",
        "host": "",
        "path": "mock/api/feed.json",
        "static": 1,
        "debug": 2
    });

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
const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

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

        // special queries
        personUpdate: () => evAnchor.dispatchEvent(dataUpdatePerson),
        // Future function
        bookmarkUpdate: () => evAnchor.dispatchEvent(dataUpdateBookmark),

        // possibly obsolete
        pubUpdate: () => evAnchor.dispatchEvent(dataUpdatePub),
        projectUpdate: () => evAnchor.dispatchEvent(dataUpdatePrj),
        eduUpdate: () => evAnchor.dispatchEvent(dataUpdateEdu)
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
    // evAnchor.addEventListener("queryupdate", requestQueryFromServer);
    evAnchor.addEventListener("queryupdate", requestQueryStats);

    evAnchor.addEventListener("queryupdate.extra", handleQueryExtraUpdate);
    evAnchor.addEventListener("queryadd", handleQueryAdd);
    
    evAnchor.addEventListener("dataupdate", handleDataUpdate);
    evAnchor.addEventListener("dataupdate.stat", handleStats);
   
    // evAnchor.addEventListener("dataupdate", updaterEdu);
    // evAnchor.addEventListener("dataupdate", updaterProj);
    // evAnchor.addEventListener("dataupdate", updaterPubs);
    // evAnchor.addEventListener("dataupdate", updaterStat);
    // evAnchor.addEventListener("dataupdate", updaterPersons);

    evAnchor.addEventListener("dataupdate.bookmark", () => {});
}

// UI Usability functions 

function foldResults(evt) {
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
}


function addQType(evt) {
    // console.log("click");
    if (evt.target.classList.contains("cat") || 
        evt.target.classList.contains("mark") ||
        evt.target.dataset.qtype.length) {
        console.log("got qtype");
        let target = evt.target;
        if (!(target.dataset.qtype && target.dataset.qtype.length)) {
            target = target.parentNode;
        }
        const type = target.dataset.qtype;
        let value = target.dataset.qvalue;

        // console.log(`${type} -> ${value} `);
         
        if (type && value) {
            if (type === "sdg") {
                value = Number(value);
            }
            QueryModel.events.queryAddItem(type, value);            
        }
    }
}

function toggleResultDetails() {
    const e = document.querySelector('.results'); 

    e.addEventListener("click", foldResults);
    e.addEventListener("click", addQType);
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

        if (value === undefined) {
            // if no colon is in the current value, the query is definitely a term.
            type = "term";
            value = currentValue;   
        }  
        else {
            switch (type) {
                case "sdg": 
                case "person":
                    break;
                case "dept":
                case "department":
                    type = "department";
                    break;
                default: 
                    // if a colon is in the term, but the type is invalid, then the colon is 
                    // part of the term.
                    type = "term";
                    value = currentValue; 
                    break;
            }
        }

        // only add a term to the search if there is something to add
        // This can happen when a user enters a keyword and colon but enters otherwise nothing
        if (value.length) {
            QueryModel.events.queryAddItem(type, value);
        }

        evt.preventDefault();
    }

    searchFormElement.addEventListener("submit", handleSubmit);
    searchFormButton.addEventListener("click", handleSubmit);
}

function addSearchElement() {
    const sidebarelement = document.querySelector(".sidebar")
    
    sidebarelement.addEventListener("click", addQType);
}

function dropSearchElement() {
    const searchoptions = document.querySelector("#searchcontainer .searchoptions");

    searchoptions.addEventListener("click", function (evt) {
        if (evt.target.classList.contains("optionclose"))  {
            var targetParent = evt.target.parentNode;

            const type = targetParent.dataset.qtype;
            let value = targetParent.dataset.qvalue;

            if (type === "sdg") {
                value = Number(value);
            }

            console.log(`${type} :: ${value}`);
            console.log(QueryModel.qterms.map((term) => `${term.type} <-> ${term.value}`).join("; "));

            QueryModel.qterms = QueryModel.qterms.filter(term => !(term.type === type && term.value === value));

            QueryModel.events.queryUpdate();
        }
    });
} 

function liveQueryInput() {
    const searchTermElement = document.querySelector("#searchterms");

    searchTermElement.addEventListener("keyup", function(evt) {
        // TODO Trigger live querying
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
        Logger.debug("item exists");
        return; // item already exists
    }

    if (type === "sdg" && !(nValue >= 1 && nValue <= 16)) {
        Logger.debug("sdg out of bounds");
        return; // value out of bounds
    }

    if (type === "department" && !QueryModel.config.departments.includes(value)) {
        Logger.debug("dept out of bounds");
        return; // value out of bounds
    }

    QueryModel.qterms.push({type, value});

    QueryModel.query = collectQueryTerms(QueryModel.qterms);
    
    QueryModel.events.queryUpdate();
}

// QueryModel Support functions

function handleQueryUpdate(ev) {
    // trigger search request to the backend
    const section = document.querySelector('.nav-link.active');
    const category = section.parentElement.id.split("-").shift();
    DataModel.loadData(category, QueryModel.query).then(() => QueryModel.events.dataUpdate());
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

function handleDataUpdate() {
    Logger.debug("data update");
    
    const targetsection = document.querySelector('.results');

    const section = document.querySelector('.nav-link.active');
    const category = section.parentElement.id.split("-").shift();
   
    if (!["publications", "projects", "modules", "people"].includes(category)) {
        Logger.debug( "not in a data category. nothing to render");
        return;
    }

    // set the result type

    // when we get the first results of a fresh search, reset the results section
    // TODO Pagination
    targetsection.innerHTML = "";
    targetsection.dataset.resulttype = category;
   
    const template = document.querySelector('#resultcontainer');
    const authortemplate = document.querySelector('#resourceauthor');

    Logger.debug(`update ${ category }`);

    DataModel.feed(category).forEach((object) => {
        const result = template.content.cloneNode(true);
        result.querySelector(".pubtitle").innerText = object.title;
        result.querySelector(".year").innerText = object.year;
        result.querySelector(".tool.bi-download").href = object.link;
        result.querySelector(".categories").innerHTML = object.sdg.map(sdg => `<span class="mark cat-${sdg}" data-qtype="sdg" data-qvalue="${sdg}"></span>`).join(" ");
        result.querySelector(".extra.abstract").innerText= object.abstract;
        result.querySelector(".extra.pubtype").innerText= object.subtype.name;
        result.querySelector(".extra.keywords").innerText= object.keywords.map(k => k.name).join(", ");
        result.querySelector(".extra.classification").innerText= object.class.map(cls => `${cls.id}: ${cls.name}`).join(", ");

        const authorlist = result.querySelector(".authors");

        object.authors.forEach(author => {
            const authorTag = authortemplate.content.cloneNode(true);
            const personname = authorTag.querySelector(".name");
            personname.innerText = author.fullname;
            if (Object.hasOwn(object.persons, author.fullname)) {
                const person = object.persons[author.fullname];
                const dept  = person.department;
                const dmark = authorTag.querySelector(".mark");

                personname.dataset.qvalue = person.initials;
                
                dmark.classList.add(`cat-${ dept }`);
                dmark.dataset.qvalue = dept;

                authorTag.querySelector(".counter").innerText = "_";
                authorTag.querySelector(".affiliation").classList.remove("d-none");
            }
            authorlist.appendChild(authorTag);    
        });

        targetsection.appendChild(result);
    });
}   

function handleStats() {
    // display numbers
    const stats = StatsModel.getStats();

    // Logger.debug(`stats are: ${JSON.stringify(stats, null, "  ")}`)

    document.querySelector("#publication-counter").textContent =  stats.publications;
    document.querySelector("#project-counter").textContent = stats.projects;
    document.querySelector("#education-counter").textContent = stats.modules;
    document.querySelector("#people-counter").textContent = stats.people;

    stats.section.sdg
        .map(e => { 
            e.id = e.id.replace("sdg_", "cat-");
            return e;
        })
        .filter(e => e.id != "cat-17")
        .map(e => {
            e.id = e.id.replace(/-(\d)$/, "-0$1");
            return e;
        })
        .forEach((e) => {
            document.querySelector(`.cat.counter.${ e.id }`).textContent = e.n;
        });

    stats.section.department
        .map(e => {
            e.id = e.id.replace("department_", "cat-"); 
            return e;
        })
        .filter(e => !( ["cat-R", "cat-V"].includes(e.id) ))
        .forEach((e) => document.querySelector(`.cat.counter.${ e.id }`).textContent = e.n);
}

function requestQueryStats(ev) {
    // download numbers
    const section = document.querySelector('.nav-link.active');
    const category = section.parentElement.id.split("-").shift();
    StatsModel.loadData(category, QueryModel.query)
        .then(() => QueryModel.events.statUpdate())
}

// Query Model helper functions for preparing the GQL queries

function prefixAndQuote(value, prefix) {
    if (prefix) {
        value = prefix + value;
    }
    // else {
        value = JSON.stringify(value);
    // }
    return value;
}

function collectType(qterms, type) {
    const prefix = ["department", "sdg"].includes(type) ? type + "_" : "";
    
    return qterms
        .filter(i => i.type === type)
        .map(i => i.value)
        .map((val) => prefixAndQuote(val, prefix));
}

function collectQueryTerms(query) {
    return {
        sdgs:        collectType(query, "sdg"),
        departments: collectType(query, "department"),
        persons:     collectType(query, "person"),
        terms:       collectType(query, "term"),
    };
}
