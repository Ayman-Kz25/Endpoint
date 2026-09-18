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

import {
  esc,
  formatDuration,
  resolveVars,
  unresolvedVars,
} from "./utils.js";

import { go, current } from "./router.js";

window.endpointToast = toast;

initToast();
applyTheme();

let viewKey = "";


/* =========================================================
   HELPERS
   ========================================================= */

function getResolvedURL() {
  const env = activeEnv();

  const variables = Object.fromEntries(
    (env?.variables || []).map((variable) => [
      variable.key,
      variable.currentValue,
    ]),
  );

  return resolveVars(effectiveURL(), variables);
}


/* =========================================================
   APP SHELL
   ========================================================= */

function shell() {
  const env = activeEnv();

  const sidebarOpen = Boolean(state.ui.sidebar);
  const overlayHidden = !sidebarOpen;

  return `
    <div
      class="h-full min-h-0 flex flex-col bg-shell overflow-hidden"
      id="app-shell"
    >

      <!-- =================================================
           HEADER
           ================================================= -->

      <header
        class="app-header h-12 shrink-0 border-b border-line bg-panel"
      >

        <div class="app-header-left">

          <!-- Sidebar -->
          <button
            class="btn iconbtn shrink-0"
            id="sidebar-toggle"
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
            aria-expanded="${sidebarOpen}"
          >
            <i class="fa-solid fa-bars-staggered"></i>
          </button>


          <!-- Brand -->
          <div class="app-brand">
            
            <div class="font-bold tracking-tight text-sm">
              Endpoint
            </div>

            <span class="app-brand-subtitle text-muted font-normal">
              / API Request Builder
            </span>
          </div>


          <!-- Divider -->
          <div class="app-header-divider"></div>


          <!-- Environment -->
          <button
            class="btn app-env-button"
            id="env-switch"
            title="Active Environment"
          >
          <i class="fa-regular fa-circle-dot fa-sm"></i>

            <span class="app-env-name truncate">
              ${esc(env?.name || "No environment")}
            </span>

            <i class="fa-solid fa-caret-down"></i>
          </button>

        </div>


        <!-- Header actions -->
        <div class="app-header-actions">

          <button
            class="btn"
            data-action="global-search"
            title="Search"
          >
            <span class="app-search-label">Search</span>
            <i class="fa-solid fa-magnifying-glass"></i>
          </button>

          <button
            class="btn"
            data-open="settings"
          >
            Settings
          </button>

          <button
            class="btn iconbtn"
            data-action="theme"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            ${
              state.settings.theme === "dark"
                ? '<i class="fa-solid fa-toggle-off"></i>'
                : '<i class="fa-solid fa-toggle-on"></i>'
            }
          </button>

        </div>

      </header>


      <!-- =================================================
           APP BODY
           ================================================= -->

      <div class="flex flex-1 min-h-0 relative">

        <!-- Sidebar -->
        <aside
          id="sidebar"
          class="desktop-sidebar border-r border-line bg-panel ${
            sidebarOpen
          }"
        >
          ${sidebar()}
        </aside>


        <!-- Mobile overlay -->
        <div
          id="overlay"
          class="mobile-overlay fixed inset-0 z-40 bg-black/60 ${
            overlayHidden ? "hidden" : ""
          }"
          aria-hidden="${overlayHidden}"
        ></div>


        <!-- Main -->
        <main
          class="flex-1 min-w-0 min-h-0"
          id="main-content"
        >
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
    <div class="min-h-full flex flex-col">

      <!-- Sidebar actions -->
      <div class="p-2 border-b border-line flex gap-1">

        <button
          class="btn btn-primary flex-1"
          data-new
        >
          <i class="fa-regular fa-plus"></i>
          <span>New</span>
        </button>

        <button
          class="btn iconbtn"
          data-import-curl
          title="Import cURL"
          aria-label="Import cURL"
        >
          <i class="fa-solid fa-upload"></i>
        </button>

      </div>


      <!-- Navigation -->
      <nav
        class="p-2 space-y-1 text-xs"
        aria-label="Main navigation"
      >

        ${sidebarNavButton(
          "workspace",
          "fa-regular fa-square-plus",
          "Workspace",
          route,
        )}

        ${sidebarNavButton(
          "collections",
          "fa-regular fa-folder-open",
          "Collections",
          route,
        )}

        <button
          class="tree-item w-full text-left p-5 py-2 rounded ${
            route === "history" ? "active" : ""
          }"
          data-nav="history"
        >
          <i class="fa-solid fa-clock-rotate-left"></i>

          <span>History</span>

          <span class="float-right text-muted">
            ${state.history.length}
          </span>
        </button>

        ${sidebarNavButton(
          "environments",
          "fa-solid fa-layer-group",
          "Environments",
          route,
        )}

        ${sidebarNavButton(
          "code",
          "fa-solid fa-code",
          "Code Generator",
          route,
        )}

      </nav>


      <!-- Open requests -->
      <div
        class="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-muted"
      >
        Open requests
      </div>


      <div class="px-2 pb-3 space-y-1 min-w-0">

        ${
          state.tabs.length
            ? state.tabs.map(renderSidebarTab).join("")
            : `
              <div class="px-2 py-3 text-xs text-muted">
                No open requests
              </div>
            `
        }

      </div>

    </div>
  `;
}


