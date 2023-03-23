import * as Logger from "../Logger.mjs";
import * as Filter from "./DqlFilter.mjs";
import * as Events from "../Events.mjs";
import * as QueryModel from "./Query.mjs";

// const method = "POST"; // all requests are POST requests
// const cache = "no-store";

const Message = {
    message: ""
};

const Model = {
    records: [],
    offset: 0,
    active: false,
    complete: false
};

const queryLimit = 20;

let RequestController = new AbortController();

Events.listen.queryUpdate(handleLoadData);
Events.listen.moreData(handleMoreData);
Events.listen.changeCategory(categoryChange);

export function feed() {
    return Model.records;
}

export function offset() {
    return Model.offset;
}

export function is_complete() {
    return Model.complete;
}

async function handleLoadData() {
    if (Model.active) {
        Logger.debug("abort previous fetch!");
        RequestController.abort();
        // now throw away the old (aborted) controller and get a fresh one
        RequestController = new AbortController();
    }

    Model.complete = false;

    await fetchData(Model.category, true);
}

async function handleMoreData() {
    if (Model.active || Model.complete) {
        return;
    }

    Logger.debug("load more data");

    await fetchData(Model.category, false);
}

async function fetchData(category, reset) {
    Logger.debug("fetch data from server");

    Model.offset = reset ? 0 : Model.offset + Model.records.length;
    Model.records = [];

    Model.active = true;
    const success = await loadData(category, QueryModel.query());

    if (success) {
        Events.trigger.dataUpdate({reset});
    }
    Model.active = false;

}

function categoryChange(ev) {
    Model.category = ev.detail.category;
}

let prevQuery;
let prevType;

const dataLoader = {
    people: async (count, offset, qObject, RequestController)  => {
        const data = await Filter.peopleQuery(count, offset, qObject, RequestController);

        return data.person ?? [];
    },
    default: async (count, offset, qObject, RequestController, type)  => {
        const data = await Filter.objectsQuery(type, count, offset, qObject, RequestController);
        // const data = await Filter.fetchData(dqlQuery, RequestController);

        return data.category?.[0]?.objects ?? [];
    },
};

export async function loadData(type, queryObj) {
    Model.message = "";
    Model[type] = [];

    // const queryTerms = queryObj;
    // const objects = gqlSearchQuery(type, queryTerms);

    if (Model.offset === 0 &&
        prevQuery &&
        QueryModel.isEqual(prevQuery, queryObj) &&
        type === prevType) {
        // if the new query is not actually new, there is nothing to do
        await nextTick();

        Events.trigger.dataUpdate({reset: false, nochange: true});
        return false;
    }

    const loader = dataLoader[type] ?? dataLoader.default;

    prevQuery = queryObj;
    prevType = type;

    Model.records = [];

    try {
        Model.records = await loader(20, Model.offset, queryObj, RequestController, type);

        // Model.records = await executeDQLQuery(dqlQuery);
        // Model[type] = await executeQuery({objects});
    }
    catch (err) {
        if (err.name === "AbortError") {
            Logger.info(`error: cancel request ${err.message}`);
        }
        else {
            // Model[type] = [];
            Message.message = err.message;
            Logger.info(`error (${err.name}): ${Message.message}`);
        }
        return false;
    }

    Model.complete = !Model.records.length || Model.records.length < queryLimit;

    if (Model.complete) {
        Logger.debug("Query is complete!");
    }
    return true;
}

function nextTick() {
    // wait one tick to allow the other event loop to complete all preceeding tasks
    // this is needed so we don't run into ourselves by executing one bit of the code too early.
    return new Promise((ok) => setTimeout(ok, 0));
}
