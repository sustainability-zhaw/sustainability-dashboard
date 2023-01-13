import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Filter from "./DqlFilter.mjs";

const StatsObject = {
    stats: {}
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

export function getStats() {
    return StatsObject.stats;
}

export function getPersonStats(initials) {
    return "x";
}

export async function loadData(category, queryObj) {
    let body  = buildQueryString(category, queryObj);

    const url = initBaseStatsUri();
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const headers = {
        'Content-Type': 'application/dql'
    };

    // Logger.debug(`fetch stats from ${url}`);
    // Logger.debug(body);

    const response = await fetch(url, {
        signal,
        method,
        headers,
        cache,
        body
    });

    const result = await response.json();

    StatsObject.stats =  {
        people: 0,
        publications: 0,
        modules: 0,
        projects: 0,
        section: {
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
            ],
            person: 0
        }
    };

    if (Object.hasOwn(result, "data") && result.data) {
        // Logger.info(`response data: \n ${ JSON.stringify(result.data, null, "  ") }`);

        const data = result.data

        StatsObject.stats = {
            people: data.people[0].n,
            section: {
                sdg: data.sdg,
                department: data.department,
                person: data.person
            }
        }; 
        data.infoobjecttype.forEach((o) => StatsObject.stats[o.id] = o.n);

        // Logger.info(`stats are : \n ${ JSON.stringify(StatsObject, null, "  ") }`);
    }
    else {
        Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    }
}

function buildQueryString(category, queryObj) {
    const items = []
        .concat(Filter.buildFilter(queryObj))
        .concat(Filter.buildObjectTypeFilter(category))
        .concat(buildNavCounts())
        .concat(buildCatCounts("Sdg"))
        .concat(buildCatCounts("Department"))
        .concat(buildCatCounts("Person", "uid(vPersons)", "LDAPDN"));

    return `{ ${items.join("\n")} }`;
}

function buildNavCounts() {
    return [
        ...buildCatCounts("InfoObjectType", null, "name"),
        "vPersons as var(func: type(Person)) @cascade { uid Person.objects @filter(uid(vFilter)) { uid } }",
        "people(func: uid(vPersons)) { n: count(uid) }"  
    ];
}

function buildCatCounts(cat, dqlFunc, cid) {
    if (!(dqlFunc && dqlFunc.length)) {
        dqlFunc = `type(${ cat })`
    }

    if (!(cid && cid.length)) {
        cid = "id"
    }
    
    return [
        `${ cat.toLowerCase() }(func: ${ dqlFunc }) {`,
        `id: ${ cat }.${ cid }`,
        `n: count(${ cat }.objects @filter(uid_in(InfoObject.category, uid(vObjectType)) and uid(vFilter)))`,
        "}"
    ];
}
