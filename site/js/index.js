// stub to be filled with our service interactions

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

const resultsEntries = document.querySelectorAll('.resultcontainer')
const resultTriggers = [...resultsEntries].map(toggleResultDetails)


function toggleResultDetails(e) {
    const toggleElements = e.querySelectorAll("[hidden]")

    e.addEventListener("click", function (evt) {
        if (evt.target.classList.contains("resultfold")) {
            evt.target.classList.toggle("bi-layer-backward");
            evt.target.classList.toggle("bi-layer-forward");
            [...toggleElements].map(togglable => togglable.hidden = !togglable.hidden)
        }
    })
} 