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

import { gql_query, gql_filter } from "./gql.mjs";

// pull up the System with a basic configuration

async function init() {
    const response = await fetch("config.json");
    const Config = await response.json();

    Config.api.baseurl = `${Config.api.host.length ? "https://" : ""}${Config.api.host.length ? (Config.api.host + "/"): ""}${Config.api.path}`;

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
    evAnchor.addEventListener("queryupdate", requestQueryFromServer);
    evAnchor.addEventListener("queryupdate", requestQueryStats);

    evAnchor.addEventListener("queryupdate.extra", handleQueryExtraUpdate);
    evAnchor.addEventListener("queryadd", handleQueryAdd);
    
    evAnchor.addEventListener("dataupdate", handleDataUpdate);
    evAnchor.addEventListener("dataupdate", updaterEdu);
    evAnchor.addEventListener("dataupdate", updaterProj);
    evAnchor.addEventListener("dataupdate", updaterPubs);
    evAnchor.addEventListener("dataupdate", updaterStat);
    evAnchor.addEventListener("dataupdate", updaterPersons);

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

    //RequestController.abort();

    const fetcher = QueryModel.qterms.length || QueryModel.extra.length ? dynamicQueryRequest : staticQueryRequest;

    // cancel _all_ previous requests
    fetcher().then(() => QueryModel.events.dataUpdate())
} 

async function dynamicQueryRequest() {
    await staticQueryRequest();
}

