// src/scripts/features/history/history-storage.js

/**
 * History Storage
 *
 * Provides a small persistence layer for request history.
 *
 * Responsibilities:
 * - Save request history to localStorage
 * - Load persisted history
 * - Remove individual history entries
 * - Clear all persisted history
 * - Validate and normalize stored data
 *
 * This module does not:
 * - render history UI
 * - modify application state directly
 * - execute requests
 * - show notifications
 */

import { HISTORY } from "../../core/constants.js";

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY =
    HISTORY?.STORAGE_KEY ||
    "http-request-workspace-history";

const DEFAULT_MAX_ENTRIES =
    Number.isFinite(HISTORY?.MAX_ENTRIES)
        ? HISTORY.MAX_ENTRIES
        : 50;

// ============================================================
// Helpers
// ============================================================

/**
 * Check whether localStorage is available.
 *
 * @returns {boolean}
 */
function isStorageAvailable() {
    try {
        if (typeof window === "undefined" || !window.localStorage) {
            return false;
        }

        const testKey = "__history_storage_test__";

        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);

        return true;
    } catch {
        return false;
    }
}

/**
 * Safely clone a value.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneValue(value) {
    if (value === undefined || value === null) {
        return value;
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
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
 * Normalize a request object.
 *
 * @param {Object} request
 * @returns {Object}
 */
function normalizeRequest(request = {}) {
    return {
        method: String(request.method || "GET").toUpperCase(),
        url: String(request.url || ""),
        params: Array.isArray(request.params)
            ? cloneValue(request.params)
            : [],
        headers: Array.isArray(request.headers)
            ? cloneValue(request.headers)
            : [],
        body:
            request.body === undefined || request.body === null
                ? ""
                : String(request.body),
        auth: {
            type: String(request.auth?.type || "none"),
            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };
}

/**
 * Normalize a history entry.
 *
 * @param {Object} entry
 * @returns {Object|null}
 */
function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") {
        return null;
    }

    const request =
        entry.request && typeof entry.request === "object"
            ? normalizeRequest(entry.request)
            : normalizeRequest(entry);

    return {
        id: String(entry.id || createHistoryId()),
        request,
        timestamp: Number.isFinite(entry.timestamp)
            ? entry.timestamp
            : Date.now(),
        title:
            typeof entry.title === "string"
                ? entry.title
                : "",
    };
}

/**
 * Normalize an array of history entries.
 *
 * @param {unknown} history
 * @param {number} maxEntries
 * @returns {Array}
 */
function normalizeHistory(history, maxEntries = DEFAULT_MAX_ENTRIES) {
    if (!Array.isArray(history)) {
        return [];
    }

    const normalized = history
        .map(normalizeEntry)
        .filter(Boolean);

    const unique = [];
    const ids = new Set();

    for (const entry of normalized) {
        if (ids.has(entry.id)) {
            continue;
        }

        ids.add(entry.id);
        unique.push(entry);
    }

    unique.sort(
        (a, b) =>
            Number(b.timestamp || 0) -
            Number(a.timestamp || 0),
    );

    return unique.slice(0, Math.max(0, maxEntries));
}

/**
 * Read the raw history string from localStorage.
 *
 * @returns {string|null}
 */
function readRawHistory() {
    if (!isStorageAvailable()) {
        return null;
    }

    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

/**
 * Write history to localStorage.
 *
 * @param {Array} history
 * @returns {boolean}
 */
function writeHistory(history) {
    if (!isStorageAvailable()) {
        return false;
    }

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(history),
        );

        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Public Storage API
// ============================================================

/**
 * Load request history from localStorage.
 *
 * @param {Object} options
 * @param {number} [options.maxEntries]
 * @returns {Array}
 */
export function loadHistory({
    maxEntries = DEFAULT_MAX_ENTRIES,
} = {}) {
    const raw = readRawHistory();

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        const history = normalizeHistory(
            parsed,
            maxEntries,
        );

        // Clean up malformed or outdated storage.
        if (JSON.stringify(parsed) !== JSON.stringify(history)) {
            writeHistory(history);
        }

        return history;
    } catch {
        // Remove corrupted persisted data.
        clearHistory();

        return [];
    }
}

/**
 * Save an entire history collection.
 *
 * @param {Array} history
 * @param {Object} options
 * @param {number} [options.maxEntries]
 * @returns {Array}
 */
export function saveHistory(
    history = [],
    {
        maxEntries = DEFAULT_MAX_ENTRIES,
    } = {},
) {
    const normalized = normalizeHistory(
        history,
        maxEntries,
    );

    writeHistory(normalized);

    return normalized;
}

/**
 * Add a request to history.
 *
 * @param {Object} request
 * @param {Object} options
 * @param {string} [options.title]
 * @param {number} [options.maxEntries]
 * @returns {Object|null}
 */
