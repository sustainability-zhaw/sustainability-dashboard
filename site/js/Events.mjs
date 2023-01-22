// import * as Logger from "./Logger.mjs";

let anchor; 
    
const events = [
    "queryUpdate",
    "queryExtra",
    "dataUpdate",
    "statUpdate",
    "personUpdate",
    "bookmarkUpdate",
    "queryAddItem",
    "queryError",
    "queryClear",
    "queryDrop",
    "partialMatchingTerm",
    "fullMatchingTerm",
    "invalidMatchingTerm"
];

export const trigger = events.reduce((a, e) => {
        a[e] = (detail) => anchor.dispatchEvent(new CustomEvent(e, {detail}));
        return a;
    }, {});

export const listen = events.reduce((a, e) => { 
        a[e] = (f) => anchor.addEventListener(e, f);
        return a;
    }, {});

export function init(evAnchor) {
    anchor = evAnchor;
}
