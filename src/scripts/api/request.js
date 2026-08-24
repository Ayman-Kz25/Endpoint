// src/scripts/api/request.js

/**
 * HTTP Request Service
 *
 * Responsible for executing HTTP requests through the Fetch API
 * and normalizing the resulting response.
 *
 * This module does not:
 * - manipulate the DOM
 * - render responses
 * - update application state
 * - show notifications
 *
 * It only handles HTTP request execution and response normalization.
 */

import { UI } from "../core/constants.js";

// ============================================================
// Constants
// ============================================================

const BODYLESS_METHODS = new Set([
    "GET",
    "HEAD",
]);

// ============================================================
// Timeout
// ============================================================

/**
 * Create an AbortController with a timeout.
 *
 * @param {number} timeout
 * @returns {{
 *   controller: AbortController,
 *   timeoutId: number
 * }}
 */
function createTimeoutController(timeout = UI.REQUEST_TIMEOUT) {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, timeout);

    return {
        controller,
        timeoutId,
    };
}

// ============================================================
// URL Validation
// ============================================================

/**
 * Validate and normalize a request URL.
 *
 * @param {unknown} url
 * @returns {string}
 * @throws {Error}
 */
function validateRequestUrl(url) {
    if (typeof url !== "string" || !url.trim()) {
        const error = new Error("Please enter a valid URL.");
        error.code = "INVALID_URL";
        throw error;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(url.trim());
    } catch {
        const error = new Error("Please enter a valid URL.");
        error.code = "INVALID_URL";
        throw error;
    }

    if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
    ) {
        const error = new Error(
            "Only HTTP and HTTPS URLs are supported.",
        );

        error.code = "INVALID_PROTOCOL";

        throw error;
    }

    return parsedUrl.href;
}

// ============================================================
// Header Normalization
// ============================================================

/**
 * Add headers to a Headers instance.
 *
 * Supports both:
 *
 * [
 *   { name: "Content-Type", value: "application/json" }
 * ]
 *
 * and:
 *
 * {
 *   "Content-Type": "application/json"
 * }
 *
 * @param {Headers} target
 * @param {Array|Object} headers
 * @returns {Headers}
 */
function appendHeaders(target, headers = []) {
    if (Array.isArray(headers)) {
        headers.forEach((header) => {
            if (!header) {
                return;
            }

            const name = String(
                header.name ?? "",
            ).trim();

            if (!name) {
                return;
            }

            const value = String(
                header.value ?? "",
            );

            target.set(name, value);
        });

        return target;
    }

    if (headers && typeof headers === "object") {
        Object.entries(headers).forEach(
            ([name, value]) => {
                const normalizedName = String(
                    name,
                ).trim();

                if (!normalizedName) {
                    return;
                }

                target.set(
                    normalizedName,
                    String(value ?? ""),
                );
            },
        );
    }

    return target;
}

/**
 * Convert Headers into a plain array.
 *
 * @param {Headers} headers
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeHeaders(headers) {
    return Array.from(
        headers.entries(),
    ).map(([name, value]) => ({
        name,
        value,
    }));
}

// ============================================================
// Authentication
// ============================================================

/**
 * Apply authentication configuration to request headers.
 *
 * @param {Headers} headers
 * @param {Object|null} auth
 * @returns {Headers}
 */
function applyAuthentication(headers, auth) {
    if (!auth || typeof auth !== "object") {
        return headers;
    }

    // --------------------------------------------------------
    // Bearer Token
    // --------------------------------------------------------

    if (auth.type === "bearer") {
        const token = String(
            auth.fields?.token ?? "",
        ).trim();

        if (token) {
            headers.set(
                "Authorization",
                `Bearer ${token}`,
            );
        }

        return headers;
    }

    // --------------------------------------------------------
    // Basic Authentication
    // --------------------------------------------------------

    if (auth.type === "basic") {
        const username = String(
            auth.fields?.username ?? "",
        );

        const password = String(
            auth.fields?.password ?? "",
        );

        if (username || password) {
            const encoded = btoa(
                `${username}:${password}`,
            );

            headers.set(
                "Authorization",
                `Basic ${encoded}`,
            );
        }

        return headers;
    }

    // --------------------------------------------------------
    // API Key
    // --------------------------------------------------------

    if (auth.type === "api-key") {
        const key = String(
            auth.fields?.key ?? "",
        ).trim();

        const value = String(
            auth.fields?.value ?? "",
        );

        const location =
            auth.fields?.location || "header";

        if (
            key &&
            value &&
            location === "header"
        ) {
            headers.set(key, value);
        }
    }

    return headers;
}

// ============================================================
// Body
// ============================================================

/**
 * Check whether a request contains a body.
 *
 * @param {unknown} body
 * @returns {boolean}
 */
function hasRequestBody(body) {
    if (
        body === undefined ||
        body === null
    ) {
        return false;
    }

    return String(body).trim() !== "";
}

/**
 * Prepare a request body for Fetch.
 *
 * @param {unknown} body
 * @returns {string}
 */
function serializeRequestBody(body) {
    if (typeof body === "string") {
        return body;
    }

    return JSON.stringify(body);
}

// ============================================================
// Request Builder
// ============================================================

