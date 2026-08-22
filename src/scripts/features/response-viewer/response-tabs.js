// src/scripts/features/response-viewer/response-tabs.js

/**
 * Response Tabs
 *
 * Controls the response viewer tabs and keeps the active response
 * tab synchronized with application state.
 *
 * Responsibilities:
 * - Initialize response tabs
 * - Track the active response tab
 * - Switch between response views
 * - Synchronize the active tab with state
 *
 * This module does not:
 * - Execute HTTP requests
 * - Parse response data
 * - Render response content
 * - Show toast notifications
 */

import state from "../../core/state.js";
import { DEFAULT_RESPONSE_TAB } from "../../core/constants.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    container: null,
    tabs: [],
};

// ============================================================
// Constants
// ============================================================

const TAB_SELECTOR = "[data-response-tab]";

const DEFAULT_TABS = [
    "body",
    "headers",
];

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize response tabs.
 *
 * @returns {Object} Response tabs API
 */
export function initResponseTabs() {
    cacheElements();
    bindEvents();
    syncStateToUI();

    return {
        getActiveTab,
        setActiveTab,
        syncFromUI,
        syncStateToUI,
        reset,
    };
}

// ============================================================
// DOM Helpers
// ============================================================

/**
 * Cache response tab elements.
 */
function cacheElements() {
    elements.container =
        document.getElementById("response-tabs") ||
        document.querySelector("[data-response-tabs]");

    elements.tabs = Array.from(
        document.querySelectorAll(TAB_SELECTOR),
    );
}

/**
 * Refresh cached tab references.
 *
 * Useful if the response viewer creates tabs dynamically.
 */
