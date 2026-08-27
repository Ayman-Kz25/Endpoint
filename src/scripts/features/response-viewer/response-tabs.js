// src/scripts/features/response-viewer/response-tabs.js

import state from "../../core/state.js";
import { DEFAULT_RESPONSE_TAB } from "../../core/constants.js";

const TAB_SELECTOR = "[data-response-tab]";
const PANEL_SELECTOR = "[data-response-panel]";

const elements = {
    tabs: [],
    panels: [],
};

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

function cacheElements() {
    elements.tabs = Array.from(
        document.querySelectorAll(TAB_SELECTOR)
    );

    elements.panels = Array.from(
        document.querySelectorAll(PANEL_SELECTOR)
    );
}

function bindEvents() {
    elements.tabs.forEach((tab) => {
        tab.addEventListener("click", handleTabClick);
        tab.addEventListener("keydown", handleTabKeydown);
    });
}

function handleTabClick(event) {
    const tab = event.currentTarget;
    const name = getTabName(tab);

    if (name) {
        setActiveTab(name);
    }
}

function handleTabKeydown(event) {
    const index = elements.tabs.indexOf(event.currentTarget);

    if (index === -1) {
        return;
    }

    let nextIndex;

    switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
            nextIndex = (index + 1) % elements.tabs.length;
            break;

        case "ArrowLeft":
        case "ArrowUp":
            nextIndex =
                (index - 1 + elements.tabs.length) %
                elements.tabs.length;
            break;

        case "Home":
            nextIndex = 0;
            break;

        case "End":
            nextIndex = elements.tabs.length - 1;
            break;

        default:
            return;
    }

    event.preventDefault();

    const nextTab = elements.tabs[nextIndex];
    const name = getTabName(nextTab);

    if (!name) {
        return;
    }

    setActiveTab(name);
    nextTab.focus();
}

export function syncFromUI() {
    const activeTab = elements.tabs.find(
        (tab) =>
            tab.getAttribute("aria-selected") === "true"
    );

    if (activeTab) {
        const name = getTabName(activeTab);

        if (name) {
            state.responseUI.activeTab = name;
        }
    }

    return getActiveTab();
}

export function syncStateToUI() {
    const activeTab = getActiveTab();

    elements.tabs.forEach((tab) => {
        const isActive =
            getTabName(tab) === activeTab;

        tab.setAttribute(
            "aria-selected",
            String(isActive)
        );

        tab.setAttribute(
            "tabindex",
            isActive ? "0" : "-1"
        );

        tab.classList.toggle("active", isActive);
    });

    elements.panels.forEach((panel) => {
        const isActive =
            panel.dataset.responsePanel === activeTab;

        panel.hidden = !isActive;
        panel.setAttribute(
            "aria-hidden",
            String(!isActive)
        );

        panel.classList.toggle("active", isActive);
    });

    return activeTab;
}

export function getActiveTab() {
    return (
        state.responseUI.activeTab ||
        DEFAULT_RESPONSE_TAB
    );
}

export function setActiveTab(tabName) {
    const name = normalizeTabName(tabName);

    if (!name) {
        return getActiveTab();
    }

    state.responseUI.activeTab = name;
    syncStateToUI();

    return name;
}

export function hasTab(tabName) {
    const name = normalizeTabName(tabName);

    return elements.tabs.some(
        (tab) => getTabName(tab) === name
    );
}

export function reset() {
    state.responseUI.activeTab =
        DEFAULT_RESPONSE_TAB;

    return syncStateToUI();
}

function getTabName(tab) {
    return normalizeTabName(
        tab?.dataset.responseTab ||
        tab?.getAttribute("aria-controls") ||
        ""
    );
}

function normalizeTabName(value) {
    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";
}

export default {
    initResponseTabs,
    getActiveTab,
    setActiveTab,
    hasTab,
    syncFromUI,
    syncStateToUI,
    reset,
};