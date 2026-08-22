// src/scripts/features/history/history-renderer.js

/**
 * History Renderer
 *
 * Responsible for rendering persisted request history into the
 * history/sidebar UI.
 *
 * Responsibilities:
 * - Render history entries
 * - Format history metadata
 * - Handle empty states
 * - Provide request-entry DOM helpers
 *
 * This module does not:
 * - execute HTTP requests
 * - modify application state directly
 * - persist history
 * - show toast notifications
 */

// ============================================================
// DOM References
// ============================================================

const elements = {
    container: null,
    emptyState: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the history renderer.
 *
 * @param {Object} options
 * @param {string} [options.containerId="history-list"]
 * @returns {Object}
 */
export function initHistoryRenderer({
    containerId = "history-list",
} = {}) {
    cacheElements(containerId);

    return {
        renderHistory,
        renderEntry,
        clear,
        getContainer,
    };
}

/**
 * Cache history DOM elements.
 *
 * @param {string} containerId
 */
function cacheElements(containerId) {
    elements.container =
        document.getElementById(containerId);

    elements.emptyState =
        document.getElementById("history-empty");
}

// ============================================================
// Rendering
// ============================================================

/**
 * Render all history entries.
 *
 * @param {Array} entries
 * @param {Object} options
 * @param {Function} [options.onSelect]
 * @param {Function} [options.onDelete]
 */
export function renderHistory(
    entries = [],
    {
        onSelect = null,
        onDelete = null,
    } = {},
) {
    if (!elements.container) {
        return;
    }

    elements.container.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
        renderEmptyState();
        return;
    }

    hideEmptyState();

    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
        const element = renderEntry(entry);

        if (!element) {
            return;
        }

        bindEntryEvents(
            element,
            entry,
            {
                onSelect,
                onDelete,
            },
        );

        fragment.appendChild(element);
    });

    elements.container.appendChild(fragment);
}

/**
 * Render one history entry.
 *
 * @param {Object} entry
 * @returns {HTMLElement|null}
 */
export function renderEntry(entry) {
    if (!entry || typeof entry !== "object") {
        return null;
    }

    const request =
        entry.request &&
        typeof entry.request === "object"
            ? entry.request
            : entry;

    const method =
        String(request.method || "GET").toUpperCase();

    const url =
        String(request.url || "").trim();

    const displayUrl =
        getDisplayUrl(url);

    const title =
        entry.title?.trim() ||
        displayUrl ||
        "Untitled request";

    const timestamp =
        formatTimestamp(entry.timestamp);

    const statusClass =
        getMethodClass(method);

    const item =
        document.createElement("div");

    item.className =
        "group flex items-start gap-2 rounded-md px-2 py-2 transition hover:bg-surface";

    item.dataset.historyId =
        String(entry.id || "");

    item.setAttribute(
        "role",
        "listitem",
    );

    const content =
        document.createElement("button");

    content.type = "button";

    content.className =
        "min-w-0 flex-1 text-left";

    content.dataset.action =
        "select";

    const topRow =
        document.createElement("div");

    topRow.className =
        "flex min-w-0 items-center gap-2";

    const methodBadge =
        document.createElement("span");

    methodBadge.className =
        `shrink-0 text-[10px] font-semibold ${statusClass}`;

    methodBadge.textContent =
        method;

    const titleElement =
        document.createElement("span");

    titleElement.className =
        "min-w-0 flex-1 truncate text-xs font-medium text-foreground";

    titleElement.textContent =
        title;

    topRow.append(
        methodBadge,
        titleElement,
    );

    const urlElement =
        document.createElement("div");

    urlElement.className =
        "mt-0.5 truncate text-[11px] text-muted-foreground";

    urlElement.textContent =
        displayUrl || "No URL";

    const timeElement =
        document.createElement("div");

    timeElement.className =
        "mt-1 text-[10px] text-muted-foreground";

    timeElement.textContent =
        timestamp;

    content.append(
        topRow,
        urlElement,
        timeElement,
    );

    item.appendChild(content);

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
        "mt-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-danger/10 hover:text-danger group-hover:flex";

    deleteButton.dataset.action =
        "delete";

    deleteButton.setAttribute(
        "aria-label",
        "Delete request from history",
    );

    deleteButton.title =
        "Delete";

    deleteButton.innerHTML = `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            class="h-3.5 w-3.5"
            aria-hidden="true"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 7h12M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-7 0 .75 12h6.5L16 7M10 10.5v5M14 10.5v5"
            />
        </svg>
    `;

    item.appendChild(deleteButton);

    return item;
}

/**
 * Bind interaction events for a history item.
 *
 * @param {HTMLElement} element
 * @param {Object} entry
 * @param {Object} options
 * @param {Function|null} options.onSelect
 * @param {Function|null} options.onDelete
 */
function bindEntryEvents(
    element,
    entry,
    {
        onSelect,
        onDelete,
    },
) {
    const selectButton =
        element.querySelector(
            '[data-action="select"]',
        );

    const deleteButton =
        element.querySelector(
            '[data-action="delete"]',
        );

    if (selectButton && typeof onSelect === "function") {
        selectButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                onSelect(entry);
            },
        );
    }

    if (deleteButton && typeof onDelete === "function") {
        deleteButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                onDelete(entry);
            },
        );
    }
}

