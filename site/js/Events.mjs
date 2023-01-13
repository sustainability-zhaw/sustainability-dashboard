// import * as Logger from "./Logger.mjs";

export let trigger;

export function init(evAnchor) {
    const queryUpdate        = new CustomEvent("queryupdate", {});
    const queryExtraUpdate   = new CustomEvent("queryupdate.extra", {});

    const dataUpdate         = new CustomEvent("dataupdate", {});
    const dataUpdateStat     = new CustomEvent("dataupdate.stat", {});
    const dataUpdatePerson   = new CustomEvent("dataupdate.person", {});
    const dataUpdatePub      = new CustomEvent("dataupdate.publication", {});
    const dataUpdateEdu      = new CustomEvent("dataupdate.education", {});
    const dataUpdatePrj      = new CustomEvent("dataupdate.project", {});
    const dataUpdateBookmark = new CustomEvent("dataupdate.bookmark", {});

    trigger = {
        queryUpdate: () => evAnchor.dispatchEvent(queryUpdate),
        queryExtra: () => evAnchor.dispatchEvent(queryExtraUpdate),

        queryAddItem: (detail) => evAnchor.dispatchEvent(new CustomEvent("queryadd", {detail})),

        dataUpdate: () => evAnchor.dispatchEvent(dataUpdate),
        statUpdate: () => evAnchor.dispatchEvent(dataUpdateStat),

        // special queries
        personUpdate: () => evAnchor.dispatchEvent(dataUpdatePerson),

        // Future function
        bookmarkUpdate: () => evAnchor.dispatchEvent(dataUpdateBookmark),

        // possibly obsolete
        // pubUpdate: () => evAnchor.dispatchEvent(dataUpdatePub),
        // projectUpdate: () => evAnchor.dispatchEvent(dataUpdatePrj),
        // eduUpdate: () => evAnchor.dispatchEvent(dataUpdateEdu)
    };
    
    // prevent accidental dynamic changes
    trigger = Object.freeze(trigger);
}