/**
 * Build a Fetch RequestInit object.
 *
 * @param {Object} options
 * @param {string} [options.method="GET"]
 * @param {Array|Object} [options.headers=[]]
 * @param {unknown} [options.body=""]
 * @param {Object|null} [options.auth=null]
 * @returns {RequestInit}
 */
function buildRequestConfig({
    method = "GET",
    headers = [],
    body = "",
    auth = null,
}) {
    const normalizedMethod =
        String(method)
            .trim()
            .toUpperCase() || "GET";

    const requestHeaders =
        appendHeaders(
            new Headers(),
            headers,
        );

    applyAuthentication(
        requestHeaders,
        auth,
    );

    const requestConfig = {
        method: normalizedMethod,
        headers: requestHeaders,
    };

    const hasBody =
        hasRequestBody(body);

    if (
        !hasBody ||
        BODYLESS_METHODS.has(
            normalizedMethod,
        )
    ) {
        return requestConfig;
    }

    requestConfig.body =
        serializeRequestBody(body);

    if (
        typeof body === "object" &&
        !requestHeaders.has(
            "Content-Type",
        )
    ) {
        requestHeaders.set(
            "Content-Type",
            "application/json",
        );
    }

    return requestConfig;
}

// ============================================================
// Response Parsing
// ============================================================

/**
 * Parse a Fetch response body.
 *
 * The raw response text is always read first so the caller
 * can display the original response when needed.
 *
 * @param {Response} response
 * @returns {Promise<{
 *   data: unknown,
 *   raw: string,
 *   contentType: string
 * }>}
 */
async function parseResponseBody(response) {
    const contentType =
        response.headers.get(
            "content-type",
        ) || "";

    const raw = await response.text();

    if (
        response.status === 204 ||
        response.status === 205 ||
        !raw
    ) {
        return {
            data: null,
            raw,
            contentType,
        };
    }

    if (
        contentType
            .toLowerCase()
            .includes("application/json")
    ) {
        try {
            return {
                data: JSON.parse(raw),
                raw,
                contentType,
            };
        } catch {
            return {
                data: raw,
                raw,
                contentType,
            };
        }
    }

    return {
        data: raw,
        raw,
        contentType,
    };
}

// ============================================================
// Response Utilities
// ============================================================

/**
 * Calculate the response size in bytes.
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
 * Convert an unknown request error into an application error.
 *
 * @param {unknown} error
 * @param {AbortSignal} signal
 * @returns {Error}
 */
function normalizeRequestError(
    error,
    signal,
) {
    if (signal?.aborted) {
        const timeoutError = new Error(
            "The request timed out.",
        );

        timeoutError.code =
            "REQUEST_TIMEOUT";

        return timeoutError;
    }

    if (error instanceof TypeError) {
        const networkError = new Error(
            "A network error occurred. Check the URL and your connection.",
        );

        networkError.code =
            "NETWORK_ERROR";

        networkError.cause = error;

        return networkError;
    }

    if (error instanceof Error) {
        return error;
    }

    const unknownError = new Error(
        "The request could not be completed.",
    );

    unknownError.code =
        "REQUEST_ERROR";

    unknownError.cause = error;

    return unknownError;
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
    const requestUrl =
        validateRequestUrl(url);

    const requestConfig =
        buildRequestConfig({
            method,
            headers,
            body,
            auth,
        });

    const {
        controller,
        timeoutId,
    } = createTimeoutController(
        timeout,
    );

    const startedAt =
        performance.now();

    try {
        const response =
            await fetch(
                requestUrl,
                {
                    ...requestConfig,
                    signal:
                        controller.signal,
                },
            );

        const duration = Math.round(
            performance.now() -
                startedAt,
        );

        const parsed =
            await parseResponseBody(
                response,
            );

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            duration,
            size: calculateResponseSize(
                parsed.raw,
            ),
            data: parsed.data,
            raw: parsed.raw,
            headers: normalizeHeaders(
                response.headers,
            ),
            contentType:
                parsed.contentType,
            url: response.url,
            redirected:
                response.redirected,
        };
    } catch (error) {
        throw normalizeRequestError(
            error,
            controller.signal,
        );
    } finally {
        window.clearTimeout(
            timeoutId,
        );
    }
}

// ============================================================
// Request Helpers
// ============================================================

/**
 * Abort an active request.
 *
 * @param {AbortController} controller
 */
export function abortRequest(
    controller,
) {
    if (
        !(controller instanceof AbortController)
    ) {
        return;
    }

    controller.abort();
}

/**
 * Check whether a response represents a
 * successful HTTP status.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return (
        status >= 200 &&
        status < 300
    );
}

/**
 * Check whether a response represents a
 * client error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isClientError(status) {
    return (
        status >= 400 &&
        status < 500
    );
}

/**
 * Check whether a response represents a
 * server error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isServerError(status) {
    return (
        status >= 500 &&
        status < 600
    );
}

/**
 * Get a readable HTTP status label.
 *
 * @param {number} status
 * @param {string} statusText
 * @returns {string}
 */
export function getStatusLabel(
    status,
    statusText = "",
) {
    if (!status) {
        return "";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

/**
 * Format a response size for display.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatResponseSize(
    bytes,
) {
    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {
        return "0 B";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (
        bytes <
        1024 * 1024
    ) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}