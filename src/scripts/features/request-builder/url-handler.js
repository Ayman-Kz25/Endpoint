// src/scripts/features/request-builder/url-handler.js

/**
 * Request URL Handler
 *
 * Responsible for reading, writing, normalizing, and validating
 * the request URL field.
 *
 * This module does not:
 * - execute HTTP requests
 * - manage query parameters
 * - manage authentication
 * - render responses
 * - update application state directly
 */

// ============================================================
// DOM References
// ============================================================

const elements = {
    url: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the URL handler.
 *
 * Safe to call before the request URL element exists.
 *
 * @returns {Object} URL handler API
 */
export function initUrlHandler() {
    cacheElements();
    return {
        getRequestUrl,
        setRequestUrl,
        clearRequestUrl,
        normalizeRequestUrl,
        validateRequestUrl,
        hasRequestUrl,
    };
}

/**
 * Cache the request URL input.
 */
function cacheElements() {
    elements.url = document.getElementById("request-url");
}

// ============================================================
// URL Access
// ============================================================

/**
 * Get the current request URL from the input.
 *
 * @returns {string}
 */
export function getRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    return elements.url?.value?.trim() || "";
}

/**
 * Set the request URL input value.
 *
 * @param {string} url
 * @returns {string}
 */
export function setRequestUrl(url = "") {
    if (!elements.url) {
        cacheElements();
    }

    const normalized = normalizeRequestUrl(url);

    if (elements.url) {
        elements.url.value = normalized;
    }

    return normalized;
}

/**
 * Clear the request URL input.
 *
 * @returns {string}
 */
export function clearRequestUrl() {
    return setRequestUrl("");
}

/**
 * Check whether a request URL has been entered.
 *
 * @returns {boolean}
 */
export function hasRequestUrl() {
    return Boolean(getRequestUrl());
}

// ============================================================
// URL Normalization
// ============================================================

/**
 * Normalize a URL before storing it in the input.
 *
 * The handler intentionally does not add a protocol automatically.
 * This prevents accidentally changing a URL such as:
 * `localhost:3000`
 * into an unintended address.
 *
 * @param {unknown} url
 * @returns {string}
 */
export function normalizeRequestUrl(url) {
    if (url === undefined || url === null) {
        return "";
    }

    return String(url).trim();
}

// ============================================================
// URL Parsing
// ============================================================

/**
 * Parse the current request URL.
 *
 * @returns {URL|null}
 */
export function parseRequestUrl() {
    const url = getRequestUrl();

    if (!url) {
        return null;
    }

    try {
        return new URL(url);
    } catch {
        return null;
    }
}

/**
 * Get the URL protocol.
 *
 * @returns {string}
 */
export function getRequestProtocol() {
    const url = parseRequestUrl();
    return url?.protocol || "";
}

/**
 * Get the hostname from the request URL.
 *
 * @returns {string}
 */
export function getRequestHostname() {
    const url = parseRequestUrl();
    return url?.hostname || "";
}

/**
 * Get the pathname from the request URL.
 *
 * @returns {string}
 */
export function getRequestPathname() {
    const url = parseRequestUrl();
    return url?.pathname || "";
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate a supplied URL.
 *
 * @param {string} [url]
 * @returns {{ valid: boolean, error: string, url: URL|null }}
 */
export function validateRequestUrl(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return {
            valid: false,
            error: "Request URL is required.",
            url: null,
        };
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(value);
    } catch {
        return {
            valid: false,
            error: "Please enter a valid URL.",
            url: null,
        };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return {
            valid: false,
            error: "Only HTTP and HTTPS URLs are supported.",
            url: parsedUrl,
        };
    }

    return {
        valid: true,
        error: "",
        url: parsedUrl,
    };
}

/**
 * Check whether a URL is valid for an HTTP request.
 *
 * @param {string} [url]
 * @returns {boolean}
 */
export function isValidRequestUrl(url = getRequestUrl()) {
    return validateRequestUrl(url).valid;
}

// ============================================================
// URL Utilities
// ============================================================

/**
 * Resolve a URL against an optional base URL.
 *
 * Useful for relative URLs when the application later supports
 * environments or configurable API base URLs.
 *
 * @param {string} url
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function resolveRequestUrl(url = "", baseUrl = "") {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        return new URL(value, baseUrl || undefined).href;
    } catch {
        return value;
    }
}

/**
 * Get a URL with its hash removed.
 *
 * HTTP clients generally do not send URL fragments to the server.
 *
 * @param {string} [url]
 * @returns {string}
 */
export function removeUrlHash(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        const parsedUrl = new URL(value);
        parsedUrl.hash = "";
        return parsedUrl.href;
    } catch {
        return value;
    }
}

/**
 * Get the current URL without its query string.
 *
 * Query parameters are managed separately by query-params.js.
 *
 * @param {string} [url]
 * @returns {string}
 */
export function getUrlWithoutQuery(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        const parsedUrl = new URL(value);
        parsedUrl.search = "";
        return parsedUrl.href;
    } catch {
        return value;
    }
}

/**
 * Get the current URL query string.
 *
 * @param {string} [url]
 * @returns {string}
 */
export function getUrlQueryString(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        return new URL(value).search;
    } catch {
        return "";
    }
}

// ============================================================
// Event Helpers
// ============================================================

/**
 * Focus the request URL input.
 */
export function focusRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    elements.url?.focus();
}

/**
 * Select the complete request URL.
 */
export function selectRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    if (!elements.url) {
        return;
    }

    elements.url.focus();
    elements.url.select();
}

// ============================================================
// Default Export
// ============================================================

export default {
    initUrlHandler,
    getRequestUrl,
    setRequestUrl,
    clearRequestUrl,
    hasRequestUrl,
    normalizeRequestUrl,
    parseRequestUrl,
    getRequestProtocol,
    getRequestHostname,
    getRequestPathname,
    validateRequestUrl,
    isValidRequestUrl,
    resolveRequestUrl,
    removeUrlHash,
    getUrlWithoutQuery,
    getUrlQueryString,
    focusRequestUrl,
    selectRequestUrl,
};