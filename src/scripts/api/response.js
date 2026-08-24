// src/scripts/api/response.js

/**
 * Response Utilities
 *
 * Responsible for:
 * - Normalizing Fetch responses
 * - Parsing response data
 * - Calculating response size
 * - Extracting response headers
 * - Formatting response metadata
 * - Creating consistent response objects
 *
 * This module does not:
 * - manipulate the DOM
 * - update application state
 * - render response UI
 * - show notifications
 * - execute HTTP requests
 *
 * State updates should be handled by the appropriate
 * core/state or feature/controller module.
 */

// ============================================================
// Constants
// ============================================================

const EMPTY_RESPONSE = Object.freeze({
    status: null,
    statusText: "",
    duration: null,
    size: null,
    sizeFormatted: "0 B",
    data: null,
    raw: "",
    headers: [],
    ok: false,
    url: "",
    contentType: "",
});

const JSON_CONTENT_TYPES = [
    "application/json",
    "+json",
];

// ============================================================
// Header Utilities
// ============================================================

/**
 * Convert a Headers instance into a predictable array.
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
        return Object.entries(headers)
            .map(([name, value]) => ({
                name: String(name),
                value: String(value ?? ""),
            }))
            .filter(
                ({ name }) => name.trim().length > 0,
            );
    }

    if (Array.isArray(headers)) {
        return headers
            .filter(Boolean)
            .map((header) => ({
                name: String(
                    header.name ??
                    header.key ??
                    "",
                ).trim(),

                value: String(
                    header.value ?? "",
                ),
            }))
            .filter(
                ({ name }) => name.length > 0,
            );
    }

    return [];
}

// ============================================================
// Response Size
// ============================================================

/**
 * Calculate the UTF-8 byte size of response text.
 *
 * @param {string} text
 * @returns {number}
 */
export function calculateResponseSize(text = "") {
    const normalizedText = String(text ?? "");

    if (!normalizedText) {
        return 0;
    }

    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder()
            .encode(normalizedText)
            .length;
    }

    return normalizedText.length;
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
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}

// ============================================================
// Response Parsing
// ============================================================

/**
 * Check whether a content type represents JSON.
 *
 * Supports:
 * - application/json
 * - application/*+json
 *
 * @param {string} contentType
 * @returns {boolean}
 */
export function isJsonContentType(
    contentType = "",
) {
    const normalizedType = String(
        contentType,
    )
        .toLowerCase()
        .split(";")[0]
        .trim();

    return JSON_CONTENT_TYPES.some(
        (type) =>
            normalizedType === type ||
            normalizedType.endsWith(type),
    );
}

/**
 * Check whether a Fetch Response contains JSON.
 *
 * @param {Response|null} response
 * @returns {boolean}
 */
export function isJsonResponse(response) {
    if (!response?.headers) {
        return false;
    }

    return isJsonContentType(
        response.headers.get(
            "content-type",
        ) || "",
    );
}

/**
 * Try to parse response text as JSON.
 *
 * If parsing fails, the original text is returned.
 *
 * @param {string} text
 * @returns {unknown}
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
 * Parse response text according to its content type.
 *
 * JSON content is parsed when possible.
 * Non-JSON content remains text.
 *
 * @param {string} text
 * @param {string} contentType
 * @returns {unknown}
 */
export function parseResponseBody(
    text = "",
    contentType = "",
) {
    if (!text) {
        return null;
    }

    if (isJsonContentType(contentType)) {
        return parseResponseData(text);
    }

    return text;
}

// ============================================================
// Response Metadata
// ============================================================

/**
 * Get the response Content-Type.
 *
 * @param {Response|null} response
 * @returns {string}
 */
export function getContentType(response) {
    if (!response?.headers) {
        return "";
    }

    return (
        response.headers.get(
            "content-type",
        ) || ""
    );
}

