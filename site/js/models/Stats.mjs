import * as Logger from "../Logger.mjs";
import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";
import * as QueryModel from "./Query.mjs";

const StatsObject = {
    stats: {},
    overview: {},
    people: [],
    contributors: 0,
    category: ""
};

let RequestController = new AbortController();
let OverviewAbort = new AbortController();

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

Events.listen.queryUpdate(handleData);
// Events.listen.queryUpdate(handleLoadData);
// Events.listen.queryUpdate(handlePeopleData);
Events.listen.queryUpdate(handleOverviewLoadData);
Events.listen.changeCategory(categoryChange);

function categoryChange(ev) {
    StatsObject.category = ev.detail.category;
}

let prevQuery;
let prevCategory;

function checkPrevQuery(query) {
    if (!(prevQuery && StatsObject.category === prevCategory && QueryModel.isEqual(prevQuery, query))) {
        prevQuery = query;
        prevCategory = StatsObject.category;
        return false;
    }

    // if the new query is not actually new, there is nothing to do
    return true;
}

async function handleData() {
    const query = QueryModel.query();

    if (checkPrevQuery(query)) {
        return;
    }

    RequestController.abort();
    RequestController = new AbortController();

    await Promise.all([handleLoadData(query),handlePeopleData(query)]);
}

async function handleLoadData(q) {
    Logger.debug("load stats");

    await loadData(StatsObject.category, q);
    Events.trigger.statUpdate();
}

async function loadData(category, queryObj) {
    const data = await Filter.statQuery(category, queryObj, RequestController);

    data.lang = data.lang?.[0]?.["@groupby"].reduce((obj, item) => { obj[item.lang] =  item.n; return obj; }, {de: 0, en: 0, fr: 0, it: 0});

    StatsObject.stats =  {
        lang: {de: 0, en: 0, fr: 0, it: 0},
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

async function handlePeopleData(q) {
    Logger.debug("load people stats");

    if (StatsObject.category === "people") {
        return;
    }

    await loadPeopleData(StatsObject.category, q);

    Events.trigger.statPeopleUpdate();
}

async function loadPeopleData(category, queryObj) {
    const data = await Filter.contributorQuery(category, 50, 0, queryObj, RequestController);

    StatsObject.people =  [];
    StatsObject.contributors = 0;

    if ("person" in data && data.person) {
        // Logger.info(`response data: \n ${ JSON.stringify(data, null, "  ") }`);

        StatsObject.people = data.person;
        StatsObject.contributors = data.contributors[0].n;
    }
}

async function handleOverviewLoadData() {
    Logger.debug("load stats");
    await loadOverviewData(QueryModel.query());
    Events.trigger.statMainUpdate();
}

async function loadOverviewData(queryObj) {
    OverviewAbort.abort();
    OverviewAbort = new AbortController();

    const data = await Filter.mainQuery(queryObj, OverviewAbort);

    StatsObject.overview =  {
        people: 0,
        publications: 0,
        modules: 0,
        projects: 0
    };

    // data.lang = data.lang?.[0]?.["@groupby"].reduce((obj, item) => { obj[item.lang] =  item.n; return obj; }, {de: 0, en: 0, fr: 0, it: 0});

    // if (!data.lang) {
    //     data.lang = {de: 0, en: 0, fr: 0, it: 0};
    // }

    if ("infoobjecttype" in data && data.infoobjecttype) {
        StatsObject.overview = {
            people: data.people[0].n,
            // lang: data.lang
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
