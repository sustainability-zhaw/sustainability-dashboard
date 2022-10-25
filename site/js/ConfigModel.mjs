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
