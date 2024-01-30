import * as Events from "../Events.mjs";

Events.listen.settingsShow(renderSettings);

/**
 * Called during init of the sidebar element.
 *
 * @param {*} target sidebar element
 */
export function init() {
    registerInteractions();

    Events.listen.settingsReindexDone(reenableReindex);
}

/**
 * Verify whether the settings overlay is active.
 */
function isActive() {
    const menuitemCls  = document.querySelector(".active #settings-menu");

    return menuitemCls !== null;
}

/**
 * register the event handler for the language menu
 */
function registerInteractions() {
    const menuoverlay = document.querySelector(".menuoverlay");

    menuoverlay.addEventListener("click", changeLanguage);
    menuoverlay.addEventListener("click", forceReindex);
}

/**
 * changes the UI language
 *
 * TODO: replace by a CSS solution (issue #136)
 */
function changeLanguage() {
    if (!isActive()) {
        return;
    }

    const checkedLang  = document.querySelector(".settings-lang input[type=radio][name=lang]:checked");

    document.querySelector("html").setAttribute("lang", checkedLang.value);
}

/**
 * register the event handler for the clear index button
 */
function forceReindex(event) {
    if (!isActive() || event.target.id !== "clearindex") {
        return;
    }

    console.log("clear index terms");

    // Disable the button once clicked
    event.target.disabled = true;

    Events.trigger.settingsReindex();
}

/**
 * reactivate the reindexing once the model sends the signal
 */
function reenableReindex() {
    const button = document.querySelector(".settings #clearindex");

    button.disabled = false;
}

/**
 * Renders the settings menu content.
 */
function renderSettings() {
    const template = document.querySelector("#templateSettingsMenu");
    const overlay = document.querySelector("#overlaycontent");

    overlay.textContent = "";

    const container = template.content.cloneNode(true);

    const lang = document.querySelector("html").getAttribute("lang") || "de";

    // should move to CSS (issue #136)
    container.querySelector(`.settings-lang #settings-lang-${lang}`).setAttribute("checked", true);

    overlay.appendChild(container);
}
