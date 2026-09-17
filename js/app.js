import {
  state,
  subscribe,
  setRequest,
  replaceRequest,
  markDirty,
  syncTab,
  newTab,
  activateTab,
  closeTab,
  persist,
  undo,
  redo,
  activeEnv,
} from "./state.js";

import {
  renderRequest,
  bindRequest,
  prepareRequest,
  effectiveURL,
} from "./request-builder.js";

import { request } from "./api-client.js";

import {
  render as renderResponse,
  bind as bindResponse,
} from "./response-viewer.js";

import * as History from "./history.js";
import * as Collections from "./collections.js";
import * as Envs from "./environments.js";
import * as Code from "./code-generator.js";

import {
  exportWorkspace,
  importWorkspace,
  importCurl,
} from "./import-export.js";

import { initKeyboard } from "./keyboard.js";
import { init as initToast, toast } from "./notifications.js";
import { apply as applyTheme, setTheme } from "./theme.js";

import { esc, formatDuration, resolveVars, unresolvedVars } from "./utils.js";

import { go, current } from "./router.js";

window.endpointToast = toast;

initToast();
applyTheme();

let viewKey = "";

/* =========================================================
   SHELL
========================================================= */

function shell() {
  const env = activeEnv();

  return `
    <div class="h-full flex flex-col bg-shell">

      <header class="h-12 shrink-0 border-b border-line flex items-center px-3 gap-3 bg-panel">

        <button
          class="btn iconbtn"
          id="sidebar-toggle"
          title="Toggle sidebar"
        >
        <i class='fa-solid fa-bars'></i>
        </button>

        <div class="font-bold tracking-tight text-sm">
          Endpoint
          <span class="text-muted font-normal">
            / API Request Builder
          </span>
        </div>

        <div class="h-5 w-px bg-[var(--line)]"></div>

        <button
          class="btn flex items-center justify-center gap-2"
          id="env-switch"
        >
        <i class='fa-solid fa-circle fa-xs'></i>
        ${esc(env?.name || "No environment")}
        <i class='fa-solid fa-chevron-down fa-xs'></i>
        </button>

        <div class="flex-1"></div>

        <button class="btn" data-action="global-search">
          Search
          <i class="fa-solid fa-magnifying-glass pl-2"></i>
        </button>

        <button class="btn" data-open="settings">
        Settings
        </button>

        <button class="btn" data-action="theme">
          ${state.settings.theme === "dark" ? "<i class='fa-solid fa-moon'></i>" : "<i class='fa-solid fa-sun'></i>"}
        </button>


      </header>

      <div class="flex flex-1 min-h-0 relative">

        <aside
          id="sidebar"
          class="desktop-sidebar w-60 shrink-0 border-r border-line bg-panel overflow-hidden ${
            state.ui.sidebar ? "open" : ""
          }"
        >
          ${sidebar()}
        </aside>

        <div
          class="mobile-overlay fixed inset-0 z-40 bg-black/60 hidden"
          id="overlay"
        ></div>

        <main class="flex-1 min-w-0 min-h-0">
          ${main()}
        </main>

      </div>

    </div>
  `;
}

/* =========================================================
   SIDEBAR
========================================================= */

