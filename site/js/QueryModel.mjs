import * as Config from "./ConfigModel.mjs";
import * as Logger from "./Logger.mjs";
import * as Events from "./Events.mjs";

const QueryModel = {
    qterms: [],
    extra: "",
    config: {}
};

export function add(term) {
    const nValue = Number(term.value);

    if (QueryModel.qterms.filter(obj => obj.type === term.type && (obj.value === term.value || obj.value === nValue)).length) {
        Logger.debug("item exists");
        Events.trigger.queryError({message: "The query already exists."});
        // Events.trigger.queryUpdate();
        return; // item already exists
    }

    if (term.type === "sdg") {
        if (!(nValue >= 1 && nValue <= 16)) {
            Logger.debug("sdg out of bounds");
            Events.trigger.queryError({message: "SDG number is not between 1 and 16."});
            return; // value out of bounds
        }

        term.value = nValue;
    }

    if (!QueryModel.config.departments) {
        QueryModel.config.departments = Config.get("departments");
    }

    if (term.type === "department" ) {
        term.value = term.value.toUpperCase();
        
        if (!QueryModel.config.departments.includes(term.value)) {
            Logger.debug("dept out of bounds");
            Events.trigger.queryError({message: "Invalid Department ID."});
            return; // value out of bounds
        }
    }

    QueryModel.qterms.push(term);

    Events.trigger.queryUpdate();
}

export function drop(term) {
    QueryModel.qterms = QueryModel.qterms.filter(t => !(term.type === t.type && term.value === t.value));
    Events.trigger.queryUpdate();
}

export function clear() {
    QueryModel.qterms = [];
    Events.trigger.queryUpdate();
}

export function query() {
    const query = collectQueryTerms(QueryModel.qterms);

    Logger.debug(`queryModel: ${JSON.stringify(query)}`)
    
    return query;
}

export function queryterms() {
    return QueryModel.qterms;
}

function prefixAndQuote(value, prefix) {
    if (prefix) {
        value = prefix + value;
    }
    // else {
        value = JSON.stringify(value);
    // }
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
    };
}
