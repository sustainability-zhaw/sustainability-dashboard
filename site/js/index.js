// stub to be filled with our service interactions

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// interaction event registration

toggleResultDetails();

addSearchElement();
addSearchTerm();

clearSearch();
dropSearchElement();

// model communication registration
const depts = ["A", "G", "L", "N", "P", "S", "T", "W"];

const ModelEvents = initEventTrigger();

registerModelEvents();

// function definitions

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

function dropSearchElement() {
    const searchoptions = document.querySelector('.searchoptions');

    searchoptions.addEventListener("click", function (evt) {
        var targetParent = evt.target.parentNode.parentNode;

        if (evt.target.classList.contains("optionclose"))  {
            targetParent.parentNode.removeChild(targetParent);

            // FIXME drop also the entry from the search record.
            // FIXME query the search results
            ModelEvents.queryUpdate();
        }
    });
} 

function addSearchTerm() {
    const searchFormElement = document.querySelector("#liveinput");
    const searchFormButton = document.querySelector("#basic-addon2");
    const searchTermElement = document.querySelector("#searchterms");

    const template = document.querySelector('#searchoption');
    const searchoptions = document.querySelector('#searchcontainer .searchoptions');

    function handleSubmit(evt) {
        const result = template.content.cloneNode(true);
        const datafield = result.querySelector(".searchoption");

        var currentValue = searchTermElement.value.trim();
        searchTermElement.value = "";

        var existingQuery = [...searchoptions.querySelectorAll(".searchoption")].filter(
            element => element.innerText == currentValue && !element.classList.contains("bi-person-circle")
        );

        if (currentValue.startsWith("sdg:")) {
            currentValue = currentValue.replace("sdg:", "").trim()

            const sdg = parseInt(currentValue);

            if (sdg >= 1 && sdg <= 16) {
                datafield.classList.add("marker");

                currentValue = `cat-${sdg < 10 ? "0" : ""}${sdg}`;

                datafield.classList.add(currentValue);

                existingQuery = [...searchoptions.querySelectorAll(".searchoption")].filter(element => 
                    element.classList.contains(currentValue)
                );
            }
            else {
                // make existing query long.
                existingQuery = [1];
            }

            currentValue = "";
        }

        if (currentValue.startsWith("dept:") || currentValue.startsWith("department:") ) {
            currentValue = currentValue.toLowerCase().replace(/^dep(?:artmen)?t:/, "").trim().toUpperCase();
        
            if (depts.includes(currentValue)) {
                currentValue = `cat-${currentValue}`;

                datafield.classList.add("marker");
                datafield.classList.add(currentValue);

                existingQuery = [...searchoptions.querySelectorAll(".searchoption")].filter(element => 
                    element.classList.contains(currentValue)
                );
            }
            else {
                // make existing query long.
                existingQuery = [1];
            }

            currentValue = "";
        }

        if (currentValue.startsWith("person:")) {
            currentValue = currentValue.replace("person:", "").trim()
            datafield.classList.add("bi-person-circle");
            
            existingQuery = [...searchoptions.querySelectorAll(".searchoption")].filter(element => 
                element.innerText == currentValue && element.classList.contains("bi-person-circle")
            );
        }

        datafield.innerText = currentValue;      
        
        
        if (!existingQuery.length) {
            searchoptions.appendChild(result);
            ModelEvents.queryUpdate();
        }

        evt.preventDefault();
    }

    searchFormElement.addEventListener("submit", handleSubmit);
    searchFormButton.addEventListener("click", handleSubmit);
}

function liveQueryInput() {
    const searchTermElement = document.querySelector("#searchterms");

    searchTermElement.addEventListener("keyup", function(evt) {

    });
} 

function addSearchElement() {
    const sidebarelement = document.querySelector(".sidebar")
    const template = document.querySelector('#searchoption');
    const searchoptions = document.querySelector('#searchcontainer .searchoptions');

    sidebarelement.addEventListener("click", function(evt) {
        if (evt.target.classList.contains("cat")) {
            console.log("click on cat element");

            const result = template.content.cloneNode(true);
            const target_class = [...evt.target.classList].filter(cls => cls.startsWith("cat-"))[0];
            const elementSearchoption = result.querySelector(".searchoption");

            elementSearchoption.classList.add("marker");
            elementSearchoption.classList.add(target_class);

            if (!searchoptions.querySelector(`.${target_class}`)) {
                searchoptions.appendChild(result);

                ModelEvents.queryUpdate();
            }
        }
    });
}