function sidebarNavButton(routeName, icon, label, activeRoute) {
  return `
    <button
      class="tree-item w-full text-left px-5 py-2 rounded ${
        activeRoute === routeName ? "active" : ""
      }"
      data-nav="${routeName}"
    >
      <i class="${icon} sidebarIcon"></i>
      <span>${label}</span>
    </button>
  `;
}


function renderSidebarTab(tab) {
  const active = tab.id === state.activeTab;

  return `
    <div
      class="tree-item ${
        active ? "active" : ""
      } rounded flex items-center min-w-0"
    >

      <button
        class="flex-1 text-left px-2 py-2 min-w-0 overflow-hidden"
        data-request-tab-id="${esc(tab.id)}"
        title="${esc(tab.name)}"
      >

        <div class="flex items-center gap-1 min-w-0">

          <span
            class="method method-${esc(tab.request.method)} shrink-0"
          >
            ${esc(tab.request.method)}
          </span>

          <span class="truncate text-xs">
            ${esc(tab.name)}${tab.dirty ? " •" : ""}
          </span>

        </div>

      </button>


      <button
        class="btn btn-ghost iconbtn shrink-0"
        data-close-request="${esc(tab.id)}"
        title="Close request"
        aria-label="Close request"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>

    </div>
  `;
}


/* =========================================================
   MAIN ROUTER VIEW
   ========================================================= */

function main() {
  const route = current();

  switch (route) {
    case "history":
      return `
        <div class="h-full min-h-0 bg-panel">
          ${History.renderPanel()}
        </div>
      `;

    case "collections":
      return `
        <div class="h-full min-h-0 bg-panel">
          ${Collections.renderPanel()}
        </div>
      `;

    case "environments":
      return `
        <div class="h-full min-h-0 overflow-auto scroll bg-panel p-4 md:p-6">
          ${Envs.renderPanel()}
        </div>
      `;

    case "code":
      return `
        <div class="h-full min-h-0 bg-panel">
          ${Code.render()}
        </div>
      `;

    case "settings":
    case "shortcuts":
      return settingsPage(route);

    case "workspace":
    default:
      return workspace();
  }
}


/* =========================================================
   WORKSPACE
   ========================================================= */