function refreshTabs() {
    elements.tabs = Array.from(
        document.querySelectorAll(TAB_SELECTOR),
    );
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind response tab events.
 */
function bindEvents() {
    refreshTabs();

    elements.tabs.forEach((tab) => {
        tab.addEventListener("click", handleTabClick);
    });
}

/**
 * Handle a response tab click.
 *
 * @param {Event} event
 */
function handleTabClick(event) {
    const tab = event.currentTarget;

    if (!(tab instanceof HTMLElement)) {
        return;
    }

    const tabName =
        tab.dataset.responseTab ||
        tab.dataset.tab ||
        tab.getAttribute("aria-controls") ||
        "";

    if (!tabName) {
        return;
    }

    setActiveTab(tabName);
}

// ============================================================
// State Synchronization
// ============================================================

/**
 * Synchronize the active tab from the UI into state.
 *
 * @returns {string}
 */
export function syncFromUI() {
    refreshTabs();

    const activeTab = elements.tabs.find((tab) => {
        return (
            tab.getAttribute("aria-selected") === "true" ||
            tab.classList.contains("active") ||
            tab.classList.contains("is-active") ||
            tab.dataset.active === "true"
        );
    });

    if (activeTab) {
        const tabName =
            activeTab.dataset.responseTab ||
            activeTab.dataset.tab ||
            activeTab.getAttribute("aria-controls");

        if (tabName) {
            state.responseUI.activeTab = tabName;
        }
    }

    return (
        state.responseUI.activeTab ||
        DEFAULT_RESPONSE_TAB
    );
}

/**
 * Synchronize state into the response tab UI.
 */
export function syncStateToUI() {
    refreshTabs();

    const activeTab =
        state.responseUI.activeTab ||
        DEFAULT_RESPONSE_TAB;

    updateTabButtons(activeTab);
    updateTabPanels(activeTab);

    return activeTab;
}

// ============================================================
// Tab Selection
// ============================================================

/**
 * Get the currently active response tab.
 *
 * @returns {string}
 */
export function getActiveTab() {
    return (
        state.responseUI.activeTab ||
        DEFAULT_RESPONSE_TAB
    );
}

/**
 * Set the active response tab.
 *
 * @param {string} tabName
 * @returns {string}
 */
export function setActiveTab(tabName) {
    const normalizedTab = normalizeTabName(tabName);

    if (!normalizedTab) {
        return getActiveTab();
    }

    state.responseUI.activeTab = normalizedTab;

    syncStateToUI();

    return normalizedTab;
}

/**
 * Normalize a tab name.
 *
 * @param {unknown} tabName
 * @returns {string}
 */
function normalizeTabName(tabName) {
    if (typeof tabName !== "string") {
        return "";
    }

    return tabName.trim().toLowerCase();
}

/**
 * Check whether a tab exists.
 *
 * @param {string} tabName
 * @returns {boolean}
 */
export function hasTab(tabName) {
    const normalizedTab = normalizeTabName(tabName);

    if (!normalizedTab) {
        return false;
    }

    refreshTabs();

    if (elements.tabs.length === 0) {
        return DEFAULT_TABS.includes(normalizedTab);
    }

    return elements.tabs.some((tab) => {
        const name =
            tab.dataset.responseTab ||
            tab.dataset.tab ||
            tab.getAttribute("aria-controls") ||
            "";

        return normalizeTabName(name) === normalizedTab;
    });
}

// ============================================================
// Button State
// ============================================================

/**
 * Update response tab button states.
 *
 * @param {string} activeTab
 */
function updateTabButtons(activeTab) {
    elements.tabs.forEach((tab) => {
        const tabName =
            tab.dataset.responseTab ||
            tab.dataset.tab ||
            tab.getAttribute("aria-controls") ||
            "";

        const isActive =
            normalizeTabName(tabName) === activeTab;

        tab.setAttribute(
            "aria-selected",
            String(isActive),
        );

        tab.setAttribute(
            "tabindex",
            isActive ? "0" : "-1",
        );

        tab.dataset.active = String(isActive);

        tab.classList.toggle("active", isActive);
        tab.classList.toggle("is-active", isActive);

        if (isActive) {
            tab.removeAttribute("disabled");
        }
    });
}

// ============================================================
// Panel State
// ============================================================

/**
 * Update response tab panels.
 *
 * Supports panels using either:
 *
 * data-response-panel="body"
 *
 * or:
 *
 * id="response-body"
 *
 * @param {string} activeTab
 */
function updateTabPanels(activeTab) {
    const panels = Array.from(
        document.querySelectorAll(
            "[data-response-panel], [data-response-tab-panel]",
        ),
    );

    panels.forEach((panel) => {
        if (!(panel instanceof HTMLElement)) {
            return;
        }

        const panelName =
            panel.dataset.responsePanel ||
            panel.dataset.responseTabPanel ||
            "";

        const isActive =
            normalizeTabName(panelName) === activeTab;

        panel.hidden = !isActive;

        panel.setAttribute(
            "aria-hidden",
            String(!isActive),
        );

        panel.classList.toggle("active", isActive);
        panel.classList.toggle("is-active", isActive);
    });

    updateIdBasedPanel(activeTab);
}

/**
 * Update a panel referenced by the active tab's aria-controls.
 *
 * @param {string} activeTab
 */
function updateIdBasedPanel(activeTab) {
    const activeButton = elements.tabs.find((tab) => {
        const name =
            tab.dataset.responseTab ||
            tab.dataset.tab ||
            tab.getAttribute("aria-controls") ||
            "";

        return normalizeTabName(name) === activeTab;
    });

    if (!activeButton) {
        return;
    }

    const panelId =
        activeButton.getAttribute("aria-controls");

    if (!panelId) {
        return;
    }

    const panel = document.getElementById(panelId);

    if (!(panel instanceof HTMLElement)) {
        return;
    }

    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.classList.add("active");
    panel.classList.add("is-active");
}

// ============================================================
// Keyboard Navigation
// ============================================================

/**
 * Handle keyboard navigation between response tabs.
 *
 * Supports:
 * - ArrowLeft
 * - ArrowRight
 * - Home
 * - End
 * - Enter
 * - Space
 *
 * @param {KeyboardEvent} event
 */
function handleTabKeydown(event) {
    const currentTab = event.currentTarget;

    if (!(currentTab instanceof HTMLElement)) {
        return;
    }

    refreshTabs();

    const currentIndex = elements.tabs.indexOf(currentTab);

    if (currentIndex === -1) {
        return;
    }

    let nextIndex = currentIndex;

    switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
            nextIndex =
                (currentIndex + 1) %
                elements.tabs.length;
            break;

        case "ArrowLeft":
        case "ArrowUp":
            nextIndex =
                (currentIndex - 1 + elements.tabs.length) %
                elements.tabs.length;
            break;

        case "Home":
            nextIndex = 0;
            break;

        case "End":
            nextIndex = elements.tabs.length - 1;
            break;

        case "Enter":
        case " ":
            event.preventDefault();
            handleTabClick({
                currentTarget: currentTab,
            });
            return;

        default:
            return;
    }

    event.preventDefault();

    const nextTab = elements.tabs[nextIndex];

    if (!nextTab) {
        return;
    }

    const tabName =
        nextTab.dataset.responseTab ||
        nextTab.dataset.tab ||
        nextTab.getAttribute("aria-controls");

    if (!tabName) {
        return;
    }

    setActiveTab(tabName);
    nextTab.focus();
}

/**
 * Bind keyboard navigation.
 */
function bindKeyboardNavigation() {
    refreshTabs();

    elements.tabs.forEach((tab) => {
        tab.addEventListener(
            "keydown",
            handleTabKeydown,
        );
    });
}

// ============================================================
// Reset
// ============================================================

/**
 * Reset response tabs to the default tab.
 *
 * @returns {string}
 */
export function reset() {
    state.responseUI.activeTab =
        DEFAULT_RESPONSE_TAB;

    syncStateToUI();

    return state.responseUI.activeTab;
}

// ============================================================
// Exports
// ============================================================

export default {
    initResponseTabs,
    getActiveTab,
    setActiveTab,
    hasTab,
    syncFromUI,
    syncStateToUI,
    reset,
};