function sidebar() {
  const route = current();

  return `
    <div class="p-2 border-b border-line flex gap-1">

      <button
        class="btn btn-primary flex-1"
        data-new
      >
      <i class="fa-solid fa-plus"></i>  
      New
      </button>

      <button
        class="btn iconbtn"
        data-import-curl
        title="Import cURL"
      >
        <i class="fa-solid fa-file-import"></i>
      </button>

    </div>

    <nav class="p-2 space-y-1 text-xs">

      <button
        class="tree-item w-full text-left px-2 py-2 rounded ${
          route === "workspace" ? "active" : ""
        }"
        data-nav="workspace"
      >
      <i class="fa-solid fa-plus pr-2"></i>
        Workspace
      </button>

      <button
        class="tree-item w-full text-left px-2 py-2 rounded ${
          route === "collections" ? "active" : ""
        }"
        data-nav="collections"
      >
      <i class="fa-solid fa-folder pr-2"></i>  
      Collections
      </button>

      <button
        class="tree-item w-full text-left px-2 py-2 rounded ${
          route === "history" ? "active" : ""
        }"
        data-nav="history"
      >
      <i class="fa-solid fa-clock-rotate-left pr-2"></i>  
      History
        <span class="float-right text-muted">
          ${state.history.length}
        </span>
      </button>

      <button
        class="tree-item w-full text-left px-2 py-2 rounded ${
          route === "environments" ? "active" : ""
        }"
        data-nav="environments"
      >
      <i class="fa-solid fa-layer-group pr-2 "></i>
        Environments
      </button>

      <button
        class="tree-item w-full text-left px-2 py-2 rounded ${
          route === "code" ? "active" : ""
        }"
        data-nav="code"
      >
      <i class="fa-solid fa-code pr-2"></i>
        Code Generator
      </button>

    </nav>

    <div class="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-muted">
      Open requests
    </div>

    <div class="px-2 space-y-1">

      ${state.tabs
        .map(
          (tab) => `
            <div
              class="tree-item ${
                tab.id === state.activeTab ? "active" : ""
              } rounded flex items-center"
            >

              <button
                class="flex-1 text-left px-2 py-2 min-w-0"
                data-request-tab-id="${esc(tab.id)}"
              >
                <div class="flex items-center gap-1">

                  <span class="method method-${esc(tab.request.method)}">
                    ${esc(tab.request.method)}
                  </span>

                  <span class="truncate text-xs">
                    ${esc(tab.name)}${tab.dirty ? " •" : ""}
                  </span>

                </div>
              </button>

              <button
                class="btn btn-ghost iconbtn"
                data-close-request="${esc(tab.id)}"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>

            </div>
          `,
        )
        .join("")}

    </div>
  `;
}

/* =========================================================
   MAIN ROUTER VIEW
========================================================= */

function main() {
  const route = current();

  if (route === "history") {
    return `
      <div class="h-full bg-panel">
        ${History.renderPanel()}
      </div>
    `;
  }

  if (route === "collections") {
    return `
      <div class="h-full bg-panel">
        ${Collections.renderPanel()}
      </div>
    `;
  }

  if (route === "environments") {
    return `
      <div class="h-full overflow-auto scroll p-4 md:p-6">
        ${Envs.renderPanel()}
      </div>
    `;
  }

  if (route === "code") {
    return `
      <div class="h-full bg-panel">
        ${Code.render()}
      </div>
    `;
  }

  if (route === "settings" || route === "shortcuts") {
    return settingsPage(route);
  }

  return workspace();
}

/* =========================================================
   WORKSPACE
========================================================= */

function workspace() {
  return `
    <div class="h-full flex flex-col bg-panel">

      <!-- Request tabs -->
      <div class="h-10 shrink-0 border-b border-line flex items-center overflow-x-auto">

        ${state.tabs
          .map(
            (tab) => `
              <div
                class="h-full flex items-center border-r border-line ${
                  tab.id === state.activeTab ? "bg-panel2" : ""
                }"
              >

                <button
                  class="px-3 text-xs ${
                    tab.id === state.activeTab ? "text-main" : "text-muted"
                  }"
                  data-request-tab-id="${esc(tab.id)}"
                >
                  ${esc(tab.name)}${tab.dirty ? " •" : ""}
                </button>

                <button
                  class="btn btn-ghost iconbtn"
                  data-close-request="${esc(tab.id)}"
                >
                  <i class='fa-solid fa-xmark'></i>
                </button>

              </div>
            `,
          )
          .join("")}

        <button
          class="btn btn-ghost iconbtn m-1"
          data-new
          title="New request"
        >
          <i class="fa-solid fa-plus"></i>
        </button>

      </div>


      <!-- Request URL bar -->
      <div class="p-3 border-b border-line">

        <div class="flex gap-2">

          <select
            id="method"
            class="input rounded-lg px-3 py-2 mono font-semibold w-28"
          >
            ${[
              "GET",
              "POST",
              "PUT",
              "PATCH",
              "DELETE",
              "HEAD",
              "OPTIONS",
              "TRACE",
            ]
              .map(
                (method) => `
                  <option
                    value="${method}"
                    ${state.request.method === method ? "selected" : ""}
                  >
                    ${method}
                  </option>
                `,
              )
              .join("")}
          </select>

          <input
            id="url"
            class="input flex-1 min-w-0 rounded-lg px-3 py-2 mono text-sm"
            placeholder="https://api.example.com/resource or {{baseUrl}}/resource"
            value="${esc(state.request.url)}"
          />

          <button
            class="btn btn-primary px-5"
            id="send"
            ${state.ui.loading ? "disabled" : ""}
          >
            ${state.ui.loading ? "SENDING…" : "SEND"}
            <i class="fa-solid fa-paper-plane ml-1"></i>
          </button>

        </div>

        <div class="mt-2 flex items-center gap-2 text-[10px] text-muted">

          <span>Resolved:</span>

          <span class="mono truncate">
            ${esc(
              resolveVars(
                effectiveURL(),
                Object.fromEntries(
                  (activeEnv()?.variables || []).map((v) => [
                    v.key,
                    v.currentValue,
                  ]),
                ),
              ),
            )}
          </span>

          ${unresolvedVars(state.request.url)
            .map(
              (v) => `
                <span class="badge text-red-400">
                  ${esc(v)} unresolved
                </span>
              `,
            )
            .join("")}

        </div>

      </div>


      <!-- Request / response -->
      <div
        class="flex-1 min-h-0 grid request-response"
        style="
          grid-template-rows:
            ${state.ui.requestSplit}%
            8px
            ${100 - state.ui.requestSplit}%;
        "
      >

        <!-- Request -->
        <section
          id="request-section"
          class="min-h-0 border-b border-line overflow-hidden"
        >
          <div
            id="request-pane"
            class="h-full"
          >
            ${renderRequest()}
          </div>
        </section>


        <!-- Splitter -->
        <div
          class="resizer-h"
          id="horizontal-split"
          title="Resize request/response"
        ></div>


        <!-- Response -->
        <section
          id="response-section"
          class="min-h-0 overflow-hidden bg-panel2"
        >
          ${renderResponse()}
        </section>

      </div>

    </div>
  `;
}