function workspace() {
  return `
    <div
      class="workspace h-full min-h-0 flex flex-col bg-panel"
    >

      <!-- REQUEST TABS -->
      <div
        class="request-tabs h-10 shrink-0 border-b border-line flex items-center overflow-x-auto"
      >

        ${state.tabs
          .map(
            (tab) => `
              <div
                class="h-full shrink-0 flex items-center border-r border-line ${
                  tab.id === state.activeTab ? "bg-panel2" : ""
                }"
              >

                <button
                  class="h-full px-3 text-xs whitespace-nowrap ${
                    tab.id === state.activeTab
                      ? "text-main"
                      : "text-muted"
                  }"
                  data-request-tab-id="${esc(tab.id)}"
                  title="${esc(tab.name)}"
                >
                  ${esc(tab.name)}${tab.dirty ? " •" : ""}
                </button>

                <button
                  class="btn btn-ghost iconbtn shrink-0"
                  data-close-request="${esc(tab.id)}"
                  title="Close request"
                  aria-label="Close request"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>

              </div>
            `,
          )
          .join("")}


        <!-- New request -->
        <button
          class="btn btn-ghost iconbtn m-1 shrink-0"
          data-new
          title="New request"
          aria-label="New request"
        >
          <i class="fa-solid fa-plus"></i>
        </button>

      </div>


      <!-- =================================================
           REQUEST TOOLBAR
           ================================================= -->

      <div
        class="request-toolbar shrink-0 p-3 border-b border-line"
      >

        <div class="request-url-bar flex min-w-0 gap-2">

          <!-- Method -->
          <select
            id="method"
            class="input request-method rounded-lg px-3 py-2 mono font-semibold"
            aria-label="HTTP method"
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
                    ${
                      state.request.method === method
                        ? "selected"
                        : ""
                    }
                  >
                    ${method}
                  </option>
                `,
              )
              .join("")}
          </select>


          <!-- URL -->
          <input
            id="url"
            class="input request-url-input flex-1 min-w-0 rounded-lg px-3 py-2 text-sm"
            placeholder="https://api.example.com/resource or {{baseUrl}}/resource"
            value="${esc(state.request.url)}"
            autocomplete="off"
            spellcheck="false"
            aria-label="Request URL"
          />


          <!-- Send -->
          <button
            class="btn btn-primary request-send px-5 shrink-0"
            id="send"
            ${state.ui.loading ? "disabled" : ""}
          >
            <span>
              ${state.ui.loading ? "SENDING…" : "SEND"}
            </span>

            <i class="fa-solid fa-paper-plane"></i>
          </button>

        </div>


        <!-- Resolved URL -->
        <div
          class="mt-2 flex min-w-0 items-center gap-2 text-[10px] text-muted"
        >

          <span class="shrink-0">
            Resolved:
          </span>

          <span class="mono truncate min-w-0 resolved-url">
            ${esc(getResolvedURL())}
          </span>

          <span class="unreslved-vars">
          ${unresolvedVars(state.request.url)
            .map(
              (variable) => `
                <span class="badge text-red-400 shrink-0">
                  ${esc(variable)} unresolved
                </span>
              `,
            )
            .join("")}
          </span>
        </div>

      </div>


      <!-- =================================================
           REQUEST / RESPONSE
           ================================================= -->

      <div
        class="flex-1 min-h-0 grid request-response"
        style="
          grid-template-rows:
            ${state.ui.requestSplit}fr
            8px
            ${100 - state.ui.requestSplit}fr;
        "
      >

        <!-- Request -->
        <section
          id="request-section"
          class="min-h-0 border-b border-line overflow-hidden"
        >
          <div
            id="request-pane"
            class="h-full min-h-0"
          >
            ${renderRequest()}
          </div>
        </section>


        <!-- Splitter -->
        <div
          id="horizontal-split"
          class="resizer-h"
          title="Resize request/response"
          role="separator"
          aria-orientation="horizontal"
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
  const shortcutsPage = which === "shortcuts";

  return `
    <div class="h-full min-h-0 overflow-auto scroll bg-panel p-5 md:p-8">

      <div class="max-w-3xl mx-auto">

        <div class="flex items-end justify-between mb-6">

          <div>

            <div class="text-xl font-bold">
              ${shortcutsPage ? "Keyboard shortcuts" : "Settings"}
            </div>

            <div class="text-xs text-muted mt-1">
              ${
                shortcutsPage
                  ? "Command desk controls"
                  : "Local workspace preferences"
              }
            </div>

          </div>

        </div>

        ${shortcutsPage ? shortcuts() : settings()}

      </div>

    </div>
  `;
}


