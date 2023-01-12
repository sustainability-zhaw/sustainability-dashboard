import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";

const StatsObject = {
    stats: {}
};

const RequestController = new AbortController();

function initBaseStatsUri() {
    const buri = Config.get("staturi");

    if (buri && buri.length) {
        Logger.debug("got baseuri");
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
    StatsObject.stats =  {};

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
        .concat(buildFilter(queryObj))
        .concat(buildObjectTypeFilter(category))
        .concat(buildNavCounts())
        .concat(buildCatCounts("Sdg"))
        .concat(buildCatCounts("Department"))
        .concat(buildCatCounts("Person", "uid(vPersons)", "LDAPDN"));

    return `{ ${items.join("\n")} }`;
}

function buildFilter(queryObj) {

    return []
        .concat(buildFilterHelpers(queryObj))
        .concat("vFilter as var(func: type(InfoObject))")
        .concat(buildMainFilter(queryObj))
        // .concat("@cascade")
        .concat("{")
        .concat(" uid ")
        // .concat(buildTermCascade("Keyword", "keywords", queryObj.terms))
        // .concat(buildTermCascade("PublicationClass", "class", queryObj.terms))
        .concat("}");
}

function buildTypeFilter(obj, attr, terms) {
    if (!(terms && terms.length)) {
        return [];
    }

    return [
        `InfoObject.${attr} @filter(`,
        terms.map(t => `eq(${obj}.id, ${t})`).join(" and "),
        ") { uid }"
    ];
}

function queryHelper(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "id";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(${ theType })) @filter(eq(${ theType }.${ initials }, ${ t })) { uid }`;
}

function queryHelperText(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "name";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(${ theType })) @filter(anyofterms(${ theType }.${ initials }, ${ t })) { uid }`;
}

function buildFilterHelpers(queryObj) {
    let retval = [];

    if (!queryObj) {
        return retval;
    }

    if (queryObj.sdgs && queryObj.sdgs.length) {
        retval = retval.concat(
            queryObj.sdgs.map(
                queryHelper("Sdg")
            )
        );
    }

    if (queryObj.departments && queryObj.departments.length) {
        retval = retval.concat(
            queryObj.departments.map(
                queryHelper("Department")
            )
        );
    }

    if (queryObj.persons && queryObj.persons.length) {
        retval = retval.concat(
            queryObj.departments.map(
                queryHelper("Person", "initials")
            )
        );
    }

    if (queryObj.terms && queryObj.terms.length) {
        retval = retval.concat(
            queryObj.terms.map(
                queryHelperText("Keyword")
            )
        );

        retval = retval.concat(
            queryObj.terms.map(
                queryHelperText("PublicationClass")
            )
        );
    }

    return retval;
}

function filterHelper(tp, tpattr) {
    if (!(tpattr && tpattr.length)) {
        tpattr = `${tp.toLowerCase()}s`;
    }

    return (t, i) => `uid_in(InfoObject.${ tpattr }, uid(qh${ tp }_${i}))`;
}

function buildHelperFilter(queryObj) {
    let retval = [];

    if (!queryObj) {
        return retval;
    }

    if (queryObj.sdgs && queryObj.sdgs.length) {
        retval = retval.concat(
            queryObj.sdgs.map(
               filterHelper("Sdg")
            ).join(" and ")
        );
    }

    if (queryObj.departments && queryObj.departments.length) {
        retval = retval.concat(
            queryObj.departments.map(
                filterHelper("Department")
            ).join(" and ")
        );
    }

    if (queryObj.persons && queryObj.persons.length) {
        retval = retval.concat(
            queryObj.persons.map(
                filterHelper("Person")
            ).join(" and ")
        );
    }

    if (queryObj.terms && queryObj.terms.length) {
        let hlp = [];
        hlp.concat(
            queryObj.terms.map(
                filterHelper("Keyword")
            ).join(" and ")
        );

        hlp.concat(
            queryObj.terms.map(
                filterHelper("PublicationClass", "class")
            ).join(" and ")
        );

        retval = retval.concat(
            `( ${ hlp.join(" or ") } )`
        )
    }

    return retval.map((t) => `( ${ t } )`);
}

function buildTermFilter(queryObj) {
    if (!(queryObj && queryObj.terms && queryObj.terms.length)) {
        return [];
    }

    terms = queryObj.terms.map((t) => t.substring(1,t.length - 1)).join(" ");

    const f = [
        `alloftext(InfoObject.title, "${terms}")`,
        `alloftext(InfoObject.abstract, "${terms}")`,
        `alloftext(InfoObject.extras, "${terms}")`
    ];

    return [ `( ${ f.join(" or ") })` ];
}

function buildMainFilter(queryObj) {
    const conditions = []; 

    if (!queryObj) {
        return [];
    }

    conditions.push(...buildHelperFilter(queryObj));
    conditions.push(...buildTermFilter(queryObj));

    if (! conditions.length ) {
        return [];
    }

    return [ `@filter( ${ conditions.join(" and ") } )` ];
}

function buildObjectTypeFilter(cat) {
    return `vObjectType as var(func: eq(InfoObjectType.name, "${ cat }")) { uid }`;
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
    
    // const cname = cat == "InfoObjectType" ? "category" : `${ cat.toLowerCase() }s`;

    return [
        `${ cat.toLowerCase() }(func: ${ dqlFunc }) {`,
        `id: ${ cat }.${ cid }`,
        `n: count(${ cat }.objects @filter(uid_in(InfoObject.category, uid(vObjectType)) and uid(vFilter)))`,
        "}"
    ];
}
