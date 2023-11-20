import * as Config from "./Config.mjs";
import * as Logger from "../Logger.mjs";
import { category } from "./Query.mjs";

export async function fetchData(body, RequestController) {
    const url = Config.initDQLUri();
    const {signal} = RequestController;
    const method = "POST"; // all requests are POST requests

    const cache = "no-store";

    const headers = {
        "Content-Type": "application/dql"
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

    if (response.redirected &&
        response.headers.get("Content-Type").match(/^text\/html/) !== null &&
        response.url.match(/auth\/$/) !== null) {
        window.location.replace(response.url);
    }

    const result = await response.json();

    if ("data" in result && result.data) {
        return result.data;
    }

    Logger.info(`error response: \n ${ JSON.stringify(result, null, "  ") }`);

    return {};
}

// also used by the people model that requiers independent queries
export async function buildAndFetch(queryObj, type, RequestController, selectorFunc, options) {
    const {filter, handler} = buildFilter(queryObj, type);

    const query = `query { ${handler} ${selectorFunc(filter, options)} }`;

    Logger.debug(`fetch query "${query}"`);

    const resultData = await fetchData(query, RequestController);

    return resultData;
}

export function mainQuery(queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        mainSelector
    );
}

export function objectsQuery(category, limit, offset, queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        objectSelector,
        {category, limit, offset}
    );
}

export function peopleQuery(limit, offset, queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        peopleSelector,
        {limit, offset}
    );
}

export function contributorQuery(category, limit, offset, queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        contributorSelector,
        {category, limit, offset}
    );
}

export function statQuery(category, queryObj, RequestController) {
    console.log(`stat query ${category}`);

    if (category === "people") {
        console.log("stat people query");
        return statPeopleQuery(queryObj, RequestController);
    }

    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        statSelector,
        {category}
    );
}

export function statPeopleQuery(queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        statPeopleSelector,
        {category}
    );
}

export function indexQuery(queryObj, limit, offset, RequestController) {
    return buildAndFetch(
        queryObj,
        "SdgMatch",
        RequestController,
        matchSelector,
        {limit, offset}
    );
}

export function classificationQuery(queryObj, RequestController) {
    return buildAndFetch(
        queryObj,
        "InfoObject",
        RequestController,
        classificationSelector,
        {}
    );
}

function buildFilter(queryObj, refType) {
    if (!queryObj) {
        return {};
    }

    const aFilter = [];
    const aHandler = [];

    if (queryObj.sdgs && queryObj.sdgs.length) {
        queryObj.sdgs.forEach((t, i) => {
            aFilter.push(buildUidFilter("sdg", i, refType));
            aHandler.push(buildEdgeHandler("sdg", t, i));
        });
    }

    if (queryObj.departments && queryObj.departments.length) {
        queryObj.departments.forEach((t, i) => {
            aFilter.push(buildUidFilter("department", i, refType));
            aHandler.push(buildEdgeHandler("department", t, i));
        });
    }

    if (queryObj.persons && queryObj.persons.length) {
        queryObj.persons.forEach((t, i) => {
            aFilter.push(buildUidFilter("person", i, refType));
            aHandler.push(buildPersonHandler(t, i));
        });
    }

    if (queryObj.lang && queryObj.lang.length) {
        queryObj.lang.forEach((t) => {
            aFilter.push(buildLangFilter(t, refType));
        });
    }

    if (queryObj.subtypes && queryObj.subtypes.length) {
        const orFilter = [];

        queryObj.subtypes.forEach((st, i) => {
            orFilter.push(`uid_in(InfoObject.subtype, uid(sh${i}))`);
            aHandler.push(`sh${i} as var(func: type(InfoObjectSubType)) @filter(eq(InfoObjectSubType.name, ${st})) { uid }`);
        });
        aFilter.push(`(${orFilter.join(" or ")})`);
    }

    if (refType === "SdgMatch") {
        const tf = buildMatchTermFilter(queryObj);

        if (tf && tf.length){
            aFilter.push(tf);
        }
    }
    else {
        if (queryObj.terms && queryObj.terms.length) {
            queryObj.terms.forEach((t) => {
                aFilter.push(buildTermFilter("term", t));
            });
        }

        if (queryObj.notterms && queryObj.notterms.length) {
            queryObj.notterms.forEach((t) => {
                aFilter.push(buildTermFilter("notterm", t));
            });
        }
    }

    const filter = aFilter.join(" and ");
    const handler = aHandler.join("\n    ");

    return {
        filter,
        handler
    };
}

function mainSelector(filter) {
    filter = filter && filter.length ? ` @filter(${filter})` : "";

    const aHelper = filter.length ? `aph as var(func: type(Author)) @cascade { Author.objects${filter} { uid } }` : "";
    const pHelper = filter.length ? " @filter(uid_in(Person.pseudonyms, uid(aph)))" : "";

    return `
    ${aHelper}
    infoobjecttype(func: type(InfoObjectType)) {
        name: InfoObjectType.name
        n: count(InfoObjectType.objects${filter})
    }

    people(func: has(Person.pseudonyms))${pHelper} {
        n: count(uid)
    }`;
}

