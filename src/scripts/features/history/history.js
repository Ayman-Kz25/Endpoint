// src/scripts/features/history/history.js

/**
 * Request History
 *
 * Manages saved request history for the workspace.
 *
 * Responsibilities:
 * - Store completed requests in application state
 * - Render request history
 * - Select a history item
 * - Delete individual history items
 * - Clear all history
 * - Load a history request back into the request builder
 *
 * This module does not:
 * - Execute HTTP requests
 * - Render response data
 * - Show toast notifications
 * - Persist data to a server
 */

import state from "../../core/state.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    container: null,
    list: null,
    empty: null,
    clearButton: null,
};

// ============================================================
// Constants
// ============================================================

const HISTORY_LIST_ID = "history-list";
const HISTORY_CONTAINER_ID = "history";
const HISTORY_CLEAR_ID = "history-clear";

const MAX_HISTORY_ITEMS = 50;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the history feature.
 *
 * @returns {Object} History API
 */
export function initHistory() {
    cacheElements();
    bindEvents();
    renderHistory();

    return {
        addHistory,
        getHistory,
        getHistoryItem,
        loadHistoryItem,
        removeHistoryItem,
        clearHistory,
        renderHistory,
    };
}

// ============================================================
// DOM Helpers
// ============================================================

/**
 * Cache history DOM elements.
 */
function cacheElements() {
    elements.container =
        document.getElementById(HISTORY_CONTAINER_ID) ||
        document.querySelector("[data-history]");

    elements.list =
        document.getElementById(HISTORY_LIST_ID) ||
        document.querySelector("[data-history-list]");

    elements.empty =
        document.querySelector("[data-history-empty]");

    elements.clearButton =
        document.getElementById(HISTORY_CLEAR_ID) ||
        document.querySelector("[data-history-clear]");
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind history events.
 */
function bindEvents() {
    elements.clearButton?.addEventListener(
        "click",
        handleClearHistory,
    );

    elements.list?.addEventListener(
        "click",
        handleHistoryClick,
    );
}

/**
 * Handle clicks inside the history list.
 *
 * @param {MouseEvent} event
 */
function handleHistoryClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    const removeButton =
        target.closest("[data-history-remove]");

    if (removeButton) {
        const item = removeButton.closest(
            "[data-history-id]",
        );

        const id = item?.dataset.historyId;

        if (id) {
            removeHistoryItem(id);
        }

        return;
    }

    const historyItem =
        target.closest("[data-history-item]");

    if (!historyItem) {
        return;
    }

    const id = historyItem.dataset.historyId;

    if (id) {
        loadHistoryItem(id);
    }
}

/**
 * Handle clear-history button.
 */
function handleClearHistory() {
    clearHistory();
}

// ============================================================
// History Access
// ============================================================

/**
 * Get all history items.
 *
 * @returns {Array}
 */
export function getHistory() {
    if (!Array.isArray(state.history.requests)) {
        state.history.requests = [];
    }

    return state.history.requests;
}

/**
 * Get a history item by ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getHistoryItem(id) {
    if (!id) {
        return null;
    }

    return (
        getHistory().find(
            (item) => String(item.id) === String(id),
        ) || null
    );
}

// ============================================================
// Add History
// ============================================================

/**
 * Add a request to history.
 *
 * @param {Object} request
 * @param {Object} [response]
 * @returns {Object|null}
 */
export function addHistory(request = {}, response = null) {
    if (!request || typeof request !== "object") {
        return null;
    }

    const historyItem = createHistoryItem(
        request,
        response,
    );

    const history = getHistory();

    const duplicateIndex = history.findIndex((item) => {
        return isSameRequest(item.request, request);
    });

    if (duplicateIndex !== -1) {
        history.splice(duplicateIndex, 1);
    }

    history.unshift(historyItem);

    if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
    }

    renderHistory();

    return historyItem;
}

/**
 * Create a normalized history item.
 *
 * @param {Object} request
 * @param {Object|null} response
 * @returns {Object}
 */
function createHistoryItem(request, response = null) {
    return {
        id: createHistoryId(),
        timestamp: Date.now(),

        request: {
            method: request.method || "GET",
            url: request.url || "",
            params: cloneArray(request.params),
            headers: cloneArray(request.headers),
            body: request.body || "",
            auth: cloneAuth(request.auth),
        },

        response: response
            ? {
                  status: response.status ?? null,
                  statusText: response.statusText || "",
                  duration: response.duration ?? null,
                  size: response.size ?? null,
              }
            : null,
    };
}

/**
 * Create a unique history ID.
 *
 * @returns {string}
 */
