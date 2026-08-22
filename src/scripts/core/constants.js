//src/scripts/core/constants.js

// Application
export const APP = {
    NAME: "Endpoint",
    VERSION: "1.0.0",
    DEFAULT_THEME: "dark",
};


// HTTP
export const HTTP_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
];

export const DEFAULT_HTTP_METHOD = "GET";


// Request
export const REQUEST_TABS = {
    PARAMS: "params",
    HEADERS: "headers",
    BODY: "body",
    AUTH: "auth",
};

export const REQUEST_TAB_LIST = Object.values(REQUEST_TABS);

export const DEFAULT_REQUEST_TAB = REQUEST_TABS.PARAMS;

export const DEFAULT_REQUEST = {
    method: DEFAULT_HTTP_METHOD,
    url: "",
    params: [],
    headers: [],
    body: "",
};


// Authentication
export const AUTH_TYPES = {
    NONE: "none",
    BEARER: "bearer",
    BASIC: "basic",
    API_KEY: "api-key",
};

export const AUTH_TYPE_LIST = Object.values(AUTH_TYPES);

export const DEFAULT_AUTH_TYPE = AUTH_TYPES.NONE;


// Response
export const RESPONSE_TABS = {
    PRETTY: "pretty",
    RAW: "raw",
    HEADERS: "headers",
};

export const RESPONSE_TAB_LIST = Object.values(RESPONSE_TABS);

export const DEFAULT_RESPONSE_TAB = RESPONSE_TABS.PRETTY;


// Themes
export const THEMES = {
    LIGHT: "light",
    DARK: "dark",
};

export const THEME_LIST = Object.values(THEMES);


// Storage
export const STORAGE_KEYS = {
    THEME: "endpoint-theme",
    HISTORY: "endpoint-history",
    SETTINGS: "endpoint-settings",
    ENVIRONMENT: "endpoint-environment",
};


// History
export const HISTORY = {
    MAX_ITEMS: 50,
};


// Request Defaults
export const DEFAULT_HEADERS = [];

export const DEFAULT_PARAMS = [];

export const DEFAULT_BODY = "";

export const DEFAULT_AUTH = {
    type: AUTH_TYPES.NONE,
    fields: {},
};


// UI
export const UI = {
    SIDEBAR_WIDTH: 240,
    HEADER_HEIGHT: 60,

    MOBILE_BREAKPOINT: 768,

    TOAST_DURATION: 3000,

    REQUEST_TIMEOUT: 30000,
};


// Editor
export const EDITOR = {
    DEFAULT_LANGUAGE: "json",

    DEFAULT_CONTENT: "",

    TAB_SIZE: 2,

    LINE_WRAPPING: true,
};


// Response Status
export const HTTP_STATUS = {
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
};


// Events
export const EVENTS = {
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
};


// Validation
export const VALIDATION = {
    MAX_URL_LENGTH: 2048,

    MAX_HEADER_NAME_LENGTH: 256,
    MAX_HEADER_VALUE_LENGTH: 4096,

    MAX_PARAM_NAME_LENGTH: 256,
    MAX_PARAM_VALUE_LENGTH: 4096,

    MAX_BODY_SIZE: 1024 * 1024,
};


// Content Types
export const CONTENT_TYPES = {
    JSON: "application/json",
    TEXT: "text/plain",
    FORM_URLENCODED: "application/x-www-form-urlencoded",
    MULTIPART: "multipart/form-data",
    HTML: "text/html",
    XML: "application/xml",
};

// Error Messages
export const ERROR_MESSAGES = {
    INVALID_URL: "Please enter a valid URL.",
    INVALID_JSON: "Request body contains invalid JSON.",
    REQUEST_FAILED: "The request could not be completed.",
    REQUEST_TIMEOUT: "The request timed out.",
    NETWORK_ERROR: "A network error occurred.",
    UNKNOWN_ERROR: "Something went wrong.",
};