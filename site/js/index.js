import * as DataModel from "./DataModel.mjs";
import * as StatsModel from "./StatsModel.mjs";
import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as QueryModel from "./QueryModel.mjs";
import * as IndexModel from "./IndexerModel.mjs";
import * as Events from "./Events.mjs";

// pull up the System with a basic configuration

Events.listen.queryUpdate(handleQueryUpdate);
Events.listen.queryUpdate(handleQueryUpdateIndex);
Events.listen.queryUpdate(requestQueryStats);

Events.listen.queryExtra(handleQueryExtraUpdate);
// Events.listen.queryAddItem(handleQueryAdd);
Events.listen.dataUpdate(handleDataUpdate);
Events.listen.statUpdate(handleStats);
Events.listen.bookmarkUpdate(() => {});

Events.listen.partialMatchingTerm(conditionalIndexButtonPartial);
Events.listen.fullMatchingTerm(conditionalIndexButtonOn);
Events.listen.invalidMatchingTerm(conditionalIndexButtonOff);

Events.listen.queryUpdate(renderSearchOptions);
Events.listen.indexTermData(renderIndexTerms);

Events.listen.queryError(showQueryError);

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

    initEvents();

    // QueryModel.init();
}

init().then(() => Events.trigger.queryUpdate());

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
    sidebarelement.addEventListener("click", handleIndexActivate);
    sidebarelement.addEventListener("click", handleIndexDelete);
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
        searchTermElement.value = `${type}:${value}`;
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

function liveQueryInput() {
    const searchTermElement = document.querySelector("#searchterms");

    searchTermElement.addEventListener("keyup", function(evt) {
        // TODO Trigger live querying
    });
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

function handleIndexActivate(ev) {
    if (!ev.target.parentNode.classList.contains("indexterm")) {
        return;
    }

    const idxid = ev.target.parentNode.id.replace("index-", "");

    IndexModel.getOneRecord(idxid);
}


function handleIndexDelete(ev) {
    if (!ev.target.classList.contains("bi-trash-fill")) {
        return;
    }

    const id = ev.target.parentNode.id.replace("index-","");

    Events.trigger.indexTermDelete(id);
}

// QueryModel event handler

function handleQueryExtraUpdate(ev) {
    const searchterms = document.querySelector('#searchterms');

    if (searchterms.value.length) {
        extraterm = searchterms.value.trim();
    }

    Events.trigger.queryUpdate();
} 

// QueryModel Support functions

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

function renderIndexTerms() {
    // only render if the index terms are shown.
    
    Logger.debug("render index terms");

    const menuitem = document.querySelector("#indexmatcher_menu");
    if(!menuitem.parentNode.classList.contains("active")) {
        return; 
    }    

    const templateList = document.querySelector("#templateIndexTerm");
    const templateQuery = document.querySelector("#searchoption");
    const container = document.querySelector("#overlaycontent");

    container.textContent = "";

    IndexModel.getRecords().forEach(
        (rec) => {
            const result = templateList.content.cloneNode(true);
            const lang = rec.qterms.filter(t => t.type === "lang").map(r => r.value).join("");
            const sdg = rec.qterms.filter(t => t.type === "sdg").map(r => r.value).pop();
            const terms = rec.qterms
                .filter(t => t.type === "term" || t.type === "notterm")
                .map(t => `${t.type === "notterm" ? "not:" : ""}${t.value}`)
                .join(", ");

            const sdgcls = `cat-${sdg < 10 ? "0" : ""}${sdg}`;

            result.querySelector(".indexterm").id = "index-" + rec.id;
            result.querySelector(".index-sdg").classList.add("mark");
            result.querySelector(".index-sdg").classList.add(sdgcls);
            result.querySelector(".index-lang").textContent = lang;
            result.querySelector(".index-query").textContent = terms;

            container.appendChild(result);
        }
    );
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