function createHistoryId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `history-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

/**
 * Compare two request configurations.
 *
 * @param {Object} first
 * @param {Object} second
 * @returns {boolean}
 */
function isSameRequest(first = {}, second = {}) {
    return (
        String(first.method || "GET").toUpperCase() ===
            String(second.method || "GET").toUpperCase() &&
        String(first.url || "") ===
            String(second.url || "") &&
        JSON.stringify(first.params || []) ===
            JSON.stringify(second.params || []) &&
        JSON.stringify(first.headers || []) ===
            JSON.stringify(second.headers || []) &&
        String(first.body || "") ===
            String(second.body || "") &&
        JSON.stringify(first.auth || {}) ===
            JSON.stringify(second.auth || {})
    );
}

// ============================================================
// Load History
// ============================================================

/**
 * Load a history request into the request builder.
 *
 * Dispatches a custom event so the request-builder feature
 * can apply the request without creating a circular import.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function loadHistoryItem(id) {
    const item = getHistoryItem(id);

    if (!item) {
        return null;
    }

    const request = cloneRequest(item.request);

    state.request = {
        ...state.request,
        ...request,
        auth: {
            type: request.auth?.type || "none",
            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };

    document.dispatchEvent(
        new CustomEvent("history:load", {
            detail: {
                id: item.id,
                request,
            },
        }),
    );

    renderHistory();

    return request;
}

// ============================================================
// Remove History
// ============================================================

/**
 * Remove one history item.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function removeHistoryItem(id) {
    const history = getHistory();

    const index = history.findIndex(
        (item) =>
            String(item.id) === String(id),
    );

    if (index === -1) {
        return false;
    }

    history.splice(index, 1);

    renderHistory();

    document.dispatchEvent(
        new CustomEvent("history:remove", {
            detail: {
                id,
            },
        }),
    );

    return true;
}

/**
 * Clear all history.
 *
 * @returns {number} Number of removed items
 */
export function clearHistory() {
    const history = getHistory();
    const count = history.length;

    history.length = 0;

    renderHistory();

    document.dispatchEvent(
        new CustomEvent("history:clear", {
            detail: {
                count,
            },
        }),
    );

    return count;
}

// ============================================================
// Rendering
// ============================================================

/**
 * Render the complete history list.
 */
export function renderHistory() {
    if (!elements.list) {
        cacheElements();
    }

    const history = getHistory();

    if (!elements.list) {
        return;
    }

    elements.list.innerHTML = "";

    if (history.length === 0) {
        renderEmptyState();
        updateHistoryVisibility(false);
        return;
    }

    updateHistoryVisibility(true);

    const fragment = document.createDocumentFragment();

    history.forEach((item) => {
        fragment.appendChild(
            createHistoryElement(item),
        );
    });

    elements.list.appendChild(fragment);
}

/**
 * Render an empty history state.
 */
function renderEmptyState() {
    if (elements.empty) {
        elements.empty.hidden = false;
        return;
    }

    elements.list.innerHTML = `
        <div
            class="px-3 py-6 text-center text-sm text-muted-foreground"
            data-history-empty
        >
            No requests yet.
        </div>
    `;
}

/**
 * Update visibility of the history UI.
 *
 * @param {boolean} hasItems
 */
function updateHistoryVisibility(hasItems) {
    if (elements.empty) {
        elements.empty.hidden = hasItems;
    }

    if (elements.clearButton) {
        elements.clearButton.disabled = !hasItems;
    }

    if (elements.container) {
        elements.container.dataset.empty =
            String(!hasItems);
    }
}

/**
 * Create a history item DOM element.
 *
 * @param {Object} item
 * @returns {HTMLElement}
 */
function createHistoryElement(item) {
    const element = document.createElement("div");

    element.dataset.historyItem = "true";
    element.dataset.historyId = item.id;

    element.className =
        "group flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 transition hover:bg-muted/50";

    const method = escapeHtml(
        item.request?.method || "GET",
    );

    const url = escapeHtml(
        item.request?.url || "",
    );

    const status = item.response?.status;

    const statusText =
        status !== null &&
        status !== undefined
            ? escapeHtml(String(status))
            : "";

    const time = formatHistoryTime(
        item.timestamp,
    );

    element.innerHTML = `
        <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
                <span
                    class="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                    ${method}
                </span>

                ${
                    statusText
                        ? `
                    <span
                        class="text-[10px] text-muted-foreground"
                    >
                        ${statusText}
                    </span>
                `
                        : ""
                }
            </div>

            <div
                class="truncate text-xs font-medium"
                title="${url}"
            >
                ${url || "Untitled request"}
            </div>

            <div
                class="mt-1 text-[10px] text-muted-foreground"
            >
                ${time}
            </div>
        </div>

        <button
            type="button"
            data-history-remove
            class="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
            aria-label="Remove request from history"
            title="Remove"
        >
            Remove
        </button>
    `;

    return element;
}

// ============================================================
// Formatting
// ============================================================

/**
 * Format a history timestamp.
 *
 * @param {number} timestamp
 * @returns {string}
 */
function formatHistoryTime(timestamp) {
    if (!Number.isFinite(timestamp)) {
        return "";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = Date.now();
    const difference = Math.max(
        0,
        now - timestamp,
    );

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (difference < minute) {
        return "Just now";
    }

    if (difference < hour) {
        const minutes = Math.floor(
            difference / minute,
        );

        return `${minutes} min ago`;
    }

    if (difference < day) {
        const hours = Math.floor(
            difference / hour,
        );

        return `${hours} hr ago`;
    }

    if (difference < 7 * day) {
        const days = Math.floor(
            difference / day,
        );

        return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        },
    );
}

// ============================================================
// Cloning Helpers
// ============================================================

/**
 * Clone an array safely.
 *
 * @param {unknown} value
 * @returns {Array}
 */
function cloneArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => {
        if (!item || typeof item !== "object") {
            return item;
        }

        return {
            ...item,
        };
    });
}

/**
 * Clone authentication configuration.
 *
 * @param {Object|null} auth
 * @returns {Object}
 */
function cloneAuth(auth) {
    return {
        type: auth?.type || "none",
        fields: {
            ...(auth?.fields || {}),
        },
    };
}

/**
 * Clone a request configuration.
 *
 * @param {Object} request
 * @returns {Object}
 */
function cloneRequest(request = {}) {
    return {
        method: request.method || "GET",
        url: request.url || "",
        params: cloneArray(request.params),
        headers: cloneArray(request.headers),
        body: request.body || "",
        auth: cloneAuth(request.auth),
    };
}

// ============================================================
// HTML Safety
// ============================================================

/**
 * Escape text before inserting it into HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// Exports
// ============================================================

export default {
    initHistory,
    addHistory,
    getHistory,
    getHistoryItem,
    loadHistoryItem,
    removeHistoryItem,
    clearHistory,
    renderHistory,
};