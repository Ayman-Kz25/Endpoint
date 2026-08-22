// src/scripts/features/response-viewer/response-viewer.js

/**
 * Response Viewer
 *
 * Responsible for displaying normalized HTTP responses in the response UI.
 *
 * Responsibilities:
 * - Render response status, duration, and size
 * - Render response body
 * - Render response headers
 * - Switch response tabs
 * - Format JSON responses when possible
 * - Handle empty and error states
 *
 * This module does not:
 * - Execute HTTP requests
 * - Modify request state
 * - Show toast notifications
 * - Perform network operations
 */

import state from "../../core/state.js";
import { DEFAULT_RESPONSE_TAB } from "../../core/constants.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    responsePanel: null,
    status: null,
    duration: null,
    size: null,
    body: null,
    raw: null,
    headers: null,
    tabs: [],
    emptyState: null,
};

let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the response viewer.
 *
 * @returns {Object} Response viewer API
 */
export function initResponseViewer() {
    cacheElements();

    if (!initialized) {
        bindEvents();
        initialized = true;
    }

    syncStateToUI();

    return {
        renderResponse,
        clearResponse,
        setActiveTab,
        getActiveTab,
        syncStateToUI,
    };
}

// ============================================================
// DOM Caching
// ============================================================

/**
 * Cache response-viewer DOM elements.
 */