/**
 * Get a human-readable response status label.
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
 *   "success"|
 *   "redirect"|
 *   "client-error"|
 *   "server-error"|
 *   "error"|
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
 * Check whether a status represents a successful response.
 *
 * @param {number|null} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return (
        Number.isFinite(status) &&
        status >= 200 &&
        status < 300
    );
}

/**
 * Check whether a status represents a client error.
 *
 * @param {number|null} status
 * @returns {boolean}
 */
export function isClientError(status) {
    return (
        Number.isFinite(status) &&
        status >= 400 &&
        status < 500
    );
}

/**
 * Check whether a status represents a server error.
 *
 * @param {number|null} status
 * @returns {boolean}
 */
export function isServerError(status) {
    return (
        Number.isFinite(status) &&
        status >= 500 &&
        status < 600
    );
}

// ============================================================
// Response Normalization
// ============================================================

/**
 * Create a normalized response object from a Fetch Response.
 *
 * The response body should already have been read into `raw`.
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
    if (!response) {
        return createErrorResponse(
            "No response received.",
            duration,
        );
    }

    const contentType =
        getContentType(response);

    const normalizedRaw = String(
        raw ?? "",
    );

    const size =
        calculateResponseSize(
            normalizedRaw,
        );

    const data = parseResponseBody(
        normalizedRaw,
        contentType,
    );

    return {
        status: response.status,

        statusText:
            response.statusText || "",

        duration: Number.isFinite(duration)
            ? duration
            : 0,

        size,

        sizeFormatted:
            formatResponseSize(size),

        data,

        raw: normalizedRaw,

        headers: normalizeHeaders(
            response.headers,
        ),

        ok: Boolean(response.ok),

        url: response.url || "",

        contentType,

        redirected: Boolean(
            response.redirected,
        ),
    };
}

// ============================================================
// Error Responses
// ============================================================

/**
 * Create a normalized error response.
 *
 * This is useful for network failures where no
 * Fetch Response object exists.
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
                  error ||
                      "Request failed.",
              );

    const errorData = {
        error: message,
    };

    const raw = JSON.stringify(
        errorData,
        null,
        2,
    );

    const size =
        calculateResponseSize(raw);

    return {
        status: 0,

        statusText: "Network Error",

        duration: Number.isFinite(duration)
            ? duration
            : 0,

        size,

        sizeFormatted:
            formatResponseSize(size),

        data: errorData,

        raw,

        headers: [],

        ok: false,

        url: "",

        contentType:
            "application/json",

        redirected: false,

        error: message,
    };
}

// ============================================================
// Response Factory
// ============================================================

/**
 * Create a normalized response result.
 *
 * This function does not modify application state.
 *
 * @param {Response} response
 * @param {string} raw
 * @param {number} duration
 * @returns {Object}
 */
export function createResponseResult(
    response,
    raw = "",
    duration = 0,
) {
    return normalizeResponse(
        response,
        raw,
        duration,
    );
}

/**
 * Create the default empty response state.
 *
 * Returns a fresh object so callers can safely modify it.
 *
 * @returns {Object}
 */
export function createEmptyResponse() {
    return {
        ...EMPTY_RESPONSE,
        headers: [],
    };
}

/**
 * Check whether a normalized response contains
 * usable response data.
 *
 * @param {Object|null} response
 * @returns {boolean}
 */
export function hasResponseData(response) {
    if (!response) {
        return false;
    }

    return Boolean(
        response.raw ||
            response.data !== null,
    );
}

// ============================================================
// Default Export
// ============================================================

export default {
    normalizeHeaders,
    calculateResponseSize,
    formatResponseSize,
    isJsonContentType,
    isJsonResponse,
    parseResponseData,
    parseResponseBody,
    getContentType,
    getStatusLabel,
    getStatusCategory,
    isSuccessStatus,
    isClientError,
    isServerError,
    normalizeResponse,
    createErrorResponse,
    createResponseResult,
    createEmptyResponse,
    hasResponseData,
};