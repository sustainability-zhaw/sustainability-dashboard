
export function buildFilter(queryObj) {

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

export function buildObjectTypeFilter(cat) {
    return `vObjectType as var(func: eq(InfoObjectType.name, "${ cat }")) { uid }`;
}

export function buildTypeFilter(obj, attr, terms) {
    if (!(terms && terms.length)) {
        return [];
    }

    return [
        `InfoObject.${attr} @filter(`,
        terms.map(t => `eq(${obj}.id, ${t})`).join(" and "),
        ") { uid }"
    ];
}

export function selectorAlias(selectors, type) {
    if (!Array.isArray(selectors)) {
        selectors = [selectors];
    }
    
    return selectors.map(s => `${s}: ${type}.${s}`);
}

function mapHelperQuery(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "id";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(${ theType })) @filter(eq(${ theType }.${ initials }, ${ t })) { uid }`;
}

function mapHelperQueryText(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "name";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(${ theType })) @filter(anyofterms(${ theType }.${ initials }, ${ t })) { uid }`;
}

function mapHelperVFilter(tp, tpattr) {
    if (!(tpattr && tpattr.length)) {
        tpattr = `${tp.toLowerCase()}s`;
    }

    return (t, i) => `uid_in(InfoObject.${ tpattr }, uid(qh${ tp }_${i}))`;
}

function buildFilterHelpers(queryObj) {
    let retval = [];

    if (!queryObj) {
        return retval;
    }

    if (queryObj.sdgs && queryObj.sdgs.length) {
        retval = retval.concat(
            queryObj.sdgs.map(
                mapHelperQuery("Sdg")
            )
        );
    }

    if (queryObj.departments && queryObj.departments.length) {
        retval = retval.concat(
            queryObj.departments.map(
                mapHelperQuery("Department")
            )
        );
    }

    if (queryObj.persons && queryObj.persons.length) {
        retval = retval.concat(
            queryObj.persons.map(
                mapHelperQuery("Person", "initials")
            )
        );
    }

    return retval;
}

function buildHelperFilter(queryObj) {
    let retval = [];

    if (!queryObj) {
        return retval;
    }

    if (queryObj.sdgs && queryObj.sdgs.length) {
        retval = retval.concat(
            queryObj.sdgs.map(
               mapHelperVFilter("Sdg")
            ).join(" and ")
        );
    }

    if (queryObj.departments && queryObj.departments.length) {
        retval = retval.concat(
            queryObj.departments.map(
                mapHelperVFilter("Department")
            ).join(" and ")
        );
    }

    if (queryObj.persons && queryObj.persons.length) {
        retval = retval.concat(
            queryObj.persons.map(
                mapHelperVFilter("Person")
            ).join(" and ")
        );
    }

    if (queryObj.lang && queryObj.lang.length) {
        retval = retval.concat(
            queryObj.lang.map(
                (lang) => `eq(InfoObject.language, ${lang.toLowerCase()})`
            ).join(" or ")
        );
    }

    if (retval.length) {
        return retval.map((t) => `( ${ t } )`);
    }

    return [];
}

function buildTermFilter(queryObj) {
    if (!(queryObj && queryObj.terms && queryObj.terms.length)) {
        return [];
    }

    const terms = queryObj.terms.map((t) => t.substring(1,t.length - 1)).join(" ");

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
