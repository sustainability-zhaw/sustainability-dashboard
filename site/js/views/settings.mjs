import * as Events from "../Events.mjs";

Events.listen.settingsShow(renderSettings);

/**
 * Called during init of the sidebar element.
 *
 * @param {*} target sidebar element
 */
export function init() {}

/**
 * Renders the settings menu content.
 */
function renderSettings() {
    const template = document.querySelector("#templateSettingsMenu");
    const overlay = document.querySelector("#overlaycontent");

    overlay.textContent = "";

    const container = template.content.cloneNode(true);

    const lang = document.querySelector("html").getAttribute("lang") || "de";

    container.querySelector(`.settings-lang #settings-lang-${lang}`).setAttribute("checked", true);

    container.querySelectorAll(".settings-lang input[type=radio][name=lang]").forEach(el => {
        el.addEventListener("click", (e) => {
            document.querySelector("html").setAttribute("lang", e.currentTarget.value);
        });
    });

    container.querySelector(".settings-clear-index").addEventListener("click", async () => {
        console.log("TODO: Link to clear index");
    });

    overlay.appendChild(container);
}
