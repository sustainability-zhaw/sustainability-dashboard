
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

export function buildMatchFilter(queryObj) {

    return []
        .concat(buildFilterHelpers(queryObj))
        .concat(`vFilter as var(func: type(SdgMatch))`)
        .concat(buildMatcherFilter(queryObj))
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

function mapPersonHelperQuery(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "id";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(Author)) @cascade { uid Author.person @filter(eq(${theType}.${ initials }, ${ t })) { uid }}`;
}


function mapHelperQueryText(theType, initials) {
    if (!(initials && initials.length)) {
        initials = "name";
    }
    return (t, i) => `qh${ theType }_${ i } as var(func: type(${ theType })) @filter(anyofterms(${ theType }.${ initials }, ${ t })) { uid }`;
}

function mapHelperVFilter(targetType, tp, tpattr) {
    if (!(tpattr && tpattr.length)) {
        tpattr = `${tp.toLowerCase()}s`;
    }

    return (t, i) => `uid_in(${targetType}.${ tpattr }, uid(qh${ tp }_${i}))`;
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
                mapPersonHelperQuery("Person", "initials")
            )
        );
    }

    return retval;
}

function buildHelperFilter(queryObj, targetType) {
    let retval = [];
    let attrs = {
        InfoObject: {
            persons: "authors"
        },
        SdgMatch: {
            Sdg: "sdg"
        }
    };

    if (!queryObj) {
        return retval;
    }

    if (queryObj.sdgs && queryObj.sdgs.length) {
        retval = retval.concat(
            queryObj.sdgs.map(
               mapHelperVFilter(targetType, "Sdg", attrs[targetType].Sdg)
            ).join(" and ")
        );
    }

    if (queryObj.departments && queryObj.departments.length) {
        retval = retval.concat(
            queryObj.departments.map(
                mapHelperVFilter(targetType, "Department", attrs[targetType].departments)
            ).join(" and ")
        );
    }

    if (queryObj.persons && queryObj.persons.length) {
        retval = retval.concat(
            queryObj.persons.map(
                mapHelperVFilter(targetType, "Person", attrs[targetType].persons)
            ).join(" and ")
        );
    }

    if (queryObj.lang && queryObj.lang.length) {
        retval = retval.concat(
            queryObj.lang.map(
                (lang) => `eq(${targetType}.language, ${lang.toLowerCase()})`
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

    return [ `( ${ f.join(" OR ") })` ];
}

function buildNotTermFilter(queryObj) {
    if (!(queryObj && queryObj.notterms && queryObj.notterms.length)) {
        return [];
    }

    const terms = queryObj.notterms.map((t) => t.substring(1,t.length - 1)).join(" ");

    const f = [
        `alloftext(InfoObject.title, "${terms}")`,
        `alloftext(InfoObject.abstract, "${terms}")`,
        `alloftext(InfoObject.extras, "${terms}")`
    ];

    return [ `( NOT ( ${ f.join(" OR ") }))` ];
}


function buildMainFilter(queryObj) {
    const conditions = []; 

    if (!queryObj) {
        return [];
    }

    conditions.push(...buildHelperFilter(queryObj, "InfoObject"));
    conditions.push(...buildTermFilter(queryObj));
    conditions.push(...buildNotTermFilter(queryObj));

    if (! conditions.length ) {
        return [];
    }

    return [ `@filter( ${ conditions.join(" and ") } )` ];
}

function buildMatcherFilter(queryObj) {
    const conditions = []; 

    if (!queryObj) {
        return [];
    }

    conditions.push(...buildHelperFilter(queryObj, "SdgMatch"));
    conditions.push(...buildMatchTermFilter(queryObj));

    if (! conditions.length ) {
        return [];
    }

    return [ `@filter( ${ conditions.join(" and ") } )` ];
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
        return [ `(  ${ f.join(" AND ") } )` ];
    }
    return f;
}