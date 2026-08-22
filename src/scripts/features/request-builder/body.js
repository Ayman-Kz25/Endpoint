// src/scripts/features/request-builder/body.js

/**
 * Request Body
 *
 * Manages the request-body editor used by the request builder.
 *
 * Responsibilities:
 * - Read the request body from the UI
 * - Write request-body values to the UI
 * - Track the selected body format when available
 * - Provide helpers for JSON validation and formatting
 *
 * This module does not:
 * - Execute HTTP requests
 * - Modify response state
 * - Show notifications
 * - Build the final request URL
 */

// ============================================================
// DOM References
// ============================================================

const elements = {
    body: null,
    bodyType: null,
    formatButton: null,
    clearButton: null,
};

let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the request body editor.
 *
 * @returns {Object} Body API
 */
export function initRequestBody() {
    cacheElements();

    if (!initialized) {
        bindEvents();
        initialized = true;
    }

    return {
        getRequestBody,
        setRequestBody,
        clearRequestBody,
        getBodyType,
        setBodyType,
        isValidJson,
        formatJson,
    };
}

// ============================================================
// DOM Helpers
// ============================================================

/**
 * Cache request-body DOM elements.
 */
function cacheElements() {
    elements.body =
        document.getElementById("request-body") ||
        document.getElementById("body-editor");

    elements.bodyType =
        document.getElementById("request-body-type") ||
        document.getElementById("body-type");

    elements.formatButton =
        document.getElementById("format-request-body") ||
        document.querySelector('[data-action="format-request-body"]');

    elements.clearButton =
        document.getElementById("clear-request-body") ||
        document.querySelector('[data-action="clear-request-body"]');
}

/**
 * Get the body input element.
 *
 * @returns {HTMLTextAreaElement|HTMLInputElement|null}
 */
function getBodyElement() {
    if (!elements.body) {
        cacheElements();
    }

    return elements.body;
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind body-editor events.
 */
function bindEvents() {
    if (elements.formatButton) {
        elements.formatButton.addEventListener("click", handleFormat);
    }

    if (elements.clearButton) {
        elements.clearButton.addEventListener("click", handleClear);
    }

    if (elements.bodyType) {
        elements.bodyType.addEventListener(
            "change",
            handleBodyTypeChange
        );
    }

    const body = getBodyElement();

    if (body) {
        body.addEventListener("keydown", handleBodyKeydown);
    }
}

/**
 * Handle body formatting.
 *
 * @param {Event} event
 */
function handleFormat(event) {
    event.preventDefault();

    const body = getBodyElement();

    if (!body) {
        return;
    }

    const formatted = formatJson(body.value);

    if (formatted !== null) {
        body.value = formatted;

        body.dispatchEvent(
            new Event("input", {
                bubbles: true,
            })
        );
    }
}

/**
 * Handle body clearing.
 *
 * @param {Event} event
 */
function handleClear(event) {
    event.preventDefault();
    clearRequestBody();
}

/**
 * Handle body type changes.
 *
 * @param {Event} event
 */
function handleBodyTypeChange(event) {
    const type = event.target.value;

    if (type !== "json") {
        return;
    }

    const body = getBodyElement();

    if (!body || !body.value.trim()) {
        return;
    }

    const formatted = formatJson(body.value);

    if (formatted !== null) {
        body.value = formatted;
    }
}

/**
 * Handle useful keyboard shortcuts inside the body editor.
 *
 * Tab inserts spaces instead of moving focus.
 *
 * @param {KeyboardEvent} event
 */
function handleBodyKeydown(event) {
    if (event.key !== "Tab") {
        return;
    }

    event.preventDefault();

    const target = event.target;

    const start = target.selectionStart;
    const end = target.selectionEnd;

    const value = target.value;

    target.value =
        value.slice(0, start) +
        "    " +
        value.slice(end);

    target.selectionStart = start + 4;
    target.selectionEnd = start + 4;

    target.dispatchEvent(
        new Event("input", {
            bubbles: true,
        })
    );
}

// ============================================================
// Public API
// ============================================================

/**
 * Get the current request body.
 *
 * @returns {string}
 */
export function getRequestBody() {
    const body = getBodyElement();

    if (!body) {
        return "";
    }

    return body.value ?? "";
}

/**
 * Set the request body.
 *
 * @param {unknown} value
 */
export function setRequestBody(value = "") {
    const body = getBodyElement();

    if (!body) {
        return;
    }

    if (value === null || value === undefined) {
        body.value = "";
    } else if (typeof value === "string") {
        body.value = value;
    } else {
        try {
            body.value = JSON.stringify(value, null, 2);
        } catch {
            body.value = String(value);
        }
    }
}

/**
 * Clear the request body.
 */
export function clearRequestBody() {
    setRequestBody("");

    const body = getBodyElement();

    body?.dispatchEvent(
        new Event("input", {
            bubbles: true,
        })
    );
}

/**
 * Get the selected body type.
 *
 * @returns {string}
 */
export function getBodyType() {
    if (!elements.bodyType) {
        cacheElements();
    }

    return elements.bodyType?.value || "text";
}

/**
 * Set the body type.
 *
 * @param {string} type
 */
export function setBodyType(type = "text") {
    if (!elements.bodyType) {
        cacheElements();
    }

    if (!elements.bodyType) {
        return;
    }

    const supportedTypes = [
        "none",
        "text",
        "json",
        "xml",
        "html",
        "form-data",
        "urlencoded",
    ];

    const normalizedType = String(type).toLowerCase();

    elements.bodyType.value = supportedTypes.includes(normalizedType)
        ? normalizedType
        : "text";
}

// ============================================================
// JSON Helpers
// ============================================================

/**
 * Check whether a string contains valid JSON.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidJson(value = "") {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Format JSON using two-space indentation.
 *
 * @param {string|Object|Array} value
 * @returns {string|null}
 */
export function formatJson(value = "") {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "";
    }

    try {
        const parsed =
            typeof value === "string"
                ? JSON.parse(value)
                : value;

        return JSON.stringify(parsed, null, 2);
    } catch {
        return null;
    }
}