function clearSearch() {
    const searchoptions = document.querySelector('#newsearch');
    const searchEntries = document.querySelector(".searchoptions");

    searchoptions.addEventListener("click", function (evt) {
        while (searchEntries.firstChild) {
            searchEntries.removeChild(searchEntries.firstChild);
        }

        ModelEvents.queryUpdate();
    });
} 

// Model Events

const queryUpdate        = new CustomEvent("queryupdate", {});
const queryExtraUpdate        = new CustomEvent("queryupdate.extra", {});

const dataUpdate         = new CustomEvent("dataupdate", {});
const dataUpdateStat     = new CustomEvent("dataupdate.stat", {});
const dataUpdatePerson   = new CustomEvent("dataupdate.person", {});
const dataUpdatePub      = new CustomEvent("dataupdate.publication", {});
const dataUpdateEdu      = new CustomEvent("dataupdate.education", {});
const dataUpdatePrj      = new CustomEvent("dataupdate.project", {});
const dataUpdateBookmark = new CustomEvent("dataupdate.bookmark", {});

function initEventTrigger() {
    const evAnchor = document.querySelector("#zhaw-about");

    const triggers = {
        queryUpdate: () => evAnchor.dispatchEvent(queryUpdate),
        dataUpdate: () => evAnchor.dispatchEvent(dataUpdate),
        
        statUpdate: () => evAnchor.dispatchEvent(dataUpdateStat),
        pubUpdate: () => evAnchor.dispatchEvent(dataUpdatePub),
        projectUpdate: () => evAnchor.dispatchEvent(dataUpdatePrj),
        eduUpdate: () => evAnchor.dispatchEvent(dataUpdateEdu),
        personUpdate: () => evAnchor.dispatchEvent(dataUpdatePerson),
        bookmarkUpdate: () => evAnchor.dispatchEvent(dataUpdateBookmark),
    };
    
    // prevent from accidental dynamic changes
    return Object.freeze(triggers);
}

function registerModelEvents() {
    const evAnchor = document.querySelector("#zhaw-about");

    evAnchor.addEventListener("queryupdate", handleQueryUpdate);
    evAnchor.addEventListener("queryupdate.extra", handleQueryExtraUpdate);
    
    evAnchor.addEventListener("dataupdate", () => {});
    evAnchor.addEventListener("dataupdate.stat", () => {});
    evAnchor.addEventListener("dataupdate.publication", () => {});
    evAnchor.addEventListener("dataupdate.project", () => {});
    evAnchor.addEventListener("dataupdate.education", () => {});
    evAnchor.addEventListener("dataupdate.person", () => {});
    evAnchor.addEventListener("dataupdate.bookmark", () => {});
}

const QueryModel = {
    extra: "",
    category: [],
    department: [],
    person: [],
    term: []
}

function handleQueryUpdate(ev) {
    const searchoptions = [... document.querySelectorAll('#searchcontainer .searchoptions .searchoption')];
    const searchterms = document.querySelector('#searchterms');

    QueryModel.extra = "";
    QueryModel.category = [];
    QueryModel.department = [];
    QueryModel.person = [];
    QueryModel.term = [];

    if (searchoptions && searchoptions.length) {
        searchoptions.forEach(option => {
            // option.classList.contains("marker") ? 
            if (option.classList.contains("marker")) {
                // TODO we better use data attributes for this purpose
                const catid = option.classList.item(option.classList.length - 1).replace("cat-", "");
                if (depts.includes(catid)) {
                    QueryModel.department.push(catid);
                }
                else {
                    QueryModel.category.push(catid);
                }
            }
            else if ( option.classList.contains("bi-person-circle")) {
                QueryModel.person.push(option.innerText.trim());
            } 
            else {
                QueryModel.term.push(option.innerText.trim());
            }
        })
    }

    if (searchterms.value.length) {
        QueryModel.extra = searchterms.value.trim();
    }

    // trigger search request
} 

function handleQueryExtraUpdate(ev) {
    const searchterms = document.querySelector('#searchterms');

    if (searchterms.value.length) {
        QueryModel.extra = searchterms.value.trim();
    }

    // trigger search request 
} 
