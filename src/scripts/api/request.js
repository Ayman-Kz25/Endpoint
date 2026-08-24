/**
 * HTTP Request Service.
 *
 * Responsible for:
 * - validating request URLs
 * - building Fetch request configuration
 * - applying authentication
 * - executing HTTP requests
 * - normalizing the resulting response
 *
 * This module does not:
 * - manipulate the DOM
 * - update application state
 * - render responses
 * - show notifications
 * - emit application events
 */

import {
    UI,
    HTTP_METHODS_WITHOUT_BODY,
    ERROR_MESSAGES,
} from "../core/constants.js";

import {
    normalizeResponse,
} from "./response.js";

// ============================================================
// URL Validation
// ============================================================

function validateRequestUrl(url) {
    if (
        typeof url !== "string" ||
        !url.trim()
    ) {
        const error = new Error(
            ERROR_MESSAGES.INVALID_URL,
        );

        error.code = "INVALID_URL";

        throw error;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(url.trim());
    } catch {
        const error = new Error(
            ERROR_MESSAGES.INVALID_URL,
        );

        error.code = "INVALID_URL";

        throw error;
    }

    if (
        !["http:", "https:"].includes(
            parsedUrl.protocol,
        )
    ) {
        const error = new Error(
            ERROR_MESSAGES.INVALID_PROTOCOL,
        );

        error.code = "INVALID_PROTOCOL";

        throw error;
    }

    return parsedUrl;
}

// ============================================================
// Headers
// ============================================================

function appendHeaders(target, headers) {
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

            target.set(
                name,
                String(header.value ?? ""),
            );
        });

        return;
    }

    if (
        headers &&
        typeof headers === "object"
    ) {
        Object.entries(headers).forEach(
            ([name, value]) => {
                const normalizedName =
                    String(name).trim();

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
}

// ============================================================
// Authentication
// ============================================================

function applyAuthentication(headers, auth) {
    if (!auth || typeof auth !== "object") {
        return;
    }

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

        return;
    }

    if (auth.type === "basic") {
        const username = String(
            auth.fields?.username ?? "",
        );

        const password = String(
            auth.fields?.password ?? "",
        );

        if (!username && !password) {
            return;
        }

        const encoded = btoa(
            `${username}:${password}`,
        );

        headers.set(
            "Authorization",
            `Basic ${encoded}`,
        );

        return;
    }

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
}

// ============================================================
// Body
// ============================================================

function hasRequestBody(body) {
    return (
        body !== undefined &&
        body !== null &&
        String(body).trim() !== ""
    );
}

function prepareRequestBody(body, headers) {
    if (!hasRequestBody(body)) {
        return undefined;
    }

    if (typeof body === "string") {
        return body;
    }

    if (!headers.has("Content-Type")) {
        headers.set(
            "Content-Type",
            "application/json",
        );
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
 * @returns {RequestInit}
 */
export function buildRequestConfig({
    method = "GET",
    headers = [],
    body = "",
    auth = null,
} = {}) {
    const normalizedMethod =
        String(method)
            .trim()
            .toUpperCase() || "GET";

    const requestHeaders = new Headers();

    appendHeaders(
        requestHeaders,
        headers,
    );

    applyAuthentication(
        requestHeaders,
        auth,
    );

    const config = {
        method: normalizedMethod,
        headers: requestHeaders,
    };

    if (
        hasRequestBody(body) &&
        !HTTP_METHODS_WITHOUT_BODY.includes(
            normalizedMethod,
        )
    ) {
        config.body = prepareRequestBody(
            body,
            requestHeaders,
        );
    }

    return config;
}

// ============================================================
// Timeout
// ============================================================

function createTimeoutController(timeout) {
    const controller = new AbortController();

    const timeoutValue = Number(timeout);

    const timeoutId = window.setTimeout(() => {
        controller.abort("timeout");
    }, Number.isFinite(timeoutValue) && timeoutValue > 0
        ? timeoutValue
        : UI.REQUEST_TIMEOUT);

    return {
        controller,
        timeoutId,
    };
}

// ============================================================
// Error Normalization
// ============================================================

function normalizeRequestError(
    error,
    signal,
) {
    if (signal?.aborted) {
        const timeoutError = new Error(
            ERROR_MESSAGES.REQUEST_TIMEOUT,
        );

        timeoutError.code = "REQUEST_TIMEOUT";

        return timeoutError;
    }

    if (error instanceof TypeError) {
        const networkError = new Error(
            ERROR_MESSAGES.NETWORK_ERROR,
        );

        networkError.code = "NETWORK_ERROR";
        networkError.cause = error;

        return networkError;
    }

    if (error instanceof Error) {
        return error;
    }

    const unknownError = new Error(
        ERROR_MESSAGES.REQUEST_FAILED,
    );

    unknownError.code = "REQUEST_ERROR";
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
 * @returns {Promise<Object>}
 */
export async function sendRequest({
    url,
    method = "GET",
    headers = [],
    body = "",
    auth = null,
    timeout = UI.REQUEST_TIMEOUT,
} = {}) {
    const parsedUrl = validateRequestUrl(url);

    const requestConfig = buildRequestConfig({
        method,
        headers,
        body,
        auth,
    });

    const {
        controller,
        timeoutId,
    } = createTimeoutController(timeout);

    const startedAt = performance.now();

    try {
        const response = await fetch(
            parsedUrl.href,
            {
                ...requestConfig,
                signal: controller.signal,
            },
        );

        const raw = await response.text();

        const duration = Math.round(
            performance.now() - startedAt,
        );

        return normalizeResponse(
            response,
            raw,
            duration,
        );
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
 * Check whether a response status is successful.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return status >= 200 && status < 300;
}

/**
 * Check whether a response status is a client error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isClientError(status) {
    return status >= 400 && status < 500;
}

/**
 * Check whether a response status is a server error.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isServerError(status) {
    return status >= 500 && status < 600;
}

/**
 * Abort an active request.
 *
 * @param {AbortController} controller
 */
export function abortRequest(controller) {
    if (
        typeof AbortController !== "undefined" &&
        controller instanceof AbortController
    ) {
        controller.abort();
    }
}