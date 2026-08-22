// src/scripts/features/request-builder/query-params.js

/**
 * Query Parameters
 *
 * Manages the dynamic query-parameter editor used by the request builder.
 *
 * Responsibilities:
 * - Read query parameters from the UI
 * - Write query parameters to the UI
 * - Add and remove parameter rows
 * - Track enabled/disabled parameters
 * - Keep the request state synchronized through the request-builder
 *
 * This module does not:
 * - Execute HTTP requests
 * - Build the final request URL
 * - Render responses
 * - Show notifications
 */

// ============================================================
// DOM References
// ============================================================

const elements = {
    container: null,
    addButton: null,
};

// ============================================================
// Internal State
// ============================================================

let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the query-parameter editor.
 *
 * @returns {Object} Query parameter API
 */
export function initQueryParams() {
    cacheElements();

    if (initialized) {
        return {
            getQueryParams,
            setQueryParams,
            addQueryParam,
            removeQueryParam,
            clearQueryParams,
        };
    }

    bindEvents();
    initialized = true;

    return {
        getQueryParams,
        setQueryParams,
        addQueryParam,
        removeQueryParam,
        clearQueryParams,
    };
}

// ============================================================
// DOM Helpers
// ============================================================

/**
 * Cache query-parameter DOM elements.
 */
function cacheElements() {
    elements.container =
        document.getElementById("query-params") ||
        document.getElementById("query-params-list");

    elements.addButton =
        document.getElementById("add-query-param") ||
        document.querySelector('[data-action="add-query-param"]');
}

/**
 * Find the query parameter container.
 *
 * @returns {HTMLElement|null}
 */
function getContainer() {
    if (!elements.container) {
        cacheElements();
    }

    return elements.container;
}

/**
 * Find all query parameter rows.
 *
 * @returns {HTMLElement[]}
 */
function getRows() {
    const container = getContainer();

    if (!container) {
        return [];
    }

    return Array.from(
        container.querySelectorAll(
            "[data-query-param], .query-param-row"
        )
    );
}

/**
 * Create a unique identifier for a parameter row.
 *
 * @returns {string}
 */
function createId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `query-param-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind query-parameter events.
 */
function bindEvents() {
    const container = getContainer();

    if (elements.addButton) {
        elements.addButton.addEventListener("click", (event) => {
            event.preventDefault();
            addQueryParam();
        });
    }

    if (container) {
        container.addEventListener("click", handleContainerClick);
    }
}

/**
 * Handle delegated actions inside the parameter container.
 *
 * @param {Event} event
 */
function handleContainerClick(event) {
    const target = event.target.closest(
        '[data-action="remove-query-param"], [data-remove-query-param]'
    );

    if (!target) {
        return;
    }

    event.preventDefault();

    const row = target.closest(
        "[data-query-param], .query-param-row"
    );

    if (row) {
        removeQueryParam(row);
    }
}

// ============================================================
// Row Creation
// ============================================================

/**
 * Create a query parameter row.
 *
 * @param {Object} param
 * @returns {HTMLElement|null}
 */
function createRow(param = {}) {
    const container = getContainer();

    if (!container) {
        return null;
    }

    const row = document.createElement("div");

    row.className =
        "query-param-row grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center";

    row.dataset.queryParam = "true";
    row.dataset.id = param.id || createId();

    const enabled = param.enabled !== false;
    const key = String(param.key ?? "");
    const value = String(param.value ?? "");

    row.innerHTML = `
        <input
            type="checkbox"
            class="query-param-enabled h-4 w-4 rounded border-border"
            aria-label="Enable query parameter"
            ${enabled ? "checked" : ""}
        />

        <input
            type="text"
            class="query-param-key h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Parameter"
            aria-label="Query parameter name"
            autocomplete="off"
        />

        <input
            type="text"
            class="query-param-value h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Value"
            aria-label="Query parameter value"
            autocomplete="off"
        />

        <button
            type="button"
            data-action="remove-query-param"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Remove query parameter"
            title="Remove parameter"
        >
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    const keyInput = row.querySelector(".query-param-key");
    const valueInput = row.querySelector(".query-param-value");

    if (keyInput) {
        keyInput.value = key;
    }

    if (valueInput) {
        valueInput.value = value;
    }

    return row;
}

// ============================================================
// Public UI API
// ============================================================

/**
 * Add a query parameter row.
 *
 * @param {Object} param
 * @returns {HTMLElement|null}
 */
