// src/scripts/features/request-builder/request-builder.js

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

const elements = {
    url: null,
    authType: null,
    authFields: null,
};

let initialized = false;

function cacheElements() {
    elements.url = document.getElementById("request-url");
    elements.authType = document.getElementById("auth-type");
    elements.authFields = document.getElementById("auth-fields");
}

function bindEvents() {
    elements.url?.addEventListener("input", handleUrlChange);
    elements.authType?.addEventListener("change", handleAuthChange);
}

function handleUrlChange(event) {
    const url = event.target.value.trim();

    setRequestUrl(url);
    state.request.url = url;
}

function handleAuthChange(event) {
    state.request.auth.type = event.target.value || "none";
    state.request.auth.fields = {};

    renderAuthFields();
}

export function initRequestBuilder() {
    cacheElements();

    if (!initialized) {
        bindEvents();
        initMethodSelector();
        initialized = true;
    }

    syncStateToUI();

    return {
        getRequest,
        setRequest,
        resetRequest,
        syncFromUI,
        syncToUI: syncStateToUI,
    };
}

export function syncFromUI() {
    state.request.method =
        getRequestMethod() || DEFAULT_HTTP_METHOD;

    state.request.url = getRequestUrl();
    state.request.params = getQueryParams();
    state.request.headers = getHeaders();
    state.request.body = getRequestBody();

    if (elements.authType) {
        state.request.auth.type =
            elements.authType.value || "none";
    }

    return state.request;
}

export function syncStateToUI() {
    setRequestMethod(
        state.request.method || DEFAULT_HTTP_METHOD
    );

    setRequestUrl(state.request.url || "");

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

    setRequestBody(state.request.body || "");

    if (elements.authType) {
        elements.authType.value =
            state.request.auth?.type || "none";
    }

    renderAuthFields();
}

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

export function setRequest(request = {}) {
    state.request = {
        ...state.request,
        method: request.method || DEFAULT_HTTP_METHOD,
        url: request.url || "",
        params: Array.isArray(request.params)
            ? request.params
            : [],
        headers: Array.isArray(request.headers)
            ? request.headers
            : [],
        body: request.body || "",
        auth: {
            type: request.auth?.type || "none",
            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };

    syncStateToUI();

    return state.request;
}

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

function renderAuthFields() {
    const container = elements.authFields;

    if (!container) {
        return;
    }

    const type = state.request.auth?.type || "none";
    const fields = state.request.auth?.fields || {};

    container.replaceChildren();

    if (type === "none") {
        return;
    }

    if (type === "bearer") {
        container.innerHTML = `
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
        `;

        bindAuthInput("auth-token", "token", fields.token);
        return;
    }

    if (type === "basic") {
        container.innerHTML = `
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

        bindAuthInput(
            "auth-username",
            "username",
            fields.username
        );

        bindAuthInput(
            "auth-password",
            "password",
            fields.password
        );

        return;
    }

    if (type === "api-key") {
        container.innerHTML = `
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

        bindAuthInput(
            "auth-key",
            "key",
            fields.key
        );

        bindAuthInput(
            "auth-value",
            "value",
            fields.value
        );

        const location = document.getElementById(
            "auth-location"
        );

        if (location) {
            location.value = fields.location || "header";

            location.addEventListener("change", (event) => {
                state.request.auth.fields.location =
                    event.target.value;
            });
        }
    }
}

function bindAuthInput(id, field, value = "") {
    const input = document.getElementById(id);

    if (!input) {
        return;
    }

    input.value = value || "";

    input.addEventListener("input", (event) => {
        state.request.auth.fields[field] =
            event.target.value;
    });
}

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

            if (!key) {
                return;
            }

            url.searchParams.set(
                key,
                String(param.value ?? "")
            );
        });

        if (
            request.auth?.type === "api-key" &&
            request.auth.fields?.location === "query"
        ) {
            const key = String(
                request.auth.fields.key ?? ""
            ).trim();

            const value = String(
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

export function validateRequest() {
    const request = getRequest();
    const errors = [];

    if (!request.url) {
        errors.push("Request URL is required.");
    } else {
        try {
            const url = new URL(request.url);

            if (!["http:", "https:"].includes(url.protocol)) {
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

    return {
        valid: errors.length === 0,
        errors,
    };
}

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