import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";

function initBaseStatsUri() {
    const buri = Config.get("baseuri");
    if (buri && buri.length) {
        Logger.debug("got baseuri");
        return buri;
    }

    Logger.debug("prepare baseuri");

    const proto = Config.get("proto") || "https://",
          host  = Config.get("host") || "",
          path  = Config.get("stats") || "";


    const baseuri = `${host.length ? proto : ""}${host}${(host.length && host.at(-1) !== "/") ? "/" : ""}${path}`

    Logger.debug("set baseuri to " + baseuri);

    Config.set("baseuri", baseuri);

    return baseuri;
}

export async function loadData(category, queryObj) {
    let body  = buildQueryString(category, queryObj);

    const url = initBaseStatsUri();
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const statHeaders = {
        'Content-Type': 'application/dql'
    };

    Logger.debug(`fetch stats from ${url}`);

    const response = await fetch(url, {
        signal,
        method,
        headers: statHeaders,
        cache,
        body
    });

    const result = await response.json();

    if (Object.hasOwn(result, "data")) {
        return result.data
    }
    
    Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);
    return {};
}

function buildQueryString(category, queryObj) {
    const items = []
        .concat(buildFilter(queryObj))
        .concat(buildTypeFilter(category))
        .concat(buildNavCounts())
        .concat(buildCatCounts("Sdg"))
        .concat(buildCatCounts("Department"))
        .concat(buildCatCounts("Person", "uid(vPersons)", "LDAPDN"));

    return `{ ${items.join(" ")} }`;
}

function buildFilter(queryObj) {

    return []
        .concat(buildFilterHelpers(queryObj))
        .concat("vFilter as var(func: type(InfoObject))")
        .concat(buildMainFilter(queryObj))
        .concat("@cascade { uid ")
        .concat(buildTermCascade("Keyword", "keywords", queryObj.terms))
        .concat(buildTermCascade("PublicationClass", "class", queryObj.terms))
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

function buildFilterHelpers(queryObj) {
    let retval = [];

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

    return retval;
}

function filterHelper(tp) {
    return (t, i) => `uid_in(InfoObject.${ tp.toLowerCase() }s, qh${ tp }_${i}))`;
}

function buildHelperFilter(queryObj) {
    let retval = [];

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
            queryObj.departments.map(
                filterHelper("Person")
            ).join(" and ")
        );
    }

    return retval.map((t) => `( ${ t } )`);
}

function buildTermFilter(queryObj) {
    if (!(terms && terms.length)) {
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

    conditions.push(...buildHelperFilter(queryObj));
    conditions.push(...buildTermFilter(queryObj));

    if (! conditions.length ) {
        return [];
    }

    return [ `@filter(${ conditions.join(" and ") })` ];
}

function buildTermCascade(obj, attr, terms) {
    if (!(terms && terms.length)) {
        return [];
    }

    terms = terms.map((t) => t.substring(1,t.length - 1)).join(" ");
    
    return `InfoObject.${attr} @filter(anyofterms(${obj}.name, "${terms}")) { uid }`;
}

function buildTypeFilter(cat) {
    return `vObjectType as var(func: eq(InfoObjectType.name, "${ cat }")) { uid }`;
}

function buildNavCounts() {
    return [
        buildCatCounts("InfoObjectType"),
        "vPersons as var(func: type(Person)) @cascade { uid Person.objects @filter(uid(vFilter)) { uid } }",
        "persons(func: uid(vPersons)) { n: count(uid) }"  
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