export function addHistoryEntry(
    request = {},
    {
        title = "",
        maxEntries = DEFAULT_MAX_ENTRIES,
    } = {},
) {
    const history = loadHistory({
        maxEntries,
    });

    const entry = normalizeEntry({
        id: createHistoryId(),
        request,
        timestamp: Date.now(),
        title,
    });

    if (!entry) {
        return null;
    }

    const nextHistory = [
        entry,
        ...history.filter(
            (item) =>
                !areRequestsEqual(
                    item.request,
                    entry.request,
                ),
        ),
    ];

    saveHistory(nextHistory, {
        maxEntries,
    });

    return cloneValue(entry);
}

/**
 * Update an existing history entry.
 *
 * @param {string} id
 * @param {Object} updates
 * @param {Object} options
 * @param {number} [options.maxEntries]
 * @returns {Object|null}
 */
export function updateHistoryEntry(
    id,
    updates = {},
    {
        maxEntries = DEFAULT_MAX_ENTRIES,
    } = {},
) {
    if (!id) {
        return null;
    }

    const history = loadHistory({
        maxEntries,
    });

    const index = history.findIndex(
        (entry) => entry.id === String(id),
    );

    if (index === -1) {
        return null;
    }

    const current = history[index];

    const updated = normalizeEntry({
        ...current,
        ...updates,
        id: current.id,
        timestamp:
            updates.timestamp !== undefined
                ? updates.timestamp
                : current.timestamp,
        request:
            updates.request !== undefined
                ? updates.request
                : current.request,
    });

    history[index] = updated;

    saveHistory(history, {
        maxEntries,
    });

    return cloneValue(updated);
}

/**
 * Get a single history entry.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getHistoryEntry(id) {
    if (!id) {
        return null;
    }

    const history = loadHistory();

    const entry = history.find(
        (item) => item.id === String(id),
    );

    return entry ? cloneValue(entry) : null;
}

/**
 * Remove a history entry.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function removeHistoryEntry(id) {
    if (!id) {
        return false;
    }

    const history = loadHistory();

    const nextHistory = history.filter(
        (entry) => entry.id !== String(id),
    );

    if (nextHistory.length === history.length) {
        return false;
    }

    saveHistory(nextHistory);

    return true;
}

/**
 * Clear all persisted request history.
 *
 * @returns {boolean}
 */
export function clearHistory() {
    if (!isStorageAvailable()) {
        return false;
    }

    try {
        window.localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the number of persisted history entries.
 *
 * @returns {number}
 */
export function getHistoryCount() {
    return loadHistory().length;
}

/**
 * Check whether a history entry exists.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function hasHistoryEntry(id) {
    if (!id) {
        return false;
    }

    return Boolean(getHistoryEntry(id));
}

/**
 * Check whether two requests represent the same request.
 *
 * @param {Object} first
 * @param {Object} second
 * @returns {boolean}
 */
export function areRequestsEqual(first = {}, second = {}) {
    try {
        return (
            JSON.stringify(
                normalizeRequest(first),
            ) ===
            JSON.stringify(
                normalizeRequest(second),
            )
        );
    } catch {
        return false;
    }
}

/**
 * Create a history entry without saving it.
 *
 * Useful when the history feature needs to prepare
 * an entry before deciding whether to persist it.
 *
 * @param {Object} request
 * @param {Object} options
 * @param {string} [options.title]
 * @returns {Object|null}
 */
export function createHistoryEntry(
    request = {},
    {
        title = "",
    } = {},
) {
    return normalizeEntry({
        id: createHistoryId(),
        request,
        timestamp: Date.now(),
        title,
    });
}

/**
 * Export history as a JSON string.
 *
 * @returns {string}
 */
export function exportHistory() {
    return JSON.stringify(
        loadHistory(),
        null,
        2,
    );
}

/**
 * Import history from a JSON string.
 *
 * Existing history is replaced by imported entries.
 *
 * @param {string} raw
 * @param {Object} options
 * @param {number} [options.maxEntries]
 * @returns {Array}
 */
export function importHistory(
    raw,
    {
        maxEntries = DEFAULT_MAX_ENTRIES,
    } = {},
) {
    if (typeof raw !== "string" || !raw.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);

        const imported = normalizeHistory(
            parsed,
            maxEntries,
        );

        saveHistory(imported, {
            maxEntries,
        });

        return imported;
    } catch {
        return [];
    }
}

// ============================================================
// Storage Information
// ============================================================

/**
 * Get storage metadata.
 *
 * @returns {Object}
 */
export function getStorageInfo() {
    let bytes = 0;

    const raw = readRawHistory();

    if (raw) {
        try {
            bytes = new Blob([raw]).size;
        } catch {
            bytes = raw.length;
        }
    }

    return {
        available: isStorageAvailable(),
        key: STORAGE_KEY,
        count: loadHistory().length,
        bytes,
        maxEntries: DEFAULT_MAX_ENTRIES,
    };
}

// ============================================================
// Default Export
// ============================================================

export default {
    loadHistory,
    saveHistory,
    addHistoryEntry,
    updateHistoryEntry,
    getHistoryEntry,
    removeHistoryEntry,
    clearHistory,
    getHistoryCount,
    hasHistoryEntry,
    areRequestsEqual,
    createHistoryEntry,
    exportHistory,
    importHistory,
    getStorageInfo,
};