/* =========================================================
   SETTINGS
========================================================= */

function settingsPage(which) {
  return `
    <div class="h-full overflow-auto scroll bg-panel p-5 md:p-8">

      <div class="max-w-3xl mx-auto">

        <div class="flex items-end justify-between mb-6">

          <div>

            <div class="text-xl font-bold">
              ${which === "shortcuts" ? "Keyboard shortcuts" : "Settings"}
            </div>

            <div class="text-xs text-muted mt-1">
              ${
                which === "shortcuts"
                  ? "Command desk controls"
                  : "Local workspace preferences"
              }
            </div>

          </div>

        </div>

        ${which === "shortcuts" ? shortcuts() : settings()}

      </div>

    </div>
  `;
}

function settings() {
  return `
    <div class="space-y-6">

      <section>

        <h3 class="text-sm font-semibold mb-2">
          Appearance
        </h3>

        <select
          class="input rounded px-3 py-2 w-full"
          id="theme-setting"
        >

          <option
            value="dark"
            ${state.settings.theme === "dark" ? "selected" : ""}
          >
            Dark
          </option>

          <option
            value="light"
            ${state.settings.theme === "light" ? "selected" : ""}
          >
            Light
          </option>

          <option
            value="system"
            ${state.settings.theme === "system" ? "selected" : ""}
          >
            System
          </option>

        </select>

      </section>


      <section>

        <h3 class="text-sm font-semibold mb-2">
          Request & history
        </h3>

        <label
          class="flex items-center justify-between border border-line rounded p-3 text-xs"
        >
          Enable history

          <input
            type="checkbox"
            id="history-setting"
            ${state.settings.historyEnabled ? "checked" : ""}
          />
        </label>

        <label class="block text-xs mt-2">
          Maximum history entries

          <input
            class="input rounded px-2 py-2 w-full mt-1"
            id="max-history"
            type="number"
            min="10"
            max="1000"
            value="${state.settings.maxHistory}"
          />
        </label>

      </section>


      <section>

        <h3 class="text-sm font-semibold mb-2">
          Privacy & data
        </h3>

        <div class="flex gap-2 flex-wrap">

          <button class="btn" data-export>
            Export workspace
          </button>

          <button class="btn" data-import>
            Import workspace
          </button>

          <button class="btn btn-danger" data-reset>
            Reset local data
          </button>

        </div>

        <p class="text-xs text-muted mt-2">
          Endpoint stores workspace data in browser localStorage.
          This is not a secure OS credential vault. Secrets are masked
          in the editor, but localStorage is accessible to scripts
          running in the same origin.
        </p>

      </section>

    </div>
  `;
}

