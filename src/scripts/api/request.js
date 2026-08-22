//src/scripts/api/request.js

/**
 * HTTP Request Service
 *
 * Responsible for executing HTTP requests through the Fetch API.
 *
 * This module does not:
 * - manipulate the DOM
 * - render responses
 * - update application state
 * - show toast notifications
 *
 * It only handles HTTP request execution and response normalization.
 */

import { UI } from "../core/constants.js";

// ============================================================
// Helpers
// ============================================================

/**
 * Create an AbortController with a timeout.
 *
 * @param {number} timeout
 * @returns {{ controller: AbortController, timeoutId: number }}
 */
function createTimeoutController(timeout = UI.REQUEST_TIMEOUT) {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
        controller.abort("Request timeout");
    }, timeout);

    return {
        controller,
        timeoutId,
    };
}

/**
 * Safely parse response content.
 *
 * JSON responses are parsed into objects.
 * Everything else is returned as text.
 *
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function parseResponseBody(response) {
    const contentType = response.headers.get("content-type") || "";

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    if (contentType.includes("application/json")) {
        try {
            return JSON.parse(text);
        } catch {
            // Some APIs return JSON with an incorrect content-type.
            // Return the original text instead of failing.
            return text;
        }
    }

    return text;
}

/**
 * Convert Headers into a plain array.
 *
 * @param {Headers} headers
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeHeaders(headers) {
    return Array.from(headers.entries()).map(([name, value]) => ({
        name,
        value,
    }));
}

/**
 * Calculate the approximate response size.
 *
 * @param {string} raw
 * @returns {number}
 */
function calculateResponseSize(raw) {
    if (!raw) {
        return 0;
    }

    return new Blob([raw]).size;
}

/**
 * Convert unknown errors into a consistent application error.
 *
 * @param {unknown} error
 * @param {AbortSignal} signal
 * @returns {Error}
 */
function normalizeRequestError(error, signal) {
    if (signal?.aborted) {
        const timeoutError = new Error("The request timed out.");

        timeoutError.code = "REQUEST_TIMEOUT";

        return timeoutError;
    }

    if (error instanceof TypeError) {
        const networkError = new Error(
            "A network error occurred. Check the URL and your connection.",
        );

        networkError.code = "NETWORK_ERROR";
        networkError.cause = error;

        return networkError;
    }

    if (error instanceof Error) {
        return error;
    }

    const unknownError = new Error("The request could not be completed.");

    unknownError.code = "REQUEST_ERROR";
    unknownError.cause = error;

    return unknownError;
}

// ============================================================
// Request Builder
// ============================================================

/**
 * Build a Fetch request configuration.
 *
 * @param {Object} options
 * @param {string} options.method
 * @param {Array} [options.headers]
 * @param {unknown} [options.body]
 * @param {string} [options.auth]
 * @returns {RequestInit}
 */
function buildRequestConfig({
    method = "GET",
    headers = [],
    body = "",
    auth = null,
}) {
    const requestHeaders = new Headers();

    // --------------------------------------------------------
    // Headers
    // --------------------------------------------------------

    if (Array.isArray(headers)) {
        headers.forEach((header) => {
            if (!header) {
                return;
            }

            const name = String(header.name ?? "").trim();
            const value = String(header.value ?? "");

            if (!name) {
                return;
            }

            requestHeaders.set(name, value);
        });
    } else if (headers && typeof headers === "object") {
        Object.entries(headers).forEach(([name, value]) => {
            if (!name.trim()) {
                return;
            }

            requestHeaders.set(name, String(value ?? ""));
        });
    }

    // --------------------------------------------------------
    // Authentication
    // --------------------------------------------------------

    if (auth?.type === "bearer") {
        const token = auth.fields?.token?.trim();

        if (token) {
            requestHeaders.set("Authorization", `Bearer ${token}`);
        }
    }

    if (auth?.type === "basic") {
        const username = auth.fields?.username ?? "";
        const password = auth.fields?.password ?? "";

        if (username || password) {
            const encoded = btoa(`${username}:${password}`);

            requestHeaders.set("Authorization", `Basic ${encoded}`);
        }
    }

    if (auth?.type === "api-key") {
        const key = auth.fields?.key?.trim();
        const value = auth.fields?.value ?? "";
        const location = auth.fields?.location || "header";

        if (key && value && location === "header") {
            requestHeaders.set(key, value);
        }
    }

    // --------------------------------------------------------
    // Body
    // --------------------------------------------------------

    const hasBody =
        body !== undefined &&
        body !== null &&
        String(body).trim() !== "";

    const requestConfig = {
        method: method.toUpperCase(),
        headers: requestHeaders,
    };

    if (hasBody && !["GET", "HEAD"].includes(method.toUpperCase())) {
        requestConfig.body =
            typeof body === "string" ? body : JSON.stringify(body);

        if (
            typeof body === "object" &&
            !requestHeaders.has("Content-Type")
        ) {
            requestHeaders.set("Content-Type", "application/json");
        }
    }

    return requestConfig;
}