// ============================================================
// Empty State
// ============================================================

/**
 * Render the history empty state.
 */
function renderEmptyState() {
    if (elements.emptyState) {
        elements.emptyState.hidden = false;
        return;
    }

    if (!elements.container) {
        return;
    }

    const empty =
        document.createElement("div");

    empty.dataset.historyEmpty =
        "true";

    empty.className =
        "px-3 py-8 text-center text-xs text-muted-foreground";

    empty.textContent =
        "No request history yet.";

    elements.container.appendChild(empty);
}

/**
 * Hide the externally supplied empty state.
 */
function hideEmptyState() {
    if (!elements.emptyState) {
        return;
    }

    elements.emptyState.hidden = true;
}

// ============================================================
// Formatting
// ============================================================

/**
 * Get a compact URL for display.
 *
 * @param {string} url
 * @returns {string}
 */
export function getDisplayUrl(url) {
    if (!url) {
        return "";
    }

    try {
        const parsed =
            new URL(url);

        const path =
            `${parsed.pathname}${parsed.search}`;

        if (path && path !== "/") {
            return path;
        }

        return parsed.hostname;
    } catch {
        if (url.length > 70) {
            return `${url.slice(0, 67)}...`;
        }

        return url;
    }
}

/**
 * Format a timestamp for history display.
 *
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
    if (!timestamp) {
        return "";
    }

    const date =
        timestamp instanceof Date
            ? timestamp
            : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now =
        Date.now();

    const difference =
        Math.max(
            0,
            now - date.getTime(),
        );

    const minute =
        60 * 1000;

    const hour =
        60 * minute;

    const day =
        24 * hour;

    if (difference < minute) {
        return "Just now";
    }

    if (difference < hour) {
        const minutes =
            Math.floor(
                difference / minute,
            );

        return `${minutes}m ago`;
    }

    if (difference < day) {
        const hours =
            Math.floor(
                difference / hour,
            );

        return `${hours}h ago`;
    }

    if (difference < 7 * day) {
        const days =
            Math.floor(
                difference / day,
            );

        return `${days}d ago`;
    }

    return date.toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric",
            year:
                date.getFullYear() !==
                new Date().getFullYear()
                    ? "numeric"
                    : undefined,
        },
    );
}

/**
 * Get CSS classes for an HTTP method.
 *
 * @param {string} method
 * @returns {string}
 */
export function getMethodClass(method) {
    switch (
        String(method || "GET").toUpperCase()
    ) {
        case "GET":
            return "text-green-500";

        case "POST":
            return "text-blue-500";

        case "PUT":
            return "text-orange-500";

        case "PATCH":
            return "text-yellow-500";

        case "DELETE":
            return "text-red-500";

        case "HEAD":
            return "text-purple-500";

        case "OPTIONS":
            return "text-cyan-500";

        case "CONNECT":
            return "text-pink-500";

        case "TRACE":
            return "text-indigo-500";

        default:
            return "text-muted-foreground";
    }
}

// ============================================================
// Selection Helpers
// ============================================================

/**
 * Mark a history entry as active.
 *
 * @param {string} id
 */
export function setActiveHistoryEntry(id) {
    if (!elements.container) {
        return;
    }

    const items =
        elements.container.querySelectorAll(
            "[data-history-id]",
        );

    items.forEach((item) => {
        const active =
            String(item.dataset.historyId) ===
            String(id);

        item.classList.toggle(
            "bg-surface",
            active,
        );

        item.setAttribute(
            "aria-current",
            active ? "true" : "false",
        );
    });
}

/**
 * Remove the visual active state.
 */
export function clearActiveHistoryEntry() {
    setActiveHistoryEntry("");
}

/**
 * Get the currently rendered history item.
 *
 * @returns {HTMLElement|null}
 */
export function getActiveHistoryEntry() {
    if (!elements.container) {
        return null;
    }

    return elements.container.querySelector(
        '[aria-current="true"]',
    );
}

// ============================================================
// DOM Utilities
// ============================================================

/**
 * Clear all rendered history items.
 */
export function clear() {
    if (!elements.container) {
        return;
    }

    elements.container.innerHTML = "";
}

/**
 * Get the history container.
 *
 * @returns {HTMLElement|null}
 */
export function getContainer() {
    return elements.container;
}

/**
 * Find a rendered history entry by ID.
 *
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function getHistoryElement(id) {
    if (!elements.container || !id) {
        return null;
    }

    return elements.container.querySelector(
        `[data-history-id="${CSS.escape(String(id))}"]`,
    );
}

/**
 * Scroll a history entry into view.
 *
 * @param {string} id
 */
export function scrollToHistoryEntry(id) {
    const element =
        getHistoryElement(id);

    element?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
    });
}

// ============================================================
// Default Export
// ============================================================

export default {
    initHistoryRenderer,
    renderHistory,
    renderEntry,
    formatTimestamp,
    getDisplayUrl,
    getMethodClass,
    setActiveHistoryEntry,
    clearActiveHistoryEntry,
    getActiveHistoryEntry,
    clear,
    getContainer,
    getHistoryElement,
    scrollToHistoryEntry,
};