export function addQueryParam(param = {}) {
    const container = getContainer();

    if (!container) {
        return null;
    }

    const row = createRow(param);

    if (!row) {
        return null;
    }

    container.appendChild(row);

    const keyInput = row.querySelector(".query-param-key");

    keyInput?.focus();

    return row;
}

/**
 * Remove a query parameter row.
 *
 * @param {HTMLElement|string} rowOrId
 * @returns {boolean}
 */
export function removeQueryParam(rowOrId) {
    const container = getContainer();

    if (!container) {
        return false;
    }

    let row = null;

    if (rowOrId instanceof HTMLElement) {
        row = rowOrId;
    } else if (typeof rowOrId === "string") {
        row = container.querySelector(
            `[data-id="${CSS.escape(rowOrId)}"]`
        );
    }

    if (!row) {
        return false;
    }

    row.remove();

    return true;
}

/**
 * Remove all query parameters.
 */
export function clearQueryParams() {
    const container = getContainer();

    if (!container) {
        return;
    }

    getRows().forEach((row) => row.remove());
}

/**
 * Read query parameters from the UI.
 *
 * @returns {Array<{id: string, key: string, value: string, enabled: boolean}>}
 */
export function getQueryParams() {
    const rows = getRows();

    return rows.map((row) => {
        const enabledInput = row.querySelector(
            ".query-param-enabled"
        );

        const keyInput = row.querySelector(
            ".query-param-key"
        );

        const valueInput = row.querySelector(
            ".query-param-value"
        );

        return {
            id: row.dataset.id || createId(),
            key: keyInput?.value ?? "",
            value: valueInput?.value ?? "",
            enabled: enabledInput
                ? enabledInput.checked
                : true,
        };
    });
}

/**
 * Replace all query parameters in the UI.
 *
 * @param {Array} params
 */
export function setQueryParams(params = []) {
    const container = getContainer();

    if (!container) {
        return;
    }

    clearQueryParams();

    if (!Array.isArray(params)) {
        return;
    }

    params.forEach((param) => {
        if (!param || typeof param !== "object") {
            return;
        }

        addQueryParam({
            id: param.id,
            key: param.key,
            value: param.value,
            enabled: param.enabled !== false,
        });
    });
}

// ============================================================
// Query Parameter Utilities
// ============================================================

/**
 * Return only enabled parameters with a non-empty key.
 *
 * @param {Array} params
 * @returns {Array}
 */
export function getEnabledQueryParams(params = getQueryParams()) {
    if (!Array.isArray(params)) {
        return [];
    }

    return params.filter((param) => {
        return (
            param &&
            param.enabled !== false &&
            String(param.key ?? "").trim() !== ""
        );
    });
}

/**
 * Convert query parameters into a URLSearchParams instance.
 *
 * @param {Array} params
 * @returns {URLSearchParams}
 */
export function toURLSearchParams(params = getQueryParams()) {
    const searchParams = new URLSearchParams();

    getEnabledQueryParams(params).forEach((param) => {
        const key = String(param.key ?? "").trim();
        const value = String(param.value ?? "");

        searchParams.append(key, value);
    });

    return searchParams;
}

/**
 * Convert query parameters into an encoded query string.
 *
 * @param {Array} params
 * @returns {string}
 */
export function serializeQueryParams(params = getQueryParams()) {
    return toURLSearchParams(params).toString();
}

/**
 * Parse a URL into query parameter objects.
 *
 * Existing parameters are preserved in their original order.
 *
 * @param {string} url
 * @returns {Array}
 */
export function parseQueryParamsFromUrl(url = "") {
    if (!url || typeof url !== "string") {
        return [];
    }

    try {
        const parsedUrl = new URL(url);

        const params = [];

        parsedUrl.searchParams.forEach((value, key) => {
            params.push({
                id: createId(),
                key,
                value,
                enabled: true,
            });
        });

        return params;
    } catch {
        return [];
    }
}

/**
 * Remove the query string from a URL.
 *
 * @param {string} url
 * @returns {string}
 */
export function removeQueryString(url = "") {
    if (!url || typeof url !== "string") {
        return "";
    }

    try {
        const parsedUrl = new URL(url);

        parsedUrl.search = "";

        return parsedUrl.href;
    } catch {
        return url;
    }
}

// ============================================================
// Default Export
// ============================================================

export default {
    initQueryParams,
    getQueryParams,
    setQueryParams,
    addQueryParam,
    removeQueryParam,
    clearQueryParams,
    getEnabledQueryParams,
    toURLSearchParams,
    serializeQueryParams,
    parseQueryParamsFromUrl,
    removeQueryString,
};