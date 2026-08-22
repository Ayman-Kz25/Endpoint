// src/scripts/features/request-builder/request-builder.js

/**
 * Request Builder
 *
 * Coordinates the request-building UI and keeps the request state
 * synchronized with the form controls.
 *
 * Responsibilities:
 * - Initialize request-builder controls
 * - Read/write request values
 * - Coordinate method, URL, params, headers, body, and auth
 * - Provide a clean request object for the API layer
 *
 * This module does not:
 * - Execute HTTP requests
 * - Render responses
 * - Show toast notifications
 */

import state from "../../core/state.js";
import { DEFAULT_HTTP_METHOD } from "../../core/constants.js";

import {
    getRequestMethod,
    initMethodSelector,
    setRequestMethod,
} from "./method-selector.js";

import {
    getRequestUrl,
    setRequestUrl,
} from "./url-handler.js";

import {
    getQueryParams,
    setQueryParams,
} from "./query-params.js";

import {
    getHeaders,
    setHeaders,
} from "./headers.js";

import {
    getRequestBody,
    setRequestBody,
} from "./body.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    method: null,
    url: null,
    authType: null,
    authFields: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the request builder.
 *
 * @returns {Object} Request builder API
 */
export function initRequestBuilder() {
    cacheElements();
    bindEvents();
    initMethodSelector();
    syncStateToUI();

    return {
        getRequest,
        setRequest,
        resetRequest,
        syncFromUI,
        syncToUI: syncStateToUI,
    };
}

/**
 * Cache request-builder DOM elements.
 */