async function staticQueryRequest() {
    const { signal } = RequestController;
    DataModel.message = "";

    console.log(`get ${QueryModel.config.api.baseurl}/feed.json`);

    try {
        const response = await fetch(`${QueryModel.config.api.baseurl}/feed.json`, {signal});
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

function handleDataUpdate() {
    console.log("data update");
    if (DataModel.message.length){
        console.log(`${DataModel.message}`);
    }
}

function updaterStat() {
    if (!DataModel.feed.stat) {
        return;
    }
    
    [...document.querySelectorAll(".cat.counter")]
        .forEach(
            counter => counter.innerText = DataModel.feed.stat[counter.parentNode.dataset.qtype][counter.parentNode.dataset.qvalue]
        );
}

function updaterPubs() {
    if (!DataModel.feed.stat) {
        return;
    }

    const counter = document.querySelector('#publication-counter');
    counter.innerText = DataModel.feed.stat.publications;

    if (!counter.parentNode.classList.contains("active")) {
        return
    }

    const targetsection = document.querySelector('.results');

    if (!DataModel.feed.page || targetsection.dataset.resulttype !== "publication") {
        // when we get the first results of a fresh search, reset the results section
        targetsection.innerHTML = "";
        targetsection.dataset.resulttype = "publication"
    }
    
    const template = document.querySelector('#resultcontainer');
    const authortemplate = document.querySelector('#resourceauthor');

    DataModel.feed.publications.forEach(publication => {
        const result = template.content.cloneNode(true);
        result.querySelector(".pubtitle").innerText = publication.title;
        result.querySelector(".year").innerText = publication.year;
        result.querySelector(".tool.bi-download").href = publication.link;
        result.querySelector(".categories").innerHTML = publication.sdg.map(sdg => `<span class="mark cat-${Number(sdg) < 10 ? "0": ""}${sdg}"></span>`).join(" ");
        result.querySelector(".extra.abstract").innerText= publication.abstract;
        result.querySelector(".extra.pubtype").innerText= publication.type;
        result.querySelector(".extra.keywords").innerText= publication.keywords.join(", ");
        result.querySelector(".extra.classification").innerText= Object.getOwnPropertyNames(publication.class).map(id => `${id}: ${publication.class[id]}`).join(", ");

        const authorlist = result.querySelector(".authors");

        publication.authors.forEach(author => {
            const authorTag = authortemplate.content.cloneNode(true);
            authorTag.querySelector(".name").innerText = author;
            authorTag.querySelector(".counter").innerText = "0";

            // FIXME The following line should do a lookup into the peoples list
            authorTag.querySelector(".mark").classList.add(`cat-${publication.department[0]}`);

            authorlist.appendChild(authorTag);    
        })

        targetsection.appendChild(result);
    });
}

function updaterEdu() {
    if (!DataModel.feed.stat) {
        return;
    }
    
    const counter = document.querySelector('#education-counter');
    counter.innerText = DataModel.feed.stat.education;

    if (!counter.parentNode.classList.contains("active")) {
        return
    } 

    const targetsection = document.querySelector('.results');

    if (!DataModel.feed.page || targetsection.dataset.resulttype !== "education") {
        // when we get the first results of a fresh search, reset the results section
        targetsection.innerHTML = "";
        targetsection.dataset.resulttype = "education"
    }
}

function updaterProj() {
    if (!DataModel.feed.stat) {
        return;
    }
    
    const counter = document.querySelector('#project-counter');
    counter.innerText = DataModel.feed.stat.projects;

    if (!counter.parentNode.classList.contains("active")) {
        return
    }

    const targetsection = document.querySelector('.results');

    if (!DataModel.feed.page || targetsection.dataset.resulttype !== "projects") {
        // when we get the first results of a fresh search, reset the results section
        targetsection.innerHTML = "";
        targetsection.dataset.resulttype = "projects"
    }
}

function updaterPersons() {
    if (!DataModel.feed.stat) {
        return;
    }
    
    const counter = document.querySelector('#people-counter');
    counter.innerText = DataModel.feed.stat.people;

    if (!counter.parentNode.classList.contains("active")) {
        return
    }

    const targetsection = document.querySelector('.results');

    if (!DataModel.feed.page || targetsection.dataset.resulttype !== "people") {
        // when we get the first results of a fresh search, reset the results section
        targetsection.innerHTML = "";
        targetsection.dataset.resulttype = "people"
    }
}

function prefixAndQuote(value, prefix) {
    if (prefix) {
        value = prefix + value;
    }
    else {
        value = JSON.stringify(value);
    }
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

function requestQueryFromServer(ev) {
    const queryTerms = collectQueryTerms(QueryModel.qterms);

    const theQuery = gql_query("queryInfoObject");
    
    theQuery.subSelector("category", true)
            .selector("name")
            .filter()
            .attribute("name").in().condition("Publication");
    
    const pquery = theQuery.subSelector("persons", queryTerms.persons.length > 0)
    .selector([
        "fullname", "initials", "title", "mail", 
        "ipphone", "gender", "team { name }"
    ]);

    pquery.subSelector("department").selector("id");

    const personFilter = pquery.filter();

    if (queryTerms.persons.length) {
        personFilter.attribute("initials").in().condition(queryTerms.persons);
    }
    else {
        personFilter.has("department");
    }

    theQuery
        .selector([
            "title", "year", "abstract", "language", "link", "extras"
        ]);

    theQuery.subSelector("persons").alias("authors").selector("fullname");
    theQuery.subSelector("sdgs").alias("sdg").selector("id");
    theQuery.subSelector("departments").alias("dept").selector("id");

    theQuery.subSelector("class").selector([ "id", "name" ]);
    theQuery.subSelector("subtype").selector([ "name" ]);
    theQuery.subSelector("keywords").selector([ "name" ]);
    
    if (queryTerms.sdgs.length) {
        theQuery.subSelector("sdgs", true).selector("id").filter().attribute("id").in().condition(queryTerms.sdgs);
    }

    if (queryTerms.departments.length) {
        theQuery.subSelector("departments", true).selector("id").filter().attribute("id").in().condition(queryTerms.sdgs);
    }

    if (queryTerms.terms.length) {
        const termFilter = theQuery.filter().or();
        [ "title", "abstract" ].forEach((fld) => {
            termFilter.attribute(fld).alloftext().condition(queryTerms.terms);
        });
    }

    const queryString = `{ ${theQuery.stringify()} }`;

    console.log(queryString);
}

function requestQueryStats(ev) {
    const queryTerms = collectQueryTerms(QueryModel.qterms);
}