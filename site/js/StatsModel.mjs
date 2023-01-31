import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Filter from "./DqlFilter.mjs";
import * as Events from "./Events.mjs";
import * as QueryModel from "./QueryModel.mjs";

const StatsObject = {
    stats: {},
    overview: {},
    people: [],
    contributors: 0,
    category: ""
};

const RequestController = new AbortController();

function initBaseStatsUri() {
    const buri = Config.get("staturi");

    if (buri && buri.length) {
        Logger.debug("got staturi");
        return buri;
    }

    // Logger.debug("STATS prepare baseuri");

    const proto = Config.get("proto") || "https://",
          host  = Config.get("host") || "",
          path  = Config.get("stats") || "";

    const baseuri = `${host.length ? proto : ""}${host}${(host.length && host.at(-1) !== "/") ? "/" : ""}${path}`

    // Logger.debug("STATS set stats baseuri to " + baseuri);

    Config.set("staturi", baseuri);

    return baseuri;
}

export function getOverviewStats() {
    return StatsObject.overview;
}

export function getStats() {
    return StatsObject.stats;
}

export function getPeopleStats() {
    if (!StatsObject.people) {
        return [];
    }
    return StatsObject.people;
}

export function getPersonStats(initials) {
    if (!StatsObject.people) {
        return 0;
    }
    return StatsObject.people.filter(o => o.initials === initials)[0];
}

export function getContributors() {
    return StatsObject.contributors;
}

Events.listen.queryUpdate(handleLoadData);
Events.listen.queryUpdate(handlePeopleData);
Events.listen.queryUpdate(handleOverviewLoadData);
Events.listen.changeCategory(categoryChange);

function categoryChange(ev) {
    StatsObject.category = ev.detail.category;
}

async function handleLoadData(ev) {
    // RequestController.abort();
    Logger.debug("load stats");
    await loadData(StatsObject.category, QueryModel.query());
    Events.trigger.statUpdate();
}

async function loadData(category, queryObj) {
    let body  = Filter.statQuery(category, queryObj);

    const data = await fetchData(body);

    StatsObject.stats =  {
        sdg: [
            { id: "sdg_1", n: 0 },
            { id: "sdg_2", n: 0 },
            { id: "sdg_3", n: 0 },
            { id: "sdg_4", n: 0 },
            { id: "sdg_5", n: 0 },
            { id: "sdg_6", n: 0 },
            { id: "sdg_7", n: 0 },
            { id: "sdg_8", n: 0 },
            { id: "sdg_9", n: 0 },
            { id: "sdg_10", n: 0 },
            { id: "sdg_11", n: 0 },
            { id: "sdg_12", n: 0 },
            { id: "sdg_13", n: 0 },
            { id: "sdg_14", n: 0 },
            { id: "sdg_15", n: 0 },
            { id: "sdg_16", n: 0 }
        ],
        department: [
            { id: "department_A", n: 0 },
            { id: "department_G", n: 0 },
            { id: "department_L", n: 0 },
            { id: "department_N", n: 0 },
            { id: "department_P", n: 0 },
            { id: "department_S", n: 0 },
            { id: "department_T", n: 0 },
            { id: "department_W", n: 0 }
        ]
    };

    if (data) {
        // Logger.info(`response data: \n ${ JSON.stringify(data, null, "  ") }`);

        StatsObject.stats = data; 
    }
}

async function handlePeopleData(ev) {
    // RequestController.abort();
    Logger.debug("load people stats");
    await loadPeopleData(StatsObject.category, QueryModel.query());
    Events.trigger.statPeopleUpdate();
}

async function loadPeopleData(category, queryObj) {
    let body  = Filter.peopleQuery(category, 50, 0, queryObj);

    const data = await fetchData(body);

    StatsObject.people =  [];
    StatsObject.contributors = 0;

    if ("person" in data && data.person) {
        // Logger.info(`response data: \n ${ JSON.stringify(data, null, "  ") }`);

        StatsObject.people = data.person; 
        StatsObject.contributors = data.contributors[0].n;
    }
}

async function handleOverviewLoadData(ev) {
    // RequestController.abort();
    Logger.debug("load stats");
    await loadOverviewData(QueryModel.query());
    Events.trigger.statMainUpdate();
}

async function fetchData(body) {
    const url = initBaseStatsUri();
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const headers = {
        'Content-Type': 'application/dql'
    };

    // Logger.debug(`fetch stats from ${url}`);
    Logger.debug(body);

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });

    const result = await response.json();
    
    if ("data" in result && result.data) {
        return result.data;
    }

    Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);

    return {};
}

async function loadOverviewData(queryObj) {
    let body  = Filter.mainQuery(queryObj);

    const data = await fetchData(body);

    StatsObject.overview =  {
        people: 0,
        publications: 0,
        modules: 0,
        projects: 0
    };

    if ("infoobjecttype" in data && data.infoobjecttype) {
        StatsObject.overview = {
            people: data.people[0].n
        }; 

        StatsObject.overview = data.infoobjecttype.reduce((a, o) => {
            a[o.name] = o.n;
            return a;
        }, StatsObject.overview);

        // Logger.info(`stats are : \n ${ JSON.stringify(StatsObject, null, "  ") }`);
    }
    else {
        Logger.info("OVERVIEW error!");
    }
}