function cacheElements() {
    elements.method = document.getElementById("request-method");
    elements.url = document.getElementById("request-url");
    elements.authType = document.getElementById("auth-type");
    elements.authFields = document.getElementById("auth-fields");
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind request-builder input events.
 */
function bindEvents() {
    if (elements.url) {
        elements.url.addEventListener("input", handleUrlInput);
        elements.url.addEventListener("change", handleUrlInput);
    }

    if (elements.authType) {
        elements.authType.addEventListener("change", handleAuthTypeChange);
    }
}

/**
 * Handle URL changes.
 *
 * @param {Event} event
 */
function handleUrlInput(event) {
    const url = event.target.value.trim();

    setRequestUrl(url);
    state.request.url = url;
}

/**
 * Handle authentication type changes.
 *
 * @param {Event} event
 */
function handleAuthTypeChange(event) {
    const type = event.target.value;

    state.request.auth.type = type;
    state.request.auth.fields = {};

    renderAuthFields();
}

// ============================================================
// State Synchronization
// ============================================================

/**
 * Synchronize all request state from the UI.
 *
 * Useful immediately before sending a request.
 */
export function syncFromUI() {
    state.request.method =
        getRequestMethod() || DEFAULT_HTTP_METHOD;

    state.request.url =
        getRequestUrl();

    state.request.params =
        getQueryParams();

    state.request.headers =
        getHeaders();

    state.request.body =
        getRequestBody();

    if (elements.authType) {
        state.request.auth.type =
            elements.authType.value || "none";
    }

    return state.request;
}

/**
 * Synchronize request state into the UI.
 */
export function syncStateToUI() {
    setRequestMethod(
        state.request.method || DEFAULT_HTTP_METHOD
    );

    setRequestUrl(
        state.request.url || ""
    );

    setQueryParams(
        Array.isArray(state.request.params)
            ? state.request.params
            : []
    );

    setHeaders(
        Array.isArray(state.request.headers)
            ? state.request.headers
            : []
    );

    setRequestBody(
        state.request.body || ""
    );

    if (elements.authType) {
        elements.authType.value =
            state.request.auth?.type || "none";
    }

    renderAuthFields();
}

// ============================================================
// Request Access
// ============================================================

/**
 * Get the complete request configuration.
 *
 * The UI is synchronized into state before returning.
 *
 * @returns {Object}
 */
export function getRequest() {
    syncFromUI();

    return {
        method: state.request.method,
        url: state.request.url,
        params: [...state.request.params],
        headers: [...state.request.headers],
        body: state.request.body,
        auth: {
            type: state.request.auth.type,
            fields: {
                ...state.request.auth.fields,
            },
        },
    };
}

/**
 * Replace the current request with supplied values.
 *
 * @param {Object} request
 */
export function setRequest(request = {}) {
    state.request = {
        ...state.request,

        method:
            request.method ||
            DEFAULT_HTTP_METHOD,

        url:
            request.url ||
            "",

        params:
            Array.isArray(request.params)
                ? request.params
                : [],

        headers:
            Array.isArray(request.headers)
                ? request.headers
                : [],

        body:
            request.body ||
            "",

        auth: {
            type:
                request.auth?.type ||
                "none",

            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };

    syncStateToUI();

    return state.request;
}

/**
 * Reset the request builder to its initial state.
 */
export function resetRequest() {
    state.request = {
        method: DEFAULT_HTTP_METHOD,
        url: "",
        params: [],
        headers: [],
        body: "",
        auth: {
            type: "none",
            fields: {},
        },
    };

    syncStateToUI();

    return state.request;
}

// ============================================================
// Authentication
// ============================================================

/**
 * Render authentication fields.
 *
 * Authentication-specific input handling can be expanded here
 * when the auth feature is implemented.
 */
function renderAuthFields() {
    if (!elements.authFields) {
        return;
    }

    const authType =
        state.request.auth?.type || "none";

    elements.authFields.innerHTML = "";

    if (authType === "none") {
        return;
    }

    if (authType === "bearer") {
        elements.authFields.innerHTML = `
            <div>
                <label
                    for="auth-token"
                    class="mb-1.5 block text-xs font-medium"
                >
                    Bearer token
                </label>

                <input
                    id="auth-token"
                    type="password"
                    autocomplete="off"
                    class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter bearer token"
                />
            </div>
        `;

        const tokenInput =
            document.getElementById("auth-token");

        tokenInput?.addEventListener("input", (event) => {
            state.request.auth.fields.token =
                event.target.value;
        });

        if (tokenInput) {
            tokenInput.value =
                state.request.auth.fields.token || "";
        }

        return;
    }

    if (authType === "basic") {
        elements.authFields.innerHTML = `
            <div class="space-y-3">
                <div>
                    <label
                        for="auth-username"
                        class="mb-1.5 block text-xs font-medium"
                    >
                        Username
                    </label>

                    <input
                        id="auth-username"
                        type="text"
                        autocomplete="off"
                        class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Username"
                    />
                </div>

                <div>
                    <label
                        for="auth-password"
                        class="mb-1.5 block text-xs font-medium"
                    >
                        Password
                    </label>

                    <input
                        id="auth-password"
                        type="password"
                        autocomplete="off"
                        class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Password"
                    />
                </div>
            </div>
        `;

        const usernameInput =
            document.getElementById("auth-username");

        const passwordInput =
            document.getElementById("auth-password");

        usernameInput?.addEventListener("input", (event) => {
            state.request.auth.fields.username =
                event.target.value;
        });

        passwordInput?.addEventListener("input", (event) => {
            state.request.auth.fields.password =
                event.target.value;
        });

        if (usernameInput) {
            usernameInput.value =
                state.request.auth.fields.username || "";
        }

        if (passwordInput) {
            passwordInput.value =
                state.request.auth.fields.password || "";
        }

        return;
    }

    if (authType === "api-key") {
        elements.authFields.innerHTML = `
            <div class="space-y-3">
                <div>
                    <label
                        for="auth-key"
                        class="mb-1.5 block text-xs font-medium"
                    >
                        Key
                    </label>

                    <input
                        id="auth-key"
                        type="text"
                        autocomplete="off"
                        class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="X-API-Key"
                    />
                </div>

                <div>
                    <label
                        for="auth-value"
                        class="mb-1.5 block text-xs font-medium"
                    >
                        Value
                    </label>

                    <input
                        id="auth-value"
                        type="password"
                        autocomplete="off"
                        class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="API key value"
                    />
                </div>

                <div>
                    <label
                        for="auth-location"
                        class="mb-1.5 block text-xs font-medium"
                    >
                        Add to
                    </label>

                    <select
                        id="auth-location"
                        class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="header">Header</option>
                        <option value="query">Query Parameter</option>
                    </select>
                </div>
            </div>
        `;

        const keyInput =
            document.getElementById("auth-key");

        const valueInput =
            document.getElementById("auth-value");

        const locationInput =
            document.getElementById("auth-location");

        keyInput?.addEventListener("input", (event) => {
            state.request.auth.fields.key =
                event.target.value;
        });

        valueInput?.addEventListener("input", (event) => {
            state.request.auth.fields.value =
                event.target.value;
        });

        locationInput?.addEventListener("change", (event) => {
            state.request.auth.fields.location =
                event.target.value;
        });

        if (keyInput) {
            keyInput.value =
                state.request.auth.fields.key || "";
        }

        if (valueInput) {
            valueInput.value =
                state.request.auth.fields.value || "";
        }

        if (locationInput) {
            locationInput.value =
                state.request.auth.fields.location ||
                "header";
        }
    }
}

// ============================================================
// Request URL Helpers
// ============================================================

/**
 * Build a URL containing the current query parameters.
 *
 * This does not modify the URL input.
 *
 * @returns {string}
 */
export function getFinalRequestUrl() {
    const request = getRequest();

    if (!request.url) {
        return "";
    }

    try {
        const url = new URL(request.url);

        request.params.forEach((param) => {
            if (!param || param.enabled === false) {
                return;
            }

            const key = String(param.key ?? "").trim();
            const value = String(param.value ?? "");

            if (!key) {
                return;
            }

            url.searchParams.set(key, value);
        });

        // API-key authentication can optionally be added
        // to the query string.
        if (
            request.auth?.type === "api-key" &&
            request.auth.fields?.location === "query"
        ) {
            const key =
                String(
                    request.auth.fields.key ?? ""
                ).trim();

            const value =
                String(
                    request.auth.fields.value ?? ""
                );

            if (key && value) {
                url.searchParams.set(key, value);
            }
        }

        return url.href;
    } catch {
        return request.url;
    }
}

// ============================================================
// Request Validation
// ============================================================

/**
 * Validate the current request before sending.
 *
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRequest() {
    const request = getRequest();
    const errors = [];

    if (!request.url) {
        errors.push("Request URL is required.");
    } else {
        try {
            const url = new URL(request.url);

            if (
                !["http:", "https:"].includes(
                    url.protocol
                )
            ) {
                errors.push(
                    "Only HTTP and HTTPS URLs are supported."
                );
            }
        } catch {
            errors.push("Please enter a valid URL.");
        }
    }

    if (!request.method) {
        errors.push("HTTP method is required.");
    }

    if (
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        request.body
    ) {
        // Body is allowed for these methods, so no action
        // is needed here. This check exists as a clear place
        // for future method-specific validation.
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// Exports
// ============================================================

export default {
    initRequestBuilder,
    getRequest,
    setRequest,
    resetRequest,
    syncFromUI,
    syncStateToUI,
    getFinalRequestUrl,
    validateRequest,
};