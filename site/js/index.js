// stub to be filled with our service interactions

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// interaction event registration

toggleResultDetails();

addSearchElement();
addSearchTerm();

clearSearch();
dropSearchElement();

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

            const depts = ["A", "G", "L", "N", "P", "S", "T", "W"];
        
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
        // FIXME drop all entries from the search and display the default results
    });
} 
