import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";


Events.listen.queryAddItem(add);
Events.listen.queryClear(clear);
Events.listen.queryDrop(drop);
Events.listen.queryReplace(replaceQuery);

export function query() {
    const query = collectQueryTerms(QueryModel.qterms);

    Logger.debug(`queryModel: ${JSON.stringify(query)}`)
    
    return query;
}

export function queryterms() {
    return QueryModel.qterms;
}

const QueryModel = {
    qterms: [],
    extra: "",
    config: {}
};

const validators = {
    sdg:        validateSDG,
    person:     validatePerson,
    department: validateDepartment,
    lang:       validateLang,
    term:       validateTerm,
    notterm:    validateTerm
};

const queryTypes = {
    dept: "department",
    language: "lang",
    not: "notterm"
};

function validateSDG(query) {
    const message = "No query term found. Please add a SDG number.";

    if (validateEmpty(query)) {
        Logger.debug("no value")
        Events.trigger.queryError({message});
        return 0;
    }

    const nValue = Number(query);

    if (!(nValue >= 1 && nValue <= 16)) {
        Logger.debug("sdg out of bounds");
        Events.trigger.queryError({message: "SDG number is not between 1 and 16."});
        return 0; // value out of bounds
    }

    return nValue;
}

function validateDepartment(query) {
    const message = "No query term found. Please add a Department ID.";

    if (validateEmpty(query)) {
        Events.trigger.queryError({message});
        return 0;
    }

    if (!QueryModel.config.departments) {
        QueryModel.config.departments = Config.get("departments");
    }

    query = query.toUpperCase();
        
    if (!QueryModel.config.departments.includes(query)) {
        Logger.debug("dept out of bounds");
        Events.trigger.queryError({message: "Invalid Department ID."});
        return 0; // value out of bounds
    }

    return query;
}

function validatePerson(query) {
    const message = "No query term found. Please add a name.";

    if (validateEmpty(query)) {
        Events.trigger.queryError({message});
        return 0;
    }

    query = query.toLowerCase();
        
    return query;
} 

function validateLang(query) {
    const message = "No langauge found. Please add a language.";

    if (validateEmpty(query)) {
        Events.trigger.queryError({message});
        return 0;
    }

    query = query.toUpperCase();
    if (query.length !== 2 || 
        !["EN", "DE", "FR", "IT"].includes(query)) {
        Events.trigger.queryError({message: "Invalid language"});
        return 0;
    }

    return query;
}

function validateTerm(query) {
    if (validateEmpty(query)) {
        return 0;
    }
    return query;
}

function validateType(type) {
    type = type.toLowerCase();

    Logger.debug(`validate type ${type}`);

    const message = "Invalid query type.";

    if (![
        "sdg",
        "dept",
        "department",
        "lang",
        "language",
        "person",
        "term",
        "notterm",
        "not"
    ].includes(type)) {
        Logger.debug(message);
        Events.trigger.queryError({message});
        return 0;
    }

    const result = Object.hasOwn(queryTypes, type) ?
        queryTypes[type] : 
        type;

    Logger.debug(`type is ${result}`);

    return result;
}

function validateEmpty(value) {
    return !(value && value.length);
}

function add(ev) {
    Logger.debug("got add event");

    const type = validateType(ev.detail.type);

    if (type === 0) {
        Logger.debug("bail out type");
        return;
    }

    const value = validators[type](ev.detail.value);
  
    if (value === 0) {
        Logger.debug("bail out value");
        return;
    }

    if (QueryModel.qterms.filter(obj => obj.type === type && obj.value === value).length) {
        Logger.debug("item exists");
        Events.trigger.queryError({message: "The query already exists."});
        return;
    }

    Logger.debug("update term");

    QueryModel.qterms.push({type, value});

    Events.trigger.queryUpdate();

    checkMathingTerm(QueryModel.qterms);
}

function drop(ev) {
    const type = ev.detail.type;
    const value = ev.detail.value;

    QueryModel.qterms = QueryModel.qterms.filter(t => !(type === t.type && value === t.value));

    Events.trigger.queryUpdate();

    checkMathingTerm(QueryModel.qterms);
}

function replaceQuery(ev) {
    QueryModel.qterms = ev.detail;
    
    Events.trigger.queryUpdate();
    
    checkMathingTerm(QueryModel.qterms);
}

function clear() {
    if (!QueryModel.qterms.length) {
        return;
    }
    
    QueryModel.qterms = [];
    Events.trigger.queryUpdate();
}

function prefixAndQuote(value, prefix) {
    if (prefix) {
        value = prefix + value;
    }

    value = JSON.stringify(value);

    return value;
}

function collectType(qterms, type) {
    const prefix = ["department", "sdg"].includes(type) ? type + "_" : "";

    return qterms
        .filter(i => i.type === type)
        .map(i => i.value)
        .map((val) => prefixAndQuote(val, prefix));
}

function collectQueryTerms(query) {
    return {
        sdgs:        collectType(query, "sdg"),
        departments: collectType(query, "department"),
        persons:     collectType(query, "person"),
        terms:       collectType(query, "term"),
        lang:        collectType(query, "lang"),
        notterms:    collectType(query, "notterm")
    };
}

function countQueryTerms(query) {
    return {
        sdgs:        collectType(query, "sdg").length,
        departments: collectType(query, "department").length,
        persons:     collectType(query, "person").length,
        terms:       collectType(query, "term").length,
        lang:        collectType(query, "lang").length,
        notterms:    collectType(query, "notterm").length
    };
}

function checkMathingTerm(query) {
    if (!(query && query.length)) {
        Events.trigger.invalidMatchingTerm();
        return; 
    }

    const qterms = countQueryTerms(query);

    if (
        qterms.persons || 
        qterms.departments || 
        qterms.sdgs > 1 || 
        qterms.lang > 1 ||
        qterms.notterms > 1 || 
        qterms.terms === 0 ||
        qterms.terms > 2
    ) {
        Events.trigger.invalidMatchingTerm();
        return; 
    }

    if ((
            qterms.sdgs < 1 || 
            qterms.lang < 1 
        ) &&
        qterms.terms > 0
    ) {
        const details = []; 

        if (qterms.sdgs < 1) {
            details.push("SDG")
        }

        if (qterms.lang < 1) {
            details.push("a language")
        }

        Events.trigger.partialMatchingTerm(details);
        return; 
    }

    Events.trigger.fullMatchingTerm();
}