/**
 * Minify JSON.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function minifyJson(value = "") {
    if (!value || !String(value).trim()) {
        return "";
    }

    try {
        return JSON.stringify(JSON.parse(value));
    } catch {
        return null;
    }
}

/**
 * Parse JSON body safely.
 *
 * @param {string} value
 * @returns {unknown|null}
 */
export function parseJsonBody(value = getRequestBody()) {
    if (!value || !String(value).trim()) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// ============================================================
// Body Validation
// ============================================================

/**
 * Validate the current request body.
 *
 * JSON bodies are validated when the selected body type is JSON.
 *
 * @param {string} value
 * @param {string} type
 * @returns {{valid: boolean, error: string}}
 */
export function validateRequestBody(
    value = getRequestBody(),
    type = getBodyType()
) {
    const body = String(value ?? "").trim();

    if (!body || type === "none") {
        return {
            valid: true,
            error: "",
        };
    }

    if (type === "json" && !isValidJson(body)) {
        return {
            valid: false,
            error: "The request body contains invalid JSON.",
        };
    }

    return {
        valid: true,
        error: "",
    };
}

// ============================================================
// Content-Type Helpers
// ============================================================

/**
 * Return the recommended Content-Type for a body type.
 *
 * @param {string} type
 * @returns {string}
 */
export function getContentTypeForBodyType(type = getBodyType()) {
    switch (String(type).toLowerCase()) {
        case "json":
            return "application/json";

        case "xml":
            return "application/xml";

        case "html":
            return "text/html";

        case "form-data":
            return "multipart/form-data";

        case "urlencoded":
            return "application/x-www-form-urlencoded";

        case "text":
            return "text/plain";

        default:
            return "";
    }
}

// ============================================================
// Exports
// ============================================================

export default {
    initRequestBody,
    getRequestBody,
    setRequestBody,
    clearRequestBody,
    getBodyType,
    setBodyType,
    isValidJson,
    formatJson,
    minifyJson,
    parseJsonBody,
    validateRequestBody,
    getContentTypeForBodyType,
};