// src/scripts/features/request-builder/headers.js

/**
 * Request Headers Manager
 *
 * Responsible for managing the request header rows in the UI.
 *
 * This module does not:
 * - execute HTTP requests
 * - manage authentication
 * - render responses
 * - update application state directly
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

let headers = [];

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the headers manager.
 *
 * @returns {Object} Headers API
 */
export function initHeaders() {
    cacheElements();
    bindEvents();
    renderHeaders();

    return {
        getHeaders,
        setHeaders,
        addHeader,
        updateHeader,
        removeHeader,
        clearHeaders,
    };
}

/**
 * Cache header-related DOM elements.
 */
function cacheElements() {
    elements.container =
        document.getElementById("request-headers");

    elements.addButton =
        document.getElementById("add-header");
}

// ============================================================
// Events
// ============================================================

/**
 * Bind header UI events.
 */
function bindEvents() {
    elements.addButton?.addEventListener("click", () => {
        addHeader();
    });
}

/**
 * Handle input changes inside the headers container.
 *
 * @param {Event} event
 */
function handleInput(event) {
    const input = event.target;

    if (!input.matches("[data-header-field]")) {
        return;
    }

    const row = input.closest("[data-header-index]");

    if (!row) {
        return;
    }

    const index = Number(row.dataset.headerIndex);
    const field = input.dataset.headerField;

    if (!Number.isInteger(index) || !headers[index]) {
        return;
    }

    if (!["name", "value"].includes(field)) {
        return;
    }

    headers[index][field] = input.value;
}

/**
 * Handle header row actions.
 *
 * @param {Event} event
 */
function handleClick(event) {
    const button = event.target.closest("[data-header-action]");

    if (!button) {
        return;
    }

    const row = button.closest("[data-header-index]");

    if (!row) {
        return;
    }

    const index = Number(row.dataset.headerIndex);
    const action = button.dataset.headerAction;

    if (!Number.isInteger(index)) {
        return;
    }

    if (action === "remove") {
        removeHeader(index);
    }
}

/**
 * Ensure delegated events are attached when the container exists.
 */
function bindContainerEvents() {
    if (!elements.container) {
        return;
    }

    if (elements.container.dataset.headersEventsBound === "true") {
        return;
    }

    elements.container.addEventListener("input", handleInput);
    elements.container.addEventListener("change", handleInput);
    elements.container.addEventListener("click", handleClick);

    elements.container.dataset.headersEventsBound = "true";
}

// ============================================================
// Header Normalization
// ============================================================

/**
 * Normalize a single header object.
 *
 * @param {unknown} header
 * @returns {{name: string, value: string, enabled: boolean}}
 */
function normalizeHeader(header) {
    if (!header || typeof header !== "object") {
        return {
            name: "",
            value: "",
            enabled: true,
        };
    }

    return {
        name: String(header.name ?? "").trim(),
        value: String(header.value ?? ""),
        enabled: header.enabled !== false,
    };
}

/**
 * Normalize an array of headers.
 *
 * @param {unknown} value
 * @returns {Array<{name: string, value: string, enabled: boolean}>}
 */
function normalizeHeaders(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map(normalizeHeader);
}

// ============================================================
// Rendering
// ============================================================

/**
 * Render all header rows.
 */
function renderHeaders() {
    if (!elements.container) {
        cacheElements();
    }

    if (!elements.container) {
        return;
    }

    bindContainerEvents();

    elements.container.innerHTML = "";

    if (headers.length === 0) {
        renderEmptyState();
        return;
    }

    headers.forEach((header, index) => {
        elements.container.appendChild(
            createHeaderRow(header, index),
        );
    });
}

/**
 * Render an empty header state.
 */
function renderEmptyState() {
    if (!elements.container) {
        return;
    }

    const empty = document.createElement("div");

    empty.className =
        "rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground";

    empty.textContent = "No headers added.";

    elements.container.appendChild(empty);
}

/**
 * Create a header row.
 *
 * @param {{name: string, value: string, enabled: boolean}} header
 * @param {number} index
 * @returns {HTMLElement}
 */
function createHeaderRow(header, index) {
    const row = document.createElement("div");

    row.dataset.headerIndex = String(index);

    row.className =
        "grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center";

    const enabled = document.createElement("input");

    enabled.type = "checkbox";
    enabled.checked = header.enabled !== false;
    enabled.title = "Enable header";
    enabled.setAttribute("aria-label", "Enable header");
    enabled.dataset.headerField = "enabled";

    enabled.className = "h-4 w-4";

    enabled.addEventListener("change", () => {
        headers[index].enabled = enabled.checked;
    });

    const nameInput = document.createElement("input");

    nameInput.type = "text";
    nameInput.value = header.name;
    nameInput.placeholder = "Header name";
    nameInput.autocomplete = "off";
    nameInput.dataset.headerField = "name";

    nameInput.className =
        "h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

    const valueInput = document.createElement("input");

    valueInput.type = "text";
    valueInput.value = header.value;
    valueInput.placeholder = "Header value";
    valueInput.autocomplete = "off";
    valueInput.dataset.headerField = "value";

    valueInput.className =
        "h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.dataset.headerAction = "remove";
    removeButton.className =
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-sm transition hover:bg-muted";

    removeButton.setAttribute("aria-label", "Remove header");
    removeButton.title = "Remove header";
    removeButton.textContent = "×";

    row.append(
        enabled,
        nameInput,
        valueInput,
        removeButton,
    );

    return row;
}