function shortcuts() {
  return `
    <div class="border border-line rounded-lg overflow-hidden">

      ${[
        ["Ctrl + Enter", "Send request"],
        ["Ctrl + S", "Save request"],
        ["Ctrl + K", "Command palette"],
        ["Ctrl + F", "Global/response search"],
        ["Ctrl + /", "Focus URL"],
        ["Escape", "Close modal/palette"],
      ]
        .map(
          ([key, label]) => `
            <div
              class="flex justify-between px-4 py-3 border-b border-line text-xs"
            >
              <span>${label}</span>
              <span class="kbd">${key}</span>
            </div>
          `,
        )
        .join("")}

    </div>
  `;
}

/* =========================================================
   RENDER
========================================================= */

function render() {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = shell();

  bindShell();

  if (current() === "workspace") {
    const requestPane = document.querySelector("#request-pane");

    if (requestPane) {
      bindRequest(requestPane);
    }

    const responseSection = document.querySelector("#response-section");

    if (responseSection) {
      bindResponse(responseSection);
    }
  }

  if (current() === "history") {
    History.bindPanel(document.querySelector("main"));
  }

  if (current() === "collections") {
    Collections.bindPanel(document.querySelector("main"));
  }

  if (current() === "environments") {
    Envs.bindPanel(document.querySelector("main"));
  }

  if (current() === "code") {
    Code.bind(document.querySelector("main"));
  }

  if (current() === "settings") {
    document
      .querySelector("#theme-setting")
      ?.addEventListener("change", (event) => {
        setTheme(event.target.value);
      });

    document
      .querySelector("#history-setting")
      ?.addEventListener("change", (event) => {
        state.settings.historyEnabled = event.target.checked;

        persist();
      });

    document
      .querySelector("#max-history")
      ?.addEventListener("change", (event) => {
        state.settings.maxHistory = Math.max(
          10,
          Math.min(1000, Number(event.target.value)),
        );

        persist();
      });
  }
}

/* =========================================================
   SHELL EVENTS
========================================================= */

function bindShell() {
  /* Navigation */
  document.querySelectorAll("[data-nav]").forEach((element) => {
    element.addEventListener("click", () => {
      go(element.dataset.nav);
    });
  });

  /* Settings / shell navigation */
  document.querySelectorAll("[data-open]").forEach((element) => {
    element.addEventListener("click", () => {
      go(element.dataset.open);
    });
  });

  /*
   * IMPORTANT:
   *
   * Do NOT use:
   *
   * document.querySelectorAll("[data-tab]")
   *
   * here.
   *
   * Request Builder uses its own tab controls for:
   * Params / Body / Headers / Auth.
   *
   * Application tabs therefore use:
   * data-request-tab-id
   */
  document.querySelectorAll("[data-request-tab-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const id = element.dataset.requestTabId;

      if (!id || id === state.activeTab) {
        return;
      }

      activateTab(id);
      go("workspace");
    });
  });

  /* Close request */
  document.querySelectorAll("[data-close-request]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      closeTab(element.dataset.closeRequest);
    });
  });

  /* New request */
  document.querySelectorAll("[data-new]").forEach((element) => {
    element.addEventListener("click", () => {
      newTab();
      go("workspace");
    });
  });

  /* Sidebar */
  document.querySelector("#sidebar-toggle")?.addEventListener("click", () => {
    state.ui.sidebar = !state.ui.sidebar;

    document
      .querySelector("#sidebar")
      ?.classList.toggle("open", state.ui.sidebar);

    document
      .querySelector("#overlay")
      ?.classList.toggle("hidden", state.ui.sidebar);
  });

  /* Mobile overlay */
  document.querySelector("#overlay")?.addEventListener("click", () => {
    state.ui.sidebar = false;

    render();
  });

  /* HTTP method */
  document.querySelector("#method")?.addEventListener("change", (event) => {
    setRequest({
      method: event.target.value,
    });

    markDirty();
  });

  /* URL */
  document.querySelector("#url")?.addEventListener("input", (event) => {
    setRequest(
      {
        url: event.target.value,
      },
      {
        history: false,
      },
    );

    markDirty(false);
  });

  /* Send */
  document.querySelector("#send")?.addEventListener("click", send);

  /* Theme */
  document
    .querySelector('[data-action="theme"]')
    ?.addEventListener("click", () => {
      setTheme(state.settings.theme === "dark" ? "light" : "dark");
    });

  /* Global search */
  document
    .querySelector('[data-action="global-search"]')
    ?.addEventListener("click", () => {
      palette(true);
    });

  /* Import cURL */
  document
    .querySelector("[data-import-curl]")
    ?.addEventListener("click", curlModal);

  /* Export */
  document
    .querySelector("[data-export]")
    ?.addEventListener("click", exportWorkspace);

  /* Import */
  document.querySelector("[data-import]")?.addEventListener("click", () => {
    document.querySelector("#file-import")?.click();
  });

  /* Reset */
  document.querySelector("[data-reset]")?.addEventListener("click", reset);

  /* Environment */
  document.querySelector("#env-switch")?.addEventListener("click", () => {
    go("environments");
  });

  /* Request/response splitter */
  bindSplitter();
}