function settings() {
  return `
    <div class="space-y-6">

      <!-- Appearance -->
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


      <!-- History -->
      <section>

        <h3 class="text-sm font-semibold mb-2">
          Request & history
        </h3>

        <label
          class="flex items-center justify-between border border-line rounded p-3 text-xs"
        >
          <span>
            Enable history
          </span>

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


      <!-- Privacy -->
      <section>

        <h3 class="text-sm font-semibold mb-2">
          Privacy & data
        </h3>

        <div class="flex gap-2 flex-wrap">

          <button
            class="btn"
            data-export
          >
            Export workspace
          </button>

          <button
            class="btn"
            data-import
          >
            Import workspace
          </button>

          <button
            class="btn btn-danger"
            data-reset
          >
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
  const items = [
    ["Ctrl + Enter", "Send request"],
    ["Ctrl + S", "Save request"],
    ["Ctrl + K", "Command palette"],
    ["Ctrl + F", "Global/response search"],
    ["Ctrl + /", "Focus URL"],
    ["Escape", "Close modal/palette"],
  ];

  return `
    <div class="border border-line rounded-lg overflow-hidden">

      ${items
        .map(
          ([key, label]) => `
            <div
              class="flex items-center justify-between gap-4 px-4 py-3 border-b border-line text-xs last:border-b-0"
            >
              <span>
                ${esc(label)}
              </span>

              <span class="kbd shrink-0">
                ${esc(key)}
              </span>
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

  if (!app) {
    return;
  }

  app.innerHTML = shell();

  bindShell();

  const route = current();

  if (route === "workspace") {
    bindWorkspace();
  }

  if (route === "history") {
    History.bindPanel(document.querySelector("main"));
  }

  if (route === "collections") {
    Collections.bindPanel(document.querySelector("main"));
  }

  if (route === "environments") {
    Envs.bindPanel(document.querySelector("main"));
  }

  if (route === "code") {
    Code.bind(document.querySelector("main"));
  }

  if (route === "settings") {
    bindSettings();
  }
}


function bindWorkspace() {
  const requestPane = document.querySelector("#request-pane");

  if (requestPane) {
    bindRequest(requestPane);
  }

  const responseSection = document.querySelector("#response-section");

  if (responseSection) {
    bindResponse(responseSection);
  }
}


/* =========================================================
   SETTINGS EVENTS
   ========================================================= */

function bindSettings() {
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
      const value = Number(event.target.value);

      state.settings.maxHistory = Math.max(
        10,
        Math.min(1000, Number.isFinite(value) ? value : 100),
      );

      persist();
    });
}


/* =========================================================
   SHELL EVENTS
   ========================================================= */

function bindShell() {

  /* -------------------------------------------------------
     Navigation
     ------------------------------------------------------- */

  document.querySelectorAll("[data-nav]").forEach((element) => {
    element.addEventListener("click", () => {
      closeMobileSidebar();
      go(element.dataset.nav);
    });
  });


  /* -------------------------------------------------------
     Settings / shell navigation
     ------------------------------------------------------- */

  document.querySelectorAll("[data-open]").forEach((element) => {
    element.addEventListener("click", () => {
      closeMobileSidebar();
      go(element.dataset.open);
    });
  });


  /* -------------------------------------------------------
     Request tabs
     ------------------------------------------------------- */

  document.querySelectorAll("[data-request-tab-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const id = element.dataset.requestTabId;

      if (!id || id === state.activeTab) {
        closeMobileSidebar();
        go("workspace");
        return;
      }

      activateTab(id);

      closeMobileSidebar();

      go("workspace");
    });
  });


  /* -------------------------------------------------------
     Close request
     ------------------------------------------------------- */

  document.querySelectorAll("[data-close-request]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      closeTab(element.dataset.closeRequest);
    });
  });


  /* -------------------------------------------------------
     New request
     ------------------------------------------------------- */

  document.querySelectorAll("[data-new]").forEach((element) => {
    element.addEventListener("click", () => {
      newTab();

      closeMobileSidebar();

      go("workspace");
    });
  });


  /* -------------------------------------------------------
     Sidebar toggle
     ------------------------------------------------------- */

  document
    .querySelector("#sidebar-toggle")
    ?.addEventListener("click", toggleSidebar);


  /* -------------------------------------------------------
     Mobile overlay
     ------------------------------------------------------- */

  document
    .querySelector("#overlay")
    ?.addEventListener("click", closeMobileSidebar);


  /* -------------------------------------------------------
     Method
     ------------------------------------------------------- */

  document
    .querySelector("#method")
    ?.addEventListener("change", (event) => {
      setRequest(
        {
          method: event.target.value,
        },
        {
          history: true,
          emitChange: true,
        },
      );

      markDirty(true, {
        emitChange: true,
      });
    });


  /* -------------------------------------------------------
     URL

     IMPORTANT:
     Do not render on every keystroke.
     ------------------------------------------------------- */

  document
    .querySelector("#url")
    ?.addEventListener("input", (event) => {
      setRequest(
        {
          url: event.target.value,
        },
        {
          history: false,
          emitChange: false,
        },
      );

      markDirty(true, {
        emitChange: false,
      });

      updateResolvedURLPreview();
    });


  /* -------------------------------------------------------
     Send
     ------------------------------------------------------- */

  document
    .querySelector("#send")
    ?.addEventListener("click", send);


  /* -------------------------------------------------------
     Theme
     ------------------------------------------------------- */

  document
    .querySelector('[data-action="theme"]')
    ?.addEventListener("click", () => {
      setTheme(
        state.settings.theme === "dark"
          ? "light"
          : "dark",
      );
    });


  /* -------------------------------------------------------
     Global search
     ------------------------------------------------------- */

  document
    .querySelector('[data-action="global-search"]')
    ?.addEventListener("click", () => {
      palette(true);
    });


  /* -------------------------------------------------------
     Import cURL
     ------------------------------------------------------- */

  document
    .querySelector("[data-import-curl]")
    ?.addEventListener("click", curlModal);


  /* -------------------------------------------------------
     Export
     ------------------------------------------------------- */

  document
    .querySelector("[data-export]")
    ?.addEventListener("click", exportWorkspace);


  /* -------------------------------------------------------
     Import workspace
     ------------------------------------------------------- */

  document
    .querySelector("[data-import]")
    ?.addEventListener("click", () => {
      document.querySelector("#file-import")?.click();
    });


  /* -------------------------------------------------------
     Reset
     ------------------------------------------------------- */

  document
    .querySelector("[data-reset]")
    ?.addEventListener("click", reset);


  /* -------------------------------------------------------
     Environment
     ------------------------------------------------------- */

  document
    .querySelector("#env-switch")
    ?.addEventListener("click", () => {
      closeMobileSidebar();
      go("environments");
    });


  /* -------------------------------------------------------
     Splitter
     ------------------------------------------------------- */

  bindSplitter();
}


/* =========================================================
   SIDEBAR HELPERS
   ========================================================= */

function toggleSidebar() {
  state.ui.sidebar = !state.ui.sidebar;

  const sidebarElement = document.querySelector("#sidebar");
  const overlayElement = document.querySelector("#overlay");
  const toggleElement = document.querySelector("#sidebar-toggle");

  sidebarElement?.classList.toggle(
    "open",
    state.ui.sidebar,
  );

  overlayElement?.classList.toggle(
    "hidden",
    !state.ui.sidebar,
  );

  overlayElement?.setAttribute(
    "aria-hidden",
    String(!state.ui.sidebar),
  );

  toggleElement?.setAttribute(
    "aria-expanded",
    String(state.ui.sidebar),
  );
}


function closeMobileSidebar() {
  if (!state.ui.sidebar) {
    return;
  }

  state.ui.sidebar = false;

  document
    .querySelector("#sidebar")
    ?.classList.remove("open");

  document
    .querySelector("#overlay")
    ?.classList.add("hidden");

  document
    .querySelector("#overlay")
    ?.setAttribute("aria-hidden", "true");

  document
    .querySelector("#sidebar-toggle")
    ?.setAttribute("aria-expanded", "false");
}


/* =========================================================
   RESOLVED URL
   ========================================================= */

function updateResolvedURLPreview() {
  const workspace = document.querySelector(".workspace");

  if (!workspace) {
    return;
  }

  const resolvedElement = workspace.querySelector(
    ".resolved-url",
  );

  if (resolvedElement) {
    resolvedElement.textContent = getResolvedURL();
  }

  const unresolvedContainer = workspace.querySelector(
    ".unresolved-vars",
  );

  if (!unresolvedContainer) {
    return;
  }

  unresolvedContainer.innerHTML = unresolvedVars(
    state.request.url,
  )
    .map(
      (variable) => `
        <span class="badge text-red-400 shrink-0">
          ${esc(variable)} unresolved
        </span>
      `,
    )
    .join("");
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


  const applySplit = (percentage) => {
    state.ui.requestSplit = Math.max(
      20,
      Math.min(80, percentage),
    );

    container.style.gridTemplateRows = `
      ${state.ui.requestSplit}fr
      8px
      ${100 - state.ui.requestSplit}fr
    `;
  };


  const update = (event) => {
    if (!dragging) {
      return;
    }

    const rect = container.getBoundingClientRect();

    if (!rect.height) {
      return;
    }

    const percentage =
      ((event.clientY - rect.top) / rect.height) * 100;

    applySplit(percentage);
  };


  const stop = () => {
    if (!dragging) {
      return;
    }

    dragging = false;

    split.classList.remove("dragging");
    document.body.classList.remove("resizing");

    split.releasePointerCapture?.(
      split.pointerId,
    );

    persist();
  };


  split.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    dragging = true;

    split.classList.add("dragging");
    document.body.classList.add("resizing");

    split.setPointerCapture?.(event.pointerId);
  });


  split.addEventListener("pointermove", update);

  split.addEventListener("pointerup", stop);

  split.addEventListener("pointercancel", stop);

  split.addEventListener(
    "lostpointercapture",
    stop,
  );
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
    toast(
      error?.message ||
        "Unable to prepare request.",
      "error",
    );

    return;
  }


  state.ui.loading = true;

  /*
     Render once to disable the Send button.
  */
  render();


  try {
    const response = await request(config);

    state.response = response;

    syncTab();

    History.record(config, response);

    markDirty(false, {
      emitChange: false,
    });

    toast(
      `${response.status} ${
        response.statusText
      } · ${formatDuration(response.duration)}`,
    );

  } catch (error) {

    state.response = {
      status: 0,
      statusText: "Request failed",
      headers: {},
      body:
        error?.message ||
        "Request failed.",
      bodyKind: "text",
      duration: 0,
      size: 0,
      type: "error",
      finalUrl: config.url,
    };

    syncTab();

    toast(
      error?.message ||
        "Request failed.",
      "error",
    );

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

function palette() {
  if (document.querySelector("#palette")) {
    return;
  }

  state.ui.commandOpen = true;
  state.ui.paletteSearch = "";


  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="fixed inset-0 z-[90] modal-backdrop flex items-start justify-center pt-[12vh] p-3"
        id="palette"
      >

        <div
          class="bg-panel border border-line rounded-xl shadow-2xl w-[min(680px,100%)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >

          <input
            id="palette-input"
            autofocus
            class="input w-full border-0 border-b border-line rounded-none px-4 py-3"
            placeholder="Search commands…"
            autocomplete="off"
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
      () =>
        newTab(
          state.request,
          `${state.request.method} copy`,
        ),
    ],

    ["Open History", () => go("history")],

    ["Open Collections", () => go("collections")],

    [
      "Open Environments",
      () => go("environments"),
    ],

    ["Generate cURL", () => go("code")],

    ["Export Workspace", exportWorkspace],

    ["Import cURL", curlModal],

    [
      "Toggle Theme",
      () =>
        setTheme(
          state.settings.theme === "dark"
            ? "light"
            : "dark",
        ),
    ],

    [
      "Clear Response",
      () => {
        state.response = null;
        syncTab();
        persist();
        render();
      },
    ],

    [
      "Focus URL",
      () => document.querySelector("#url")?.focus(),
    ],

    [
      "Keyboard shortcuts",
      () => go("shortcuts"),
    ],
  ];


  const paletteElement =
    document.querySelector("#palette");

  const input =
    document.querySelector("#palette-input");

  const list =
    document.querySelector("#palette-list");


  const paint = () => {
    const query =
      input.value
        .trim()
        .toLowerCase();

    const matches = commands
      .map((command, index) => ({
        label: command[0],
        action: command[1],
        index,
      }))
      .filter((command) =>
        command.label
          .toLowerCase()
          .includes(query),
      );


    list.innerHTML = matches.length
      ? matches
          .map(
            (command) => `
              <button
                class="command-item w-full text-left border-b border-line px-4 py-3 text-xs"
                data-command-index="${command.index}"
              >
                ${esc(command.label)}
              </button>
            `,
          )
          .join("")
      : `
          <div class="px-4 py-5 text-xs text-muted">
            No commands found.
          </div>
        `;


    list
      .querySelector("[data-command-index]")
      ?.classList.add("active");
  };


  const close = () => {
    paletteElement?.remove();
    state.ui.commandOpen = false;
  };


  paint();

  input?.focus();


  input?.addEventListener(
    "input",
    paint,
  );


  list?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-command-index]",
        );

      if (!button) {
        return;
      }

      const index = Number(
        button.dataset.commandIndex,
      );

      const action =
        commands[index]?.[1];

      close();

      action?.();
    },
  );


  paletteElement?.addEventListener(
    "click",
    (event) => {
      if (
        event.target === paletteElement
      ) {
        close();
      }
    },
  );
}


/* =========================================================
   CURL MODAL
   ========================================================= */

function curlModal() {
  if (document.querySelector("#curl-modal")) {
    return;
  }


  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="fixed inset-0 z-[95] modal-backdrop flex items-center justify-center p-4"
        id="curl-modal"
      >

        <div
          class="bg-panel border border-line rounded-xl shadow-2xl w-[min(800px,100%)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Import cURL"
        >

          <div
            class="px-4 py-3 border-b border-line flex items-center justify-between"
          >

            <div class="font-semibold text-sm">
              Import cURL
            </div>

            <button
              class="btn iconbtn"
              data-curl-close
              title="Close"
              aria-label="Close"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>

          </div>


          <textarea
            id="curl-input"
            class="input code-editor w-full min-h-[220px] rounded-none border-0 p-4"
            placeholder="curl -X GET https://example.com ..."
            spellcheck="false"
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


  const modal =
    document.querySelector("#curl-modal");

  const input =
    document.querySelector("#curl-input");


  const close = () => {
    modal?.remove();
  };


  modal
    ?.querySelectorAll("[data-curl-close]")
    .forEach((element) => {
      element.addEventListener(
        "click",
        close,
      );
    });


  modal?.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) {
        close();
      }
    },
  );


  document
    .querySelector("[data-curl-go]")
    ?.addEventListener(
      "click",
      () => {
        try {
          const output = importCurl(
            input?.value || "",
          );

          replaceRequest(
            output.request,
          );

          markDirty();

          close();

          go("workspace");

          toast(
            output.warnings.length
              ? `Imported with ${output.warnings.length} warning(s)`
              : "cURL imported",
          );

        } catch (error) {
          toast(
            error?.message ||
              "Unable to import cURL.",
            "error",
          );
        }
      },
    );


  input?.focus();
}


/* =========================================================
   RESET
   ========================================================= */

function reset() {
  const confirmed = confirm(
    "Reset Endpoint? This deletes collections, environments, history, settings and open workspace data.",
  );

  if (!confirmed) {
    return;
  }

  localStorage.clear();

  location.reload();
}


/* =========================================================
   FILE IMPORT
   ========================================================= */

function bindFileImport() {
  const input =
    document.querySelector("#file-import");

  if (!input || input.dataset.bound === "true") {
    return;
  }

  input.dataset.bound = "true";


  input.addEventListener(
    "change",
    (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }


      importWorkspace(file)
        .then(() => {
          toast("Workspace imported");
          render();
        })
        .catch((error) => {
          toast(
            error?.message ||
              "Workspace import failed.",
            "error",
          );
        })
        .finally(() => {
          event.target.value = "";
        });
    },
  );
}


/* =========================================================
   GLOBAL EVENTS
   ========================================================= */

window.addEventListener(
  "hashchange",
  () => {
    render();
  },
);


/* =========================================================
   STATE SUBSCRIPTION
   ========================================================= */

subscribe(() => {
  persist();

  const nextViewKey = current();

  if (viewKey !== nextViewKey) {
    viewKey = nextViewKey;
  }

  render();

  bindFileImport();
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

  search: () => palette(),

  url: () =>
    document.querySelector("#url")?.focus(),

  escape: () => {
    document
      .querySelector("#palette")
      ?.remove();

    document
      .querySelector("#curl-modal")
      ?.remove();

    closeMobileSidebar();
  },
});