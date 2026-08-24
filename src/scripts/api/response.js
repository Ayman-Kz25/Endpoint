/**
 * Response utilities.
 *
 * Responsible for:
 * - parsing response data
 * - calculating response size
 * - extracting response headers
 * - normalizing Fetch responses
 * - creating consistent response objects
 *
 * This module does not:
 * - manipulate the DOM
 * - update application state
 * - show notifications
 * - emit application events
 */

// ============================================================
// Headers
// ============================================================

/**
 * Convert Headers into a predictable array.
 *
 * @param {Headers|Object|null} headers
 * @returns {Array<{name: string, value: string}>}
 */
export function normalizeHeaders(headers) {
    if (!headers) {
        return [];
    }

    if (headers instanceof Headers) {
        return Array.from(headers.entries()).map(
            ([name, value]) => ({
                name,
                value,
            }),
        );
    }

    if (
        typeof headers === "object" &&
        !Array.isArray(headers)
    ) {
        return Object.entries(headers).map(
            ([name, value]) => ({
                name: String(name),
                value: String(value ?? ""),
            }),
        );
    }

    return [];
}

// ============================================================
// Response Size
// ============================================================

/**
 * Calculate response size in bytes.
 *
 * Uses UTF-8 byte length when TextEncoder is available.
 *
 * @param {string} text
 * @returns {number}
 */
export function calculateResponseSize(text = "") {
    const value = String(text ?? "");

    if (!value) {
        return 0;
    }

    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value).length;
    }

    return value.length;
}

/**
 * Format response size for display.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatResponseSize(bytes) {
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

// ============================================================
// Response Parsing
// ============================================================

/**
 * Try to parse response text as JSON.
 *
 * Invalid JSON is returned unchanged.
 *
 * @param {string} text
 * @returns {*}
 */
export function parseResponseData(text) {
    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        return text;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Determine whether a response contains JSON.
 *
 * Supports:
 * - application/json
 * - application/*+json
 *
 * @param {Response|null} response
 * @returns {boolean}
 */
export function isJsonResponse(response) {
    if (!response?.headers) {
        return false;
    }

    const contentType =
        response.headers.get("content-type") || "";

    return (
        contentType.includes("application/json") ||
        contentType.includes("+json")
    );
}

// ============================================================
// Response Normalization
// ============================================================

/**
 * Create a normalized response object.
 *
 * @param {Response} response
 * @param {string} raw
 * @param {number} duration
 * @returns {Object}
 */
export function normalizeResponse(
    response,
    raw = "",
    duration = 0,
) {
    if (!(response instanceof Response)) {
        throw new TypeError(
            "A valid Fetch Response is required.",
        );
    }

    const size = calculateResponseSize(raw);

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || "",

        duration: Number.isFinite(duration)
            ? duration
            : 0,

        size,
        sizeFormatted: formatResponseSize(size),

        data: parseResponseData(raw),
        raw,

        headers: normalizeHeaders(response.headers),

        url: response.url || "",
        redirected: response.redirected,

        contentType:
            response.headers.get("content-type") || "",
    };
}

/**
 * Create a normalized error response.
 *
 * This is useful when a request fails before a Fetch
 * Response object exists.
 *
 * @param {Error|string|unknown} error
 * @param {number} duration
 * @returns {Object}
 */
export function createErrorResponse(
    error,
    duration = 0,
) {
    const message =
        error instanceof Error
            ? error.message
            : String(
                error || "Request failed.",
            );

    const errorData = {
        error: message,
    };

    const raw = JSON.stringify(
        errorData,
        null,
        2,
    );

    const size = calculateResponseSize(raw);

    return {
        ok: false,

        status: 0,
        statusText: "Network Error",

        duration: Number.isFinite(duration)
            ? duration
            : 0,

        size,
        sizeFormatted: formatResponseSize(size),

        data: errorData,
        raw,

        headers: [],

        url: "",
        redirected: false,

        contentType: "application/json",

        error: message,
    };
}

// ============================================================
// Status Helpers
// ============================================================

/**
 * Get a readable status label.
 *
 * @param {number|null} status
 * @param {string} statusText
 * @returns {string}
 */
export function getStatusLabel(
    status,
    statusText = "",
) {
    if (
        !Number.isFinite(status) ||
        status <= 0
    ) {
        return statusText || "Error";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

/**
 * Determine the response status category.
 *
 * @param {number|null} status
 * @returns {
 *   "success" |
 *   "redirect" |
 *   "client-error" |
 *   "server-error" |
 *   "error" |
 *   "unknown"
 * }
 */
export function getStatusCategory(status) {
    if (!Number.isFinite(status)) {
        return "unknown";
    }

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

    return "error";
}

/**
 * Check whether a status is successful.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return status >= 200 && status < 300;
}

/**
 * Check whether a status is a client error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isClientError(status) {
    return status >= 400 && status < 500;
}

/**
 * Check whether a status is a server error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isServerError(status) {
    return status >= 500 && status < 600;
}

export default {
    normalizeHeaders,
    calculateResponseSize,
    formatResponseSize,
    parseResponseData,
    isJsonResponse,
    normalizeResponse,
    createErrorResponse,
    getStatusLabel,
    getStatusCategory,
    isSuccessStatus,
    isClientError,
    isServerError,
};