function statSelector(filter, options) {
    // limit and offset are deliberately ignored in this query
    const {category} = options || {};

    filter = filter && filter.length ? ` and ${filter}` : "";
    return `
    categ as var(func: type(InfoObjectType)) @filter(eq(InfoObjectType.name, ${JSON.stringify(category)})) {
        uid
    }

    lang(func: type(InfoObject)) @filter(uid_in(InfoObject.category, uid(categ))${filter}) @groupby(lang: InfoObject.language) {
        n: count(uid)
    }

    sdg(func: type(Sdg)) {
        id: Sdg.id
        n: count(Sdg.objects @filter(uid_in(InfoObject.category, uid(categ))${filter}))
    }

    department(func:type(Department)) {
        id: Department.id
        n: count(Department.objects @filter(uid_in(InfoObject.category, uid(categ))${filter}))
    }`;
}

function statPeopleSelector(filter) {
    filter = filter && filter.length ? ` @filter(${filter})` : "";

    return `
    categ as var(func: type(InfoObject)) ${filter} {
        uid
    }

    authors as var(func: type(Author)) @filter(has(Author.person) and uid_in(Author.objects, uid(categ))) {
        uid
    }

    lang(func: type(InfoObject)) @filter(uid_in(InfoObject.authors, uid(authors))) @groupby(lang: InfoObject.language) {
        n: count(uid)
    } 

    sdg(func: type(Sdg)) {
        id: Sdg.id
        n: count(Sdg.objects @filter(uid_in(InfoObject.authors, uid(authors))))
    }

    department(func:type(Department)) {
        id: Department.id
        n: count(Department.persons @filter(uid_in(Person.pseudonyms, uid(authors))))
    }`;
}

function contributorSelector(filter, options) {
    const {category, limit, offset} = options || {};

    filter = filter && filter.length ? ` and ${filter}` : "";
    return `
        categ as var(func: type(InfoObjectType)) @filter(eq(InfoObjectType.name, ${JSON.stringify(category)})) {
            uid
        }

        pps as var(func: has(Person.pseudonyms))
          {
            Person.pseudonyms {
        		np as count(Author.objects 
                    # filter
                    @filter(uid_in(InfoObject.category, uid(categ))${filter}) 
                )
            }
            tmpn as sum(val(np))
        }

        contributors(func: uid(pps)) @filter(gt(val(tmpn), 0)) {
            n: count(uid)
        }

        person(func: uid(pps), orderdesc: val(tmpn), first: ${limit}, offset: ${offset}) @filter(gt(val(tmpn), 0)){
            initials: Person.initials
            surname: Person.surname
            givenname: Person.givenname
            displayname: Person.displayname
            mail: Person.mail
            department: Person.department {
                id: Department.id
            }
            n: val(tmpn)
        }`;
}

function objectSelector(filter, options) {
    const {category, limit, offset} = options;

    filter = filter && filter.length ? ` @filter(${filter})` : "";

    return `
    category(func: eq(InfoObjectType.name, ${JSON.stringify(category)})) {
        objects: InfoObjectType.objects(first: ${limit}, offset: ${offset},  orderdesc: InfoObject.year) 
        ${filter}
        {
          link: InfoObject.link
          title: InfoObject.title
          abstract: InfoObject.abstract
          extras: InfoObject.extras
          year: InfoObject.year
          authors: InfoObject.authors {
            fullname: Author.fullname
            person: Author.person {
                qvalue.person: Person.initials
                firstname: Person.givenname
                lastname: Person.surname
                displayname: Person.displayname
                department.affiliation: Person.department {
                    id: Department.id
                }
            }
          }
          department: InfoObject.departments {
            id: Department.id
          }
          sdg: InfoObject.sdgs {
            id: Sdg.id
          }
          keywords: InfoObject.keywords {
            name: Keyword.name
          }
          subtype: InfoObject.subtype {
            name: InfoObjectSubType.name 
          }
          classification: InfoObject.class { 
            itemid: PublicationClass.id 
            name: PublicationClass.name 
          }
          matches: InfoObject.sdg_matches {
            matchid: SdgMatch.construct
            keyword: SdgMatch.keyword
            required: SdgMatch.required_context
            forbidden: SdgMatch.forbidden_context
            lang: SdgMatch.language
            mark: SdgMatch.sdg { 
                id: Sdg.id
            }
          }
        }
    }`;
}

function matchSelector(filter, options) {
    const {limit, offset} = options;

    filter = filter && filter.length ? ` @filter(${filter})` : "";

    return `
	sdgmatch(func: type(SdgMatch), first: ${limit}, offset: ${offset})${filter} {
		construct: SdgMatch.construct
        keyword: SdgMatch.keyword
        required_context: SdgMatch.required_context
        forbidden_context: SdgMatch.forbidden_context
        language: SdgMatch.language
        sdg: SdgMatch.sdg {
			id: Sdg.id
        }
    }`;
}

