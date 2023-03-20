const config = {};

function setConfig(cfg) {
    Object.entries(cfg).forEach(([k,v]) => config[k] = v);
}

export async function init(configpath, defaults) {
    setConfig(defaults || {});

    if (!configpath) {
        console.log("fail to find config path");
        return;
    }
    configpath = configpath.trim();

    try {
        const response = await fetch(configpath);
        const cfg = await response.json();

        setConfig(cfg);
    }
    catch(err) {
        console.log(`error while config loading: ${err.message}`);
        setConfig({});
    }
}

export function get(name) {
    return config[name];
}

export function set(name, value) {
    if (!Object.hasOwn(config, name)) {
        config[name] = value;
    }
}

export function initDQLUri() {
    const buri = get("staturi");

    if (buri && buri.length) {
        return buri;
    }

    // Logger.debug("STATS prepare baseuri");

    const proto = get("proto") || "https://",
                host  = get("host") || "",
                path  = get("stats") || "";

    const baseuri = `${host.length ? proto : ""}${host}${host.length && host.at(-1) !== "/" ? "/" : ""}${path}`;

    set("staturi", baseuri);

    return baseuri;
}

export function initGQLUri(){
    const buri = get("baseuri");

    if (buri && buri.length) {
        return buri;
    }

    const proto = get("proto") || "https://",
                host  = get("host") || "",
                path  = get("path") || "";


    const baseuri = `${host.length ? proto : ""}${host}${host.length && host.at(-1) !== "/" ? "/" : ""}${path}`;

    set("baseuri", baseuri);

    return baseuri;
}

