import * as Events from "../Events.mjs";
// import * as Logger from "../Logger.mjs";

import * as StatsModel from "../models/Stats.mjs";

Events.listen.statUpdate(handleStats);
Events.listen.statMainUpdate(handleOverviewStats);
Events.listen.statPeopleUpdate(handlePeopleStats);

export function init(target) {}

function handleOverviewStats() {
    const stats = StatsModel.getOverviewStats();

    document.querySelector("#publication-counter").textContent =  stats.publications;
    document.querySelector("#project-counter").textContent = stats.projects;
    document.querySelector("#education-counter").textContent = stats.modules;
    document.querySelector("#people-counter").textContent = stats.people;
}

function handleStats() {
    // display numbers
    const stats = StatsModel.getStats();

    // Logger.debug(`stats are: ${JSON.stringify(stats, null, "  ")}`)

    stats.sdg
        .filter(e => e.id != "sdg_17")
        .forEach((e) => {
            document.querySelector(`.cat.counter.${ e.id }`).textContent = e.n
        });

    stats.department
        .filter(e => !( ["department_R", "department_V"].includes(e.id) ))
        .forEach((e) => document.querySelector(`.cat.counter.${ e.id }`).textContent = e.n);
}

function handlePeopleStats() {
    // display numbers
    const ccount = StatsModel.getContributors();
    document.querySelector("#peoplecountvalue").textContent = ccount;

    const stats = StatsModel.getPeopleStats();
    const template = document.querySelector("#contributorlistitem");
    const target = document.querySelector("#contributors .peopleinner");

    target.innerHTML = "";
    target.scrollTop = 0;

    stats
        .sort((a, b) => { 
            let c = b.n - a.n;
            if (c === 0) {
               c = a.displayname.toLowerCase().localeCompare(b.displayname.toLowerCase(), "de");
            }
            return c;
        })
        .forEach((p) => {
            const result = template.content.cloneNode(true);

            // result.querySelector(".person").dataset.qvalue = p.initials;
            const name = result.querySelector(".person .name");
            name.textContent = `${p.surname}, ${p.givenname}`;
            name.dataset.qvalue = p.initials;
            const initials = result.querySelector(".person .initials");
            initials.textContent = p.initials;
            initials.dataset.qvalue = p.initials;
            
            result.querySelector(".person .counter").textContent = p.n;
            
            const dnode = result.querySelector(".person .mark");

            dnode.classList.remove("cat-none");
            dnode.classList.add(p.department.id);
            dnode.dataset.qvalue = p.department.id.replace("department_", "");
            
            target.appendChild(result);
        });
}