// ============================================================
// Main Request Function
// ============================================================

/**
 * Execute an HTTP request.
 *
 * @param {Object} options
 * @param {string} options.url
 * @param {string} [options.method="GET"]
 * @param {Array|Object} [options.headers=[]]
 * @param {unknown} [options.body=""]
 * @param {Object|null} [options.auth=null]
 * @param {number} [options.timeout]
 *
 * @returns {Promise<Object>}
 */
export async function sendRequest({
    url,
    method = "GET",
    headers = [],
    body = "",
    auth = null,
    timeout = UI.REQUEST_TIMEOUT,
}) {
    if (!url || typeof url !== "string") {
        const error = new Error("Please enter a valid URL.");

        error.code = "INVALID_URL";

        throw error;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(url);
    } catch {
        const error = new Error("Please enter a valid URL.");

        error.code = "INVALID_URL";

        throw error;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        const error = new Error("Only HTTP and HTTPS URLs are supported.");

        error.code = "INVALID_PROTOCOL";

        throw error;
    }

    const requestConfig = buildRequestConfig({
        method,
        headers,
        body,
        auth,
    });

    const { controller, timeoutId } = createTimeoutController(timeout);

    const startedAt = performance.now();

    try {
        const response = await fetch(parsedUrl.href, {
            ...requestConfig,
            signal: controller.signal,
        });

        const duration = Math.round(performance.now() - startedAt);

        const raw = await response.text();

        const contentType =
            response.headers.get("content-type") || "";

        let data = raw;

        if (
            contentType.includes("application/json") &&
            raw.trim()
        ) {
            try {
                data = JSON.parse(raw);
            } catch {
                data = raw;
            }
        }

        return {
            ok: response.ok,

            status: response.status,

            statusText: response.statusText,

            duration,

            size: calculateResponseSize(raw),

            data,

            raw,

            headers: normalizeHeaders(response.headers),

            contentType,

            url: response.url,

            redirected: response.redirected,
        };
    } catch (error) {
        throw normalizeRequestError(
            error,
            controller.signal,
        );
    } finally {
        window.clearTimeout(timeoutId);
    }
}

// ============================================================
// Request Helpers
// ============================================================

/**
 * Abort an active request.
 *
 * This is kept as a helper for future request cancellation.
 *
 * @param {AbortController} controller
 */
export function abortRequest(controller) {
    if (!(controller instanceof AbortController)) {
        return;
    }

    controller.abort();
}

/**
 * Check whether a response represents a successful HTTP status.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return status >= 200 && status < 300;
}

/**
 * Check whether a response represents a client error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isClientError(status) {
    return status >= 400 && status < 500;
}

/**
 * Check whether a response represents a server error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isServerError(status) {
    return status >= 500 && status < 600;
}

/**
 * Get a readable status label.
 *
 * @param {number} status
 * @param {string} statusText
 * @returns {string}
 */
export function getStatusLabel(status, statusText = "") {
    if (!status) {
        return "";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

/**
 * Format response size for the UI.
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