// ============================================================
// Header Access
// ============================================================

/**
 * Get the current headers.
 *
 * Empty header rows are preserved so the UI can restore them.
 *
 * @returns {Array<{name: string, value: string, enabled: boolean}>}
 */
export function getHeaders() {
    return headers.map((header) => ({
        ...header,
    }));
}

/**
 * Replace all headers.
 *
 * @param {Array} value
 * @returns {Array}
 */
export function setHeaders(value = []) {
    headers = normalizeHeaders(value);

    renderHeaders();

    return getHeaders();
}

/**
 * Add a new empty header.
 *
 * @param {Object} [header]
 * @returns {Object}
 */
export function addHeader(header = {}) {
    headers.push(normalizeHeader(header));

    renderHeaders();

    const index = headers.length - 1;

    focusHeader(index);

    return {
        ...headers[index],
    };
}

/**
 * Update a header.
 *
 * @param {number} index
 * @param {Object} updates
 * @returns {Object|null}
 */
export function updateHeader(index, updates = {}) {
    if (!Number.isInteger(index) || !headers[index]) {
        return null;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
        headers[index].name =
            String(updates.name ?? "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, "value")) {
        headers[index].value =
            String(updates.value ?? "");
    }

    if (Object.prototype.hasOwnProperty.call(updates, "enabled")) {
        headers[index].enabled =
            updates.enabled !== false;
    }

    renderHeaders();

    return {
        ...headers[index],
    };
}

/**
 * Remove a header.
 *
 * @param {number} index
 * @returns {Object|null}
 */
export function removeHeader(index) {
    if (!Number.isInteger(index) || !headers[index]) {
        return null;
    }

    const removed = headers.splice(index, 1)[0];

    renderHeaders();

    return {
        ...removed,
    };
}

/**
 * Remove all headers.
 */
export function clearHeaders() {
    headers = [];
    renderHeaders();
}

// ============================================================
// Header Utilities
// ============================================================

/**
 * Return only enabled and valid headers.
 *
 * This is useful immediately before constructing a Fetch request.
 *
 * @returns {Array<{name: string, value: string}>}
 */
export function getEnabledHeaders() {
    return headers
        .filter(
            (header) =>
                header.enabled !== false &&
                header.name.trim() !== "",
        )
        .map((header) => ({
            name: header.name.trim(),
            value: header.value,
        }));
}

/**
 * Find a header by name.
 *
 * Header names are compared case-insensitively.
 *
 * @param {string} name
 * @returns {Object|null}
 */
export function findHeader(name) {
    const target = String(name ?? "")
        .trim()
        .toLowerCase();

    if (!target) {
        return null;
    }

    const header = headers.find(
        (item) =>
            item.name.trim().toLowerCase() === target,
    );

    return header ? { ...header } : null;
}

/**
 * Check whether a header exists.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function hasHeader(name) {
    return Boolean(findHeader(name));
}

/**
 * Set or replace a header by name.
 *
 * @param {string} name
 * @param {string} value
 * @param {boolean} [enabled=true]
 * @returns {Object}
 */
export function setHeader(
    name,
    value = "",
    enabled = true,
) {
    const normalizedName = String(name ?? "").trim();

    if (!normalizedName) {
        return null;
    }

    const existingIndex = headers.findIndex(
        (header) =>
            header.name.trim().toLowerCase() ===
            normalizedName.toLowerCase(),
    );

    const header = {
        name: normalizedName,
        value: String(value ?? ""),
        enabled: enabled !== false,
    };

    if (existingIndex >= 0) {
        headers[existingIndex] = header;
    } else {
        headers.push(header);
    }

    renderHeaders();

    return {
        ...header,
    };
}

/**
 * Remove a header by name.
 *
 * @param {string} name
 * @returns {Object|null}
 */
export function removeHeaderByName(name) {
    const target = String(name ?? "")
        .trim()
        .toLowerCase();

    if (!target) {
        return null;
    }

    const index = headers.findIndex(
        (header) =>
            header.name.trim().toLowerCase() === target,
    );

    if (index < 0) {
        return null;
    }

    return removeHeader(index);
}

/**
 * Remove empty header rows.
 *
 * @returns {Array}
 */
export function removeEmptyHeaders() {
    headers = headers.filter(
        (header) =>
            header.name.trim() !== "" ||
            header.value.trim() !== "",
    );

    renderHeaders();

    return getHeaders();
}

// ============================================================
// Focus Helpers
// ============================================================

/**
 * Focus the name field of a header row.
 *
 * @param {number} index
 */
function focusHeader(index) {
    if (!elements.container) {
        return;
    }

    requestAnimationFrame(() => {
        const row = elements.container.querySelector(
            `[data-header-index="${index}"]`,
        );

        const input = row?.querySelector(
            '[data-header-field="name"]',
        );

        input?.focus();
    });
}

/**
 * Focus the headers section.
 */
export function focusHeaders() {
    if (!elements.container) {
        cacheElements();
    }

    const firstInput = elements.container?.querySelector(
        '[data-header-field="name"]',
    );

    firstInput?.focus();
}

// ============================================================
// Default Export
// ============================================================

export default {
    initHeaders,
    getHeaders,
    setHeaders,
    addHeader,
    updateHeader,
    removeHeader,
    clearHeaders,
    getEnabledHeaders,
    findHeader,
    hasHeader,
    setHeader,
    removeHeaderByName,
    removeEmptyHeaders,
    focusHeaders,
};