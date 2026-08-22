//src/scripts/api/response.js

/**
 * Response utilities.
 *
 * This module is responsible for:
 * - Normalizing fetch responses
 * - Parsing response data
 * - Calculating response size
 * - Extracting response headers
 * - Creating a consistent response object
 * - Updating the application state
 */

import state from "../core/state.js";

/**
 * Convert Headers into a plain array.
 *
 * @param {Headers} headers
 * @returns {Array<{key: string, value: string}>}
 */
export function normalizeHeaders(headers) {
    if (!headers) {
        return [];
    }

    const normalized = [];

    headers.forEach((value, key) => {
        normalized.push({
            key,
            value,
        });
    });

    return normalized;
}

/**
 * Calculate the approximate size of a response.
 *
 * Uses UTF-8 byte length when TextEncoder is available.
 *
 * @param {string} text
 * @returns {number}
 */
export function calculateResponseSize(text = "") {
    if (!text) {
        return 0;
    }

    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(text).length;
    }

    return text.length;
}

/**
 * Format a response size into a readable value.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatResponseSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
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
 * Try to parse response text as JSON.
 *
 * @param {string} text
 * @returns {any}
 */
export function parseResponseData(text) {
    if (!text || typeof text !== "string") {
        return text;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Check whether a response contains JSON.
 *
 * @param {Response} response
 * @returns {boolean}
 */
export function isJsonResponse(response) {
    if (!response) {
        return false;
    }

    const contentType = response.headers.get("content-type") || "";

    return (
        contentType.includes("application/json") ||
        contentType.includes("+json")
    );
}

/**
 * Create a normalized response object from a fetch Response.
 *
 * @param {Response} response
 * @param {string} raw
 * @param {number} duration
 * @returns {Object}
 */
export function normalizeResponse(response, raw = "", duration = 0) {
    const size = calculateResponseSize(raw);
    const data = parseResponseData(raw);

    return {
        status: response.status,
        statusText: response.statusText || "",
        duration,
        size,
        sizeFormatted: formatResponseSize(size),
        data,
        raw,
        headers: normalizeHeaders(response.headers),
        ok: response.ok,
        url: response.url || "",
        contentType: response.headers.get("content-type") || "",
    };
}

/**
 * Update the response section of application state.
 *
 * @param {Object} responseData
 */
export function setResponse(responseData) {
    state.response = {
        status: responseData.status ?? null,
        statusText: responseData.statusText ?? "",
        duration: responseData.duration ?? null,
        size: responseData.size ?? null,
        data: responseData.data ?? null,
        raw: responseData.raw ?? "",
        headers: responseData.headers ?? [],
    };
}

/**
 * Clear the current response.
 */
export function clearResponse() {
    state.response = {
        status: null,
        statusText: "",
        duration: null,
        size: null,
        data: null,
        raw: "",
        headers: [],
    };
}

/**
 * Set the application loading state.
 *
 * @param {boolean} loading
 */
export function setResponseLoading(loading) {
    state.ui.isLoading = Boolean(loading);
}

/**
 * Create a successful response result.
 *
 * This is useful for request.js when it receives
 * a successful fetch response.
 *
 * @param {Response} response
 * @param {string} raw
 * @param {number} duration
 * @returns {Object}
 */
export function createResponseResult(response, raw, duration) {
    const normalized = normalizeResponse(
        response,
        raw,
        duration
    );

    setResponse(normalized);

    return normalized;
}

/**
 * Create a normalized error response.
 *
 * Network errors do not always provide a Response object,
 * so they are handled separately.
 *
 * @param {Error|string} error
 * @param {number} duration
 * @returns {Object}
 */
export function createErrorResponse(error, duration = 0) {
    const message =
        error instanceof Error
            ? error.message
            : String(error || "Request failed.");

    const errorData = {
        error: message,
    };

    const raw = JSON.stringify(errorData, null, 2);

    const responseData = {
        status: 0,
        statusText: "Network Error",
        duration,
        size: calculateResponseSize(raw),
        data: errorData,
        raw,
        headers: [],
        ok: false,
        url: "",
        contentType: "application/json",
    };

    setResponse(responseData);

    return responseData;
}

/**
 * Get the current response.
 *
 * @returns {Object}
 */
export function getResponse() {
    return state.response;
}

/**
 * Get a human-readable status label.
 *
 * @param {number|null} status
 * @param {string} statusText
 * @returns {string}
 */
export function getStatusLabel(status, statusText = "") {
    if (!status) {
        return statusText || "Error";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

/**
 * Determine a simple response status category.
 *
 * @param {number|null} status
 * @returns {"success"|"redirect"|"client-error"|"server-error"|"error"|"unknown"}
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