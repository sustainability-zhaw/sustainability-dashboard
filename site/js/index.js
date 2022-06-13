// stub to be filled with our service interactions

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

toggleResultDetails(document.querySelector('.results'));
dropSearchElement(document.querySelector('.searchoptions'));
clearSearch(document.querySelector('#newsearch'));
addSearchElement(document.querySelector(".sidebar"));

function toggleResultDetails(e) {

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

function dropSearchElement(searchoptions) {
    searchoptions.addEventListener("click", function (evt) {

        var targetParent = evt.target.parentNode.parentNode;

        if (evt.target.classList.contains("optionclose"))  {
            targetParent.parentNode.removeChild(targetParent);

            // FIXME drop also the entry from the search record.
            // FIXME query the search results
        }
    });
} 

function addSearchElement(sidebarelement) {
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

function clearSearch(searchoptions) {
    searchoptions.addEventListener("click", function (evt) {
        [...searchEntries].map(
            opts => {
                while (opts.firstChild) {
                    opts.removeChild(opts.firstChild);
                }
            }
        );

        // FIXME drop all entries from the search and display the default results
    });
} 