/* =========================================================
   SPLITTER
========================================================= */

function bindSplitter() {
  const split = document.querySelector("#horizontal-split");

  const container = document.querySelector(".request-response");

  if (!split || !container) {
    return;
  }

  let dragging = false;

  const update = (event) => {
    if (!dragging) return;

    const rect = container.getBoundingClientRect();

    if (!rect.height) return;

    state.ui.requestSplit = Math.max(
      20,
      Math.min(80, ((event.clientY - rect.top) / rect.height) * 100),
    );

    container.style.gridTemplateRows = `${state.ui.requestSplit}% 8px ${
      100 - state.ui.requestSplit
    }%`;
  };

  const stop = () => {
    if (!dragging) return;

    dragging = false;

    document.body.classList.remove("resizing");

    persist();
  };

  split.addEventListener("mousedown", (event) => {
    event.preventDefault();

    dragging = true;

    document.body.classList.add("resizing");
  });

  window.addEventListener("mousemove", update);

  window.addEventListener("mouseup", stop);
}

/* =========================================================
   SEND REQUEST
========================================================= */

async function send() {
  if (state.ui.loading) {
    return;
  }

  let config;

  try {
    config = prepareRequest();
  } catch (error) {
    toast(error?.message || "Unable to prepare request.", "error");

    return;
  }

  state.ui.loading = true;

  render();

  try {
    const response = await request(config);

    state.response = response;

    /*
     * Important for the supplied state.js:
     * save the response into the active request tab.
     */
    syncTab();

    History.record(config, response);

    markDirty(false);

    toast(
      `${response.status} ${response.statusText} · ${formatDuration(
        response.duration,
      )}`,
    );
  } catch (error) {
    state.response = {
      status: 0,
      statusText: "Request failed",
      headers: {},
      body: error?.message || "Request failed.",
      bodyKind: "text",
      duration: 0,
      size: 0,
      type: "error",
      finalUrl: config.url,
    };

    syncTab();

    toast(error?.message || "Request failed.", "error");
  } finally {
    state.ui.loading = false;

    persist();

    render();
  }
}

/* =========================================================
   SAVE
========================================================= */

function save() {
  Collections.saveCurrent();

  toast("Request saved");
}

/* =========================================================
   COMMAND PALETTE
========================================================= */