/**
 * Selector to load classifications of a project or publication
 *
 * @param {*} filter - filter terms to be added to the query
 * @param {*} options - unused
 */
function classificationSelector(filter, optionsUnused) {

    let xfilter = "";

    if (filter && filter.length) {
        filter = ` infoobj as var(func: type(InfoObject)) @filter(${filter}) {uid} `;
        xfilter = " @filter(uid_in(PublicationClass.objects, uid(infoobj))) ";
    }

    Logger.debug(`classification filter: "${filter}"`);

    // TODO: Order by ID
    // TODO: the objects MUST be filtered, too!
    return ` ${filter}
	classes(func: type(PublicationClass))${xfilter} {
		id: PublicationClass.id
        name: PublicationClass.name
        obj: PublicationClass.objects @filter(uid(infoobj)) {
            n: count(uid)
        }
    }`;
}

function peopleSelector(filter, options) {
    const {limit, offset} = options;

    filter = filter && filter.length ? ` @filter(${filter})` : "";

    return `
    pps as var(func: has(Person.pseudonyms)) {
        Person.pseudonyms {
    		np as count( Author.objects ${filter} )
        }
        tmpn as sum(val(np))
    }

    person(func: uid(pps), first: ${limit}, offset: ${offset}, orderasc: Person.surname) 
    @filter(gt(val(tmpn), 0)) {
        person.id: Person.LDAPDN
        initials: Person.initials
        attr.www: Person.initials
        surname: Person.surname
        givenname: Person.givenname
        title: Person.title
        attr.mail: Person.mail
        attr.telephone: Person.ipphone
        person.department: Person.department {
            department.id: Department.id
        }
        office: Person.physicaldeliveryofficename
        class.gender: Person.gender
        team: Person.team {
            teamname: Team.LDAPDN
        }
        sdg: Person.pseudonyms {
            counts: Author.objects @groupby(id: InfoObject.sdgs) {
                n: count(uid)
            }
        }
    }

    sdg(func: type(Sdg)) {
        id: Sdg.id
        uid
    } 
`;
}

function buildPersonHandler(author, id) {
    return `ph${id} as var(func: has(Author.person)) @cascade { 
        Author.person @filter(eq(Person.initials, ${author})) {
            uid
        }
    }`;
}

function buildEdgeHandler(type, value, id) {
    const firstChar = type.trim().charAt(0);

    const realType = firstChar.toUpperCase() + type.slice(1);

    return `${firstChar}h${id} as var(func: type(${realType})) @filter(eq(${realType}.id, ${value})) { uid }`;
}

function buildUidFilter(type, id, refType) {
    const firstChar = type.trim().charAt(0);

    refType = refType && refType.length ? refType : "InfoObject";

    if (!["sdg", "department", "person"].includes(type)) {
        return "";
    }

    return `uid_in(${refType}.${type === "person" ? "author" : type}${refType === "InfoObject" ? "s" : ""}, uid(${firstChar}h${id}))`;
}

function buildTermFilter(type, term) {
    const not = type !== "term";

    const isQuoted = term.match(/^"\\['"]/);

    if (isQuoted) {
        // clean quoted term
        term = term.replace(/^"\\|"$/, ""); // remove internal quotes and helpers

        const quotechar = term.match(/^['"]/)[0];
        const regex = new RegExp(`^${quotechar}([^${quotechar}]*?)(?:${quotechar}.*)?$`);

        console.log(`quoted term: ${term}`);

        term = term.trim()
            .replace(/\\['"]/g, `${quotechar}`) // drop quoted quotes
            .replace(regex, "$1")
            .replace(/\s+/g, " ")
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/^\s|\s$/g, "\\b");

        console.log(`quoted term: ${term}`);

        return `${not ? "not" : ""}(regexp(InfoObject.title, /${term}/i) or regexp(InfoObject.abstract, /${term}/i) or regexp(InfoObject.extras, /${term}/i))`;
    }

    return `${not ? "not" : ""}(alloftext(InfoObject.title, ${term}) or alloftext(InfoObject.abstract, ${term}) or alloftext(InfoObject.extras, ${term}))`;
}

function buildLangFilter(lang, type) {
    return `eq(${type}.language, ${lang.toLowerCase()})`;
}

function buildMatchTermFilter(queryObj) {
    const f = [];

    if (queryObj.terms.length && queryObj.terms.length <= 2) {
        f.push(`( eq(SdgMatch.keyword, ${queryObj.terms[0]}) or eq(SdgMatch.required_context, ${queryObj.terms[0]}) )`);
    }

    if (queryObj.terms.length === 2) {
        f.push(`( eq(SdgMatch.keyword, ${queryObj.terms[1]}) or eq(SdgMatch.required_context, ${queryObj.terms[1]}) )`);
    }

    if (queryObj.notterms.length) {
        f.push(`eq(SdgMatch.forbidden_context, ${queryObj.notterms[0]})`);
    }

    if (f.length) {
        return f.join(" and ") ;
    }

    return "";
}
