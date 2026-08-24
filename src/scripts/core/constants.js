// src/scripts/core/constants.js

/**
 * Application Constants
 *
 * Centralized fixed values used throughout the application.
 *
 * This module does not:
 * - manipulate the DOM
 * - update application state
 * - perform application logic
 * - access browser storage
 *
 * It only defines shared constants and defaults.
 */

// ============================================================
// Application
// ============================================================

export const APP = Object.freeze({
    NAME: "Endpoint",
    VERSION: "1.0.0",
    DEFAULT_THEME: "dark",
});

// ============================================================
// HTTP
// ============================================================

export const HTTP_METHODS = Object.freeze([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
]);

export const DEFAULT_HTTP_METHOD = "GET";

// ============================================================
// Request Tabs
// ============================================================

export const REQUEST_TABS = Object.freeze({
    PARAMS: "params",
    HEADERS: "headers",
    BODY: "body",
    AUTH: "auth",
});

export const REQUEST_TAB_LIST = Object.freeze(
    Object.values(REQUEST_TABS),
);

export const DEFAULT_REQUEST_TAB =
    REQUEST_TABS.PARAMS;

// ============================================================
// Authentication
// ============================================================

export const AUTH_TYPES = Object.freeze({
    NONE: "none",
    BEARER: "bearer",
    BASIC: "basic",
    API_KEY: "api-key",
});

export const AUTH_TYPE_LIST = Object.freeze(
    Object.values(AUTH_TYPES),
);

export const DEFAULT_AUTH_TYPE =
    AUTH_TYPES.NONE;

// ============================================================
// Default Request
// ============================================================

export const DEFAULT_REQUEST = Object.freeze({
    method: DEFAULT_HTTP_METHOD,
    url: "",
    params: [],
    headers: [],
    body: "",
    auth: {
        type: DEFAULT_AUTH_TYPE,
        fields: {},
    },
});

// ============================================================
// Response Tabs
// ============================================================

export const RESPONSE_TABS = Object.freeze({
    PRETTY: "pretty",
    RAW: "raw",
    HEADERS: "headers",
});

export const RESPONSE_TAB_LIST = Object.freeze(
    Object.values(RESPONSE_TABS),
);

export const DEFAULT_RESPONSE_TAB =
    RESPONSE_TABS.PRETTY;

// ============================================================
// Themes
// ============================================================

export const THEMES = Object.freeze({
    LIGHT: "light",
    DARK: "dark",
});

export const THEME_LIST = Object.freeze(
    Object.values(THEMES),
);

// ============================================================
// Storage
// ============================================================

export const STORAGE_KEYS = Object.freeze({
    THEME: "endpoint-theme",
    HISTORY: "endpoint-history",
    SETTINGS: "endpoint-settings",
    ENVIRONMENT: "endpoint-environment",
});

// ============================================================
// History
// ============================================================

export const HISTORY = Object.freeze({
    MAX_ITEMS: 50,
});

// ============================================================
// Request Defaults
// ============================================================

export const DEFAULT_HEADERS = Object.freeze([]);

export const DEFAULT_PARAMS = Object.freeze([]);

export const DEFAULT_BODY = "";

export const DEFAULT_AUTH = Object.freeze({
    type: DEFAULT_AUTH_TYPE,
    fields: {},
});

// ============================================================
// UI
// ============================================================

export const UI = Object.freeze({
    SIDEBAR_WIDTH: 240,
    HEADER_HEIGHT: 60,
    MOBILE_BREAKPOINT: 768,
    TOAST_DURATION: 3000,
    REQUEST_TIMEOUT: 30000,
});

// ============================================================
// Editor
// ============================================================

export const EDITOR = Object.freeze({
    DEFAULT_LANGUAGE: "json",
    DEFAULT_CONTENT: "",
    TAB_SIZE: 2,
    LINE_WRAPPING: true,
});

// ============================================================
// HTTP Status Codes
// ============================================================

export const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    TOO_MANY_REQUESTS: 429,

    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
});

// ============================================================
// Events
// ============================================================

export const EVENTS = Object.freeze({
    REQUEST_CHANGED: "request:changed",
    REQUEST_SENT: "request:sent",

    RESPONSE_RECEIVED: "response:received",
    RESPONSE_ERROR: "response:error",

    TAB_CHANGED: "tab:changed",
    THEME_CHANGED: "theme:changed",

    HISTORY_CHANGED: "history:changed",

    SIDEBAR_CHANGED: "sidebar:changed",

    MODAL_OPENED: "modal:opened",
    MODAL_CLOSED: "modal:closed",

    LOADING_STARTED: "loading:started",
    LOADING_FINISHED: "loading:finished",
});

// ============================================================
// Validation
// ============================================================

export const VALIDATION = Object.freeze({
    MAX_URL_LENGTH: 2048,

    MAX_HEADER_NAME_LENGTH: 256,
    MAX_HEADER_VALUE_LENGTH: 4096,

    MAX_PARAM_NAME_LENGTH: 256,
    MAX_PARAM_VALUE_LENGTH: 4096,

    MAX_BODY_SIZE: 1024 * 1024,
});

// ============================================================
// Content Types
// ============================================================

export const CONTENT_TYPES = Object.freeze({
    JSON: "application/json",
    TEXT: "text/plain",
    FORM_URLENCODED:
        "application/x-www-form-urlencoded",
    MULTIPART: "multipart/form-data",
    HTML: "text/html",
    XML: "application/xml",
});

// ============================================================
// Error Messages
// ============================================================

export const ERROR_MESSAGES = Object.freeze({
    INVALID_URL:
        "Please enter a valid URL.",

    INVALID_JSON:
        "Request body contains invalid JSON.",

    REQUEST_FAILED:
        "The request could not be completed.",

    REQUEST_TIMEOUT:
        "The request timed out.",

    NETWORK_ERROR:
        "A network error occurred.",

    UNKNOWN_ERROR:
        "Something went wrong.",
});