function palette(searchOnly = false) {
  state.ui.commandOpen = true;
  state.ui.paletteSearch = searchOnly ? "" : "";

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="fixed inset-0 z-[90] modal-backdrop flex items-start justify-center pt-[12vh]"
        id="palette"
      >

        <div
          class="bg-panel border border-line rounded-xl shadow-2xl w-[min(680px,calc(100vw-24px))] overflow-hidden"
        >

          <input
            id="palette-input"
            autofocus
            class="input w-full border-0 border-b border-line rounded-none px-4 py-3"
            placeholder="Search commands…"
          />

          <div
            id="palette-list"
            class="max-h-[55vh] overflow-auto scroll"
          ></div>

        </div>

      </div>
    `,
  );

  const commands = [
    ["New Request", () => newTab()],

    ["Send Request", send],

    ["Save Request", save],

    [
      "Duplicate Request",
      () => newTab(state.request, `${state.request.method} copy`),
    ],

    ["Open History", () => go("history")],

    ["Open Collections", () => go("collections")],

    ["Open Environments", () => go("environments")],

    ["Generate cURL", () => go("code")],

    ["Export Workspace", exportWorkspace],

    ["Import cURL", curlModal],

    [
      "Toggle Theme",
      () => setTheme(state.settings.theme === "dark" ? "light" : "dark"),
    ],

    [
      "Clear Response",
      () => {
        state.response = null;
        syncTab();
        persist();
      },
    ],

    ["Focus URL", () => document.querySelector("#url")?.focus()],

    ["Keyboard shortcuts", () => go("shortcuts")],
  ];

  const list = document.querySelector("#palette-list");

  const input = document.querySelector("#palette-input");

  const paint = () => {
    const query = input.value.toLowerCase();

    list.innerHTML = commands
      .filter(([label]) => label.toLowerCase().includes(query))
      .map(
        ([label], index) => `
          <button
            class="command-item w-full text-left border-b border-line px-4 py-3 text-xs"
            data-command-index="${index}"
          >
            ${esc(label)}
          </button>
        `,
      )
      .join("");

    list.querySelector("[data-command-index]")?.classList.add("active");
  };

  paint();

  input.addEventListener("input", paint);

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-command-index]");

    if (!button) {
      return;
    }

    const index = Number(button.dataset.commandIndex);

    document.querySelector("#palette")?.remove();

    commands[index]?.[1]?.();

    render();
  });

  document.querySelector("#palette").addEventListener("click", (event) => {
    if (event.target.id === "palette") {
      event.target.remove();
    }
  });
}

/* =========================================================
   CURL MODAL
========================================================= */

function curlModal() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="fixed inset-0 z-[95] modal-backdrop flex items-center justify-center p-4"
        id="curl-modal"
      >

        <div
          class="bg-panel border border-line rounded-xl shadow-2xl w-[min(800px,100%)]"
        >

          <div
            class="px-4 py-3 border-b border-line flex justify-between"
          >

            <div class="font-semibold text-sm">
              Import cURL
            </div>

            <button
              class="btn iconbtn"
              data-curl-close
            >
              <i class="fa-solid fa-xmark"></i>
            </button>

          </div>

          <textarea
            id="curl-input"
            class="input code-editor w-full min-h-[220px] rounded-none border-0 p-4"
            placeholder="curl -X GET https://example.com ..."
          ></textarea>

          <div
            class="p-3 flex justify-end gap-2 border-t border-line"
          >

            <button
              class="btn"
              data-curl-close
            >
              Cancel
            </button>

            <button
              class="btn btn-primary"
              data-curl-go
            >
              Parse request
            </button>

          </div>

        </div>

      </div>
    `,
  );

  document
    .querySelectorAll("#curl-modal [data-curl-close]")
    .forEach((element) => {
      element.addEventListener("click", () => {
        document.querySelector("#curl-modal")?.remove();
      });
    });

  document.querySelector("[data-curl-go]")?.addEventListener("click", () => {
    try {
      const output = importCurl(document.querySelector("#curl-input").value);

      replaceRequest(output.request);

      markDirty();

      document.querySelector("#curl-modal")?.remove();

      go("workspace");

      toast(
        output.warnings.length
          ? `Imported with ${output.warnings.length} warning(s)`
          : "cURL imported",
      );
    } catch (error) {
      toast(error?.message || "Unable to import cURL.", "error");
    }
  });
}

/* =========================================================
   RESET
========================================================= */

function reset() {
  if (
    !confirm(
      "Reset Endpoint? This deletes collections, environments, history, settings and open workspace data.",
    )
  ) {
    return;
  }

  localStorage.clear();

  location.reload();
}

/* =========================================================
   FILE IMPORT
========================================================= */

function bindFileImport() {
  const input = document.querySelector("#file-import");

  if (!input) {
    return;
  }

  input.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    importWorkspace(file)
      .then(() => {
        toast("Workspace imported");
        render();
      })
      .catch((error) => {
        toast(error?.message || "Workspace import failed.", "error");
      })
      .finally(() => {
        event.target.value = "";
      });
  });
}

/* =========================================================
   GLOBAL EVENTS
========================================================= */

window.addEventListener("hashchange", render);

/*
 * State changes:
 *
 * We intentionally re-render the workspace so that
 * request/response state stays synchronized.
 *
 * Request Builder owns Params/Body/Headers/Auth tab
 * interaction. The shell does NOT intercept those
 * controls.
 */
subscribe(() => {
  persist();

  if (viewKey !== current()) {
    viewKey = current();
  }

  render();
});

/* =========================================================
   INITIALIZE
========================================================= */

viewKey = current();

render();

bindFileImport();

/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

initKeyboard({
  send,

  save,

  palette: () => palette(),

  search: () => palette(true),

  url: () => document.querySelector("#url")?.focus(),

  escape: () => {
    document.querySelector("#palette")?.remove();

    document.querySelector("#curl-modal")?.remove();
  },
});
