import * as DataModel from "./DataModel.mjs";
import * as StatsModel from "./StatsModel.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as QueryModel from "./QueryModel.mjs";
import * as Events from "./Events.mjs";

// pull up the System with a basic configuration

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
    toggleResultDetails();

    clearSearch();
    dropSearchElement();

    initTools();

    initEvents();

    QueryModel.init();
}

init().then(() => Events.trigger.queryUpdate());

// function definitions

// Signal helpers
function initEvents() {
    const evAnchor = document.querySelector("#zhaw-about");

    Events.init(evAnchor);

    Events.listen.queryUpdate(handleQueryUpdate);
    Events.listen.queryUpdate(renderSearchOptions);
    Events.listen.queryUpdate(requestQueryStats);
    Events.listen.queryExtra(handleQueryExtraUpdate);
    // Events.listen.queryAddItem(handleQueryAdd);
    Events.listen.dataUpdate(handleDataUpdate);
    Events.listen.statUpdate(handleStats);
    Events.listen.bookmarkUpdate(() => {});

    Events.listen.queryError(showQueryError);
}

function initTools() {
    const evAnchor = document.querySelector(".navbar.navbar-right");
    const menuAnchor = document.querySelector(".menuoverlay");
    const menuTitle = menuAnchor.querySelector("#overlaytitle");
    const menuContent = menuAnchor.querySelector("#overlaycontent");

    evAnchor.addEventListener("click", (ev) => {
        if (["indexmatcher_menu", "configure", "bookmark_menu"].includes(ev.target.id)) {
            const title = ev.target.dataset.title;
            const prevActive = evAnchor.querySelector(".active");
            const ttip = bootstrap.Tooltip.getInstance(ev.target);
            
            if (ttip) {
                ttip.hide()
            }

            ev.stopPropagation();
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

            if (ev.target.id === "indexmatcher_menu") {
                menuAnchor.classList.add("mini");
            }

            ev.target.parentNode.classList.add("active");

            menuTitle.textContent = title;
            menuContent.textContent = "";

            menuAnchor.removeAttribute("hidden");

            // trigger event to load the content
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

function toggleResultDetails() {
    const e = document.querySelector('.results'); 

    e.addEventListener("click", foldResults);
    e.addEventListener("click", addQType);
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
    
    sidebarelement.addEventListener("click", addQType);
}

function dropSearchElement() {
    Logger.debug("drop search element");
    const searchoptions = document.querySelector("#searchcontainer .searchoptions");

    // should not reset the click handler
    searchoptions.addEventListener("click", function (evt) {
        var targetParent = evt.target.parentNode;
        
        const type = targetParent.dataset.qtype;
        let value = targetParent.dataset.qvalue;

        if (evt.target.classList.contains("optionclose"))  {
            if (type === "sdg") {
                value = Number(value);
            }

            Events.trigger.queryDrop({type, value});
        }
        else if (type && (type !== "sdg" || type !== "department")) {
            // remove the element from the query and place the term into the search
            Events.trigger.queryDrop({type, value});
            const searchTermElement = document.querySelector("#searchterms");

            if (type === "term") {
                searchTermElement.value = `${value}`;
            }
            else {
                searchTermElement.value = `${type}:${value}`;
            }
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
        Logger.debug("clearSearch");

        searchoptions.innerHTML = "";
        Events.trigger.queryClear();
    });
} 

// QueryModel event handler

function handleQueryExtraUpdate(ev) {
    const searchterms = document.querySelector('#searchterms');

    if (searchterms.value.length) {
        extraterm = searchterms.value.trim();
    }

    Events.trigger.queryUpdate();
} 

// function handleQueryAdd(ev) {
//     const type = ev.detail.type;
//     const value = ev.detail.value;
    
//     QueryModel.add({type, value});
// }

// QueryModel Support functions

function handleQueryUpdate(ev) {
    // trigger search request to the backend
    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;

    document.querySelector("#searchterms").value = "";

    document.querySelector("#mainarea").setAttribute("hidden", "hidden");
    document.querySelector("#warnings").removeAttribute("hidden", "hidden");
    document.querySelector("#no_data").setAttribute("hidden", "hidden");
    document.querySelector("#loading_data").removeAttribute("hidden", "hidden");
    
    DataModel.loadData(category, QueryModel.query()).then(() => Events.trigger.dataUpdate());
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
                datafield.classList.add(`cat-${term.value < 10 ? "0" : ""}${term.value}`);
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

function handleDataUpdate() {
    Logger.debug("data update");
    
    const targetsection = document.querySelector('.results');

    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;
   
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
        // Logger.debug(JSON.stringify(object, null, "  "));

        const result = template.content.cloneNode(true);

        result.querySelector(".pubtitle").innerText = object.title;
        result.querySelector(".year").innerText = object.year;
        [...(result.querySelectorAll(".tool.bi-download"))].forEach(e => e.href = object.link);
        
        result.querySelector(".categories").innerHTML = object.sdg.map(sdg => `<span class="mark cat-${sdg}" data-qtype="sdg" data-qvalue="${sdg}"></span>`).join(" ");
        result.querySelector(".extra.abstract").innerText= object.abstract;
        result.querySelector(".extra.pubtype").innerText= object.subtype.name;

        result.querySelector(".extra.keywords").innerText= object.keywords.map(k => k.name).join(", ");
        result.querySelector(".extra.classification").innerText= object.class.map(cls => `${cls.id}: ${cls.name}`).join(", ");

        const authorlist = result.querySelector(".authors");

        object.authors.forEach(author => {
            // Logger.debug(JSON.stringify(author, null, "  "));
            const authorTag = authortemplate.content.cloneNode(true);
            const personname = authorTag.querySelector(".name");
            personname.innerText = author.fullname;
            if (Object.hasOwn(author, "person") && author.person) {
                const person = author.person;
                const dept  = author.department;
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

    document.querySelector("#mainarea").removeAttribute("hidden", "hidden");
    document.querySelector("#warnings").setAttribute("hidden", "hidden");
    document.querySelector("#loading_data").setAttribute("hidden", "hidden");

    if (!DataModel.feed(category).length) {
        document.querySelector("#no_data").removeAttribute("hidden", "hidden");
        document.querySelector("#warnings").removeAttribute("hidden", "hidden");
    }
}   

function handleStats() {
    // display numbers
    const stats = StatsModel.getStats();

    // Logger.debug(`stats are: ${JSON.stringify(stats, null, "  ")}`)

    document.querySelector("#publication-counter").textContent =  stats.publications;
    document.querySelector("#project-counter").textContent = stats.projects;
    document.querySelector("#education-counter").textContent = stats.modules;
    document.querySelector("#people-counter").textContent = stats.people;
    document.querySelector("#peoplecountvalue").textContent = stats.section.contributors;

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

    // contributor list per section

    const template = document.querySelector("#contributorlistitem");
    const target = document.querySelector("#contributors .peopleinner");

    target.innerHTML = "";

    stats.section.person
        .map((p) => {
            p.department = p.department.id.replace("department_", "");
            return p;
        })
        .sort((a, b) => { 
            let c = b.n - a.n;
            if (c === 0) {
               c = a.fullname.toLowerCase().localeCompare(b.fullname.toLowerCase(), "de");
            }
            return c;
        })
        .forEach((p) => {
            const result = template.content.cloneNode(true);

            // result.querySelector(".person").dataset.qvalue = p.initials;
            const name = result.querySelector(".person .name");
            name.textContent = p.fullname;
            name.dataset.qvalue = p.initials;
            const initials = result.querySelector(".person .initials");
            initials.textContent = p.initials;
            initials.dataset.qvalue = p.initials;
            
            result.querySelector(".person .counter").textContent = p.n;
            
            const dnode = result.querySelector(".person .mark");

            dnode.classList.remove("cat-none");
            dnode.classList.add(`cat-${p.department}`);
            dnode.dataset.qvalue = p.department;
            
            target.appendChild(result);
        });
}

function requestQueryStats(ev) {
    // download numbers
    const section = document.querySelector('.nav-link.active');
    const category = section.dataset.category;

    Logger.debug(`active category: ${category}`);

    StatsModel.loadData(category, QueryModel.query())
        .then(() => Events.trigger.statUpdate())
}
