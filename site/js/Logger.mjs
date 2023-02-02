import * as Config from "./models/Config.mjs";

export function debug( message ) {
    if (Config.get("debug") > 1) {
        console.log(message);
    }
}

export function info(message) {
    console.log(message);
}

export function log(message) {
    if (Config.get("debug") === 1) {
        console.log(message);
    }
}