function cacheElements() {
    elements.responsePanel =
        document.getElementById("response-panel") ||
        document.getElementById("response-viewer");

    elements.status =
        document.getElementById("response-status");

    elements.duration =
        document.getElementById("response-duration");

    elements.size =
        document.getElementById("response-size");

    elements.body =
        document.getElementById("response-body");

    elements.raw =
        document.getElementById("response-raw");

    elements.headers =
        document.getElementById("response-headers");

    elements.emptyState =
        document.getElementById("response-empty");

    elements.tabs = Array.from(
        document.querySelectorAll(
            "[data-response-tab], [data-tab]"
        )
    ).filter((element) => {
        const tab =
            element.dataset.responseTab ||
            element.dataset.tab ||
            "";

        return [
            "body",
            "raw",
            "headers",
        ].includes(tab);
    });
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind response-viewer events.
 */
function bindEvents() {
    elements.tabs.forEach((tab) => {
        tab.addEventListener("click", handleTabClick);
    });
}

/**
 * Handle response tab selection.
 *
 * @param {Event} event
 */
function handleTabClick(event) {
    event.preventDefault();

    const tab = event.currentTarget.dataset.responseTab ||
        event.currentTarget.dataset.tab;

    if (!tab) {
        return;
    }

    setActiveTab(tab);
}

// ============================================================
// Rendering
// ============================================================

/**
 * Render a normalized HTTP response.
 *
 * @param {Object|null} response
 */
export function renderResponse(response = null) {
    if (!response || typeof response !== "object") {
        clearResponse();
        return;
    }

    state.response = {
        ...state.response,
        status: response.status ?? null,
        statusText: response.statusText ?? "",
        duration: response.duration ?? null,
        size: response.size ?? null,
        data: response.data ?? null,
        raw: response.raw ?? "",
        headers: Array.isArray(response.headers)
            ? response.headers
            : [],
    };

    renderStatus();
    renderMetadata();
    renderBody();
    renderRaw();
    renderHeaders();
    hideEmptyState();
}

/**
 * Render response status.
 */
function renderStatus() {
    if (!elements.status) {
        return;
    }

    const status = state.response.status;
    const statusText = state.response.statusText || "";

    if (!status) {
        elements.status.textContent = "";
        elements.status.removeAttribute("data-status");
        return;
    }

    elements.status.textContent = statusText
        ? `${status} ${statusText}`
        : String(status);

    elements.status.dataset.status = getStatusCategory(status);
}

/**
 * Render response metadata.
 */
function renderMetadata() {
    if (elements.duration) {
        elements.duration.textContent =
            formatDuration(state.response.duration);
    }

    if (elements.size) {
        elements.size.textContent =
            formatSize(state.response.size);
    }
}

/**
 * Render the parsed response body.
 */
function renderBody() {
    if (!elements.body) {
        return;
    }

    const data = state.response.data;

    if (data === null || data === undefined || data === "") {
        elements.body.textContent = "No response body.";
        return;
    }

    if (typeof data === "string") {
        const parsed = tryParseJson(data);

        if (parsed !== null) {
            elements.body.textContent =
                JSON.stringify(parsed, null, 2);
            return;
        }

        elements.body.textContent = data;
        return;
    }

    try {
        elements.body.textContent =
            JSON.stringify(data, null, 2);
    } catch {
        elements.body.textContent =
            String(data);
    }
}

/**
 * Render the raw response body.
 */
function renderRaw() {
    if (!elements.raw) {
        return;
    }

    elements.raw.textContent =
        state.response.raw || "No response body.";
}

/**
 * Render response headers.
 */
function renderHeaders() {
    if (!elements.headers) {
        return;
    }

    elements.headers.innerHTML = "";

    const headers = Array.isArray(state.response.headers)
        ? state.response.headers
        : [];

    if (!headers.length) {
        elements.headers.textContent =
            "No response headers.";
        return;
    }

    const fragment = document.createDocumentFragment();

    headers.forEach((header) => {
        if (!header || typeof header !== "object") {
            return;
        }

        const row = document.createElement("div");

        row.className =
            "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-border px-3 py-2 text-sm";

        const name = document.createElement("div");
        name.className = "font-medium break-words";
        name.textContent = String(
            header.name ?? ""
        );

        const value = document.createElement("div");
        value.className =
            "break-words text-muted-foreground";
        value.textContent = String(
            header.value ?? ""
        );

        row.append(name, value);
        fragment.appendChild(row);
    });

    elements.headers.appendChild(fragment);
}

// ============================================================
// Empty State
// ============================================================

/**
 * Clear the response viewer.
 */
export function clearResponse() {
    state.response = {
        ...state.response,
        status: null,
        statusText: "",
        duration: null,
        size: null,
        data: null,
        raw: "",
        headers: [],
    };

    if (elements.status) {
        elements.status.textContent = "";
        elements.status.removeAttribute("data-status");
    }

    if (elements.duration) {
        elements.duration.textContent = "";
    }

    if (elements.size) {
        elements.size.textContent = "";
    }

    if (elements.body) {
        elements.body.textContent =
            "Send a request to see the response.";
    }

    if (elements.raw) {
        elements.raw.textContent = "";
    }

    if (elements.headers) {
        elements.headers.innerHTML = "";
        elements.headers.textContent =
            "No response headers.";
    }

    showEmptyState();
}

/**
 * Show the response empty state.
 */
function showEmptyState() {
    if (elements.emptyState) {
        elements.emptyState.hidden = false;
    }

    if (elements.responsePanel) {
        elements.responsePanel.dataset.empty = "true";
    }
}

/**
 * Hide the response empty state.
 */
function hideEmptyState() {
    if (elements.emptyState) {
        elements.emptyState.hidden = true;
    }

    if (elements.responsePanel) {
        elements.responsePanel.dataset.empty = "false";
    }
}

// ============================================================
// Tabs
// ============================================================

/**
 * Set the active response tab.
 *
 * @param {string} tab
 */
export function setActiveTab(tab) {
    const allowedTabs = [
        "body",
        "raw",
        "headers",
    ];

    const nextTab = allowedTabs.includes(tab)
        ? tab
        : DEFAULT_RESPONSE_TAB || "body";

    state.responseUI.activeTab = nextTab;

    updateTabUI();
}

/**
 * Get the active response tab.
 *
 * @returns {string}
 */
export function getActiveTab() {
    return (
        state.responseUI.activeTab ||
        DEFAULT_RESPONSE_TAB ||
        "body"
    );
}

/**
 * Update the tab UI.
 */
function updateTabUI() {
    const activeTab = getActiveTab();

    elements.tabs.forEach((tab) => {
        const tabName =
            tab.dataset.responseTab ||
            tab.dataset.tab;

        const active = tabName === activeTab;

        tab.setAttribute(
            "aria-selected",
            String(active)
        );

        tab.classList.toggle(
            "active",
            active
        );

        tab.classList.toggle(
            "border-primary",
            active
        );

        tab.classList.toggle(
            "text-primary",
            active
        );
    });

    toggleResponseSection(
        elements.body,
        activeTab === "body"
    );

    toggleResponseSection(
        elements.raw,
        activeTab === "raw"
    );

    toggleResponseSection(
        elements.headers,
        activeTab === "headers"
    );
}

/**
 * Show or hide a response section.
 *
 * @param {HTMLElement|null} element
 * @param {boolean} visible
 */
function toggleResponseSection(element, visible) {
    if (!element) {
        return;
    }

    element.hidden = !visible;
}

// ============================================================
// State Synchronization
// ============================================================

/**
 * Synchronize response state into the UI.
 */
export function syncStateToUI() {
    renderStatus();
    renderMetadata();
    renderBody();
    renderRaw();
    renderHeaders();
    updateTabUI();

    if (
        state.response.status === null &&
        !state.response.raw
    ) {
        showEmptyState();
    } else {
        hideEmptyState();
    }
}

// ============================================================
// Formatting Helpers
// ============================================================

/**
 * Format a response duration.
 *
 * @param {number|null} milliseconds
 * @returns {string}
 */
function formatDuration(milliseconds) {
    if (
        !Number.isFinite(milliseconds) ||
        milliseconds < 0
    ) {
        return "";
    }

    return `${Math.round(milliseconds)} ms`;
}

/**
 * Format a response size.
 *
 * @param {number|null} bytes
 * @returns {string}
 */
function formatSize(bytes) {
    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {
        return "0 B";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determine the status category.
 *
 * @param {number} status
 * @returns {string}
 */
function getStatusCategory(status) {
    if (status >= 200 && status < 300) {
        return "success";
    }

    if (status >= 300 && status < 400) {
        return "redirect";
    }

    if (status >= 400 && status < 500) {
        return "client-error";
    }

    if (status >= 500 && status < 600) {
        return "server-error";
    }

    return "unknown";
}

/**
 * Attempt to parse JSON.
 *
 * @param {string} value
 * @returns {Object|Array|null}
 */
function tryParseJson(value) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// ============================================================
// Response Data Helpers
// ============================================================

/**
 * Return the response body as a display string.
 *
 * @param {unknown} data
 * @returns {string}
 */
export function stringifyResponse(data) {
    if (
        data === null ||
        data === undefined
    ) {
        return "";
    }

    if (typeof data === "string") {
        const parsed = tryParseJson(data);

        return parsed !== null
            ? JSON.stringify(parsed, null, 2)
            : data;
    }

    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

/**
 * Check whether a response has a body.
 *
 * @param {Object|null} response
 * @returns {boolean}
 */
export function hasResponseBody(response = state.response) {
    if (!response) {
        return false;
    }

    if (
        response.data !== null &&
        response.data !== undefined &&
        response.data !== ""
    ) {
        return true;
    }

    return Boolean(
        typeof response.raw === "string" &&
        response.raw.length > 0
    );
}

/**
 * Get a response status category.
 *
 * @param {number} status
 * @returns {string}
 */
export function getResponseStatusCategory(status) {
    return getStatusCategory(status);
}

// ============================================================
// Default Export
// ============================================================

export default {
    initResponseViewer,
    renderResponse,
    clearResponse,
    setActiveTab,
    getActiveTab,
    syncStateToUI,
    stringifyResponse,
    hasResponseBody,
    getResponseStatusCategory,
};