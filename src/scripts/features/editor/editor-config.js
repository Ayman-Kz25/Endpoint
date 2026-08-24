// src/scripts/features/editor/editor-config.js

/**
 * Editor Configuration
 *
 * Centralizes configuration used by request and response editors.
 *
 * Responsibilities:
 * - Define supported editor modes
 * - Provide editor defaults
 * - Map HTTP/content metadata to editor modes
 * - Build request/response editor configuration
 * - Provide shared editor selectors
 *
 * This module does not:
 * - manipulate the DOM
 * - create or manage editor instances
 * - update application state
 * - execute HTTP requests
 */

// ============================================================
// Editor Modes
// ============================================================

export const EDITOR_MODES = Object.freeze({
    TEXT: "text",
    JSON: "json",
    JAVASCRIPT: "javascript",
    HTML: "html",
    CSS: "css",
    XML: "xml",
    SQL: "sql",
    MARKDOWN: "markdown",
});

// ============================================================
// Editor Types
// ============================================================

export const EDITOR_TYPES = Object.freeze({
    REQUEST_BODY: "request-body",
    RESPONSE_BODY: "response-body",
});

// ============================================================
// Defaults
// ============================================================

export const EDITOR_DEFAULTS = Object.freeze({
    mode: EDITOR_MODES.TEXT,
    tabSize: 2,
    indentUnit: 2,
    lineNumbers: true,
    lineWrapping: true,
    readOnly: false,
    autofocus: false,
    cursorBlinkRate: 530,
    viewportMargin: Infinity,
});

// ============================================================
// Request Editor Configuration
// ============================================================

export const REQUEST_EDITOR_CONFIG = Object.freeze({
    ...EDITOR_DEFAULTS,

    type: EDITOR_TYPES.REQUEST_BODY,

    mode: EDITOR_MODES.TEXT,

    readOnly: false,

    placeholder: "Enter request body...",
});

// ============================================================
// Response Editor Configuration
// ============================================================

export const RESPONSE_EDITOR_CONFIG = Object.freeze({
    ...EDITOR_DEFAULTS,

    type: EDITOR_TYPES.RESPONSE_BODY,

    mode: EDITOR_MODES.TEXT,

    readOnly: true,

    placeholder: "Response body will appear here...",
});

// ============================================================
// MIME Types
// ============================================================

export const MIME_TYPES = Object.freeze({
    JSON: "application/json",
    JAVASCRIPT: "application/javascript",
    HTML: "text/html",
    CSS: "text/css",
    XML: "application/xml",
    TEXT: "text/plain",
    SQL: "application/sql",
    FORM_URLENCODED: "application/x-www-form-urlencoded",
});

// ============================================================
// MIME -> Editor Mode
// ============================================================

const MIME_MODE_MAP = Object.freeze({
    // JSON
    "application/json": EDITOR_MODES.JSON,
    "application/ld+json": EDITOR_MODES.JSON,
    "application/problem+json": EDITOR_MODES.JSON,
    "application/geo+json": EDITOR_MODES.JSON,
    "application/manifest+json": EDITOR_MODES.JSON,

    // JavaScript
    "application/javascript": EDITOR_MODES.JAVASCRIPT,
    "application/x-javascript": EDITOR_MODES.JAVASCRIPT,
    "text/javascript": EDITOR_MODES.JAVASCRIPT,
    "text/ecmascript": EDITOR_MODES.JAVASCRIPT,
    "application/ecmascript": EDITOR_MODES.JAVASCRIPT,

    // HTML
    "text/html": EDITOR_MODES.HTML,
    "application/xhtml+xml": EDITOR_MODES.HTML,

    // CSS
    "text/css": EDITOR_MODES.CSS,

    // XML
    "application/xml": EDITOR_MODES.XML,
    "text/xml": EDITOR_MODES.XML,
    "application/rss+xml": EDITOR_MODES.XML,
    "application/atom+xml": EDITOR_MODES.XML,
    "image/svg+xml": EDITOR_MODES.XML,

    // SQL
    "application/sql": EDITOR_MODES.SQL,
    "text/x-sql": EDITOR_MODES.SQL,

    // Plain text
    "text/plain": EDITOR_MODES.TEXT,
});

// ============================================================
// File Extension -> Editor Mode
// ============================================================

const EXTENSION_MODE_MAP = Object.freeze({
    // JSON
    json: EDITOR_MODES.JSON,
    jsonc: EDITOR_MODES.JSON,

    // JavaScript
    js: EDITOR_MODES.JAVASCRIPT,
    mjs: EDITOR_MODES.JAVASCRIPT,
    cjs: EDITOR_MODES.JAVASCRIPT,
    jsx: EDITOR_MODES.JAVASCRIPT,

    // HTML
    html: EDITOR_MODES.HTML,
    htm: EDITOR_MODES.HTML,
    xhtml: EDITOR_MODES.HTML,

    // CSS
    css: EDITOR_MODES.CSS,

    // XML
    xml: EDITOR_MODES.XML,
    xsd: EDITOR_MODES.XML,
    xsl: EDITOR_MODES.XML,
    xslt: EDITOR_MODES.XML,
    svg: EDITOR_MODES.XML,

    // SQL
    sql: EDITOR_MODES.SQL,

    // Markdown
    md: EDITOR_MODES.MARKDOWN,
    markdown: EDITOR_MODES.MARKDOWN,

    // Text
    txt: EDITOR_MODES.TEXT,
});

// ============================================================
// HTTP Method -> Suggested Body Mode
// ============================================================

const METHOD_MODE_MAP = Object.freeze({
    GET: EDITOR_MODES.TEXT,
    HEAD: EDITOR_MODES.TEXT,

    POST: EDITOR_MODES.JSON,
    PUT: EDITOR_MODES.JSON,
    PATCH: EDITOR_MODES.JSON,

    DELETE: EDITOR_MODES.JSON,
});

// ============================================================
// Mode Helpers
// ============================================================

/**
 * Check whether an editor mode is supported.
 *
 * @param {unknown} mode
 * @returns {boolean}
 */
export function isSupportedEditorMode(mode) {
    return Object.values(EDITOR_MODES).includes(mode);
}

/**
 * Normalize an editor mode.
 *
 * @param {unknown} mode
 * @returns {string}
 */
export function normalizeEditorMode(mode) {
    if (typeof mode !== "string") {
        return EDITOR_MODES.TEXT;
    }

    const normalized = mode.trim().toLowerCase();

    if (!normalized) {
        return EDITOR_MODES.TEXT;
    }

    return isSupportedEditorMode(normalized)
        ? normalized
        : EDITOR_MODES.TEXT;
}

// ============================================================
// MIME Helpers
// ============================================================

/**
 * Normalize a Content-Type value.
 *
 * Examples:
 * application/json; charset=utf-8
 * TEXT/HTML
 *
 * @param {unknown} contentType
 * @returns {string}
 */
export function normalizeContentType(contentType = "") {
    if (typeof contentType !== "string") {
        return "";
    }

    return contentType
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
}

/**
 * Get the editor mode from a MIME type.
 *
 * @param {unknown} contentType
 * @returns {string}
 */
export function getModeFromContentType(contentType) {
    const normalized =
        normalizeContentType(contentType);

    if (!normalized) {
        return EDITOR_MODES.TEXT;
    }

    const exactMode =
        MIME_MODE_MAP[normalized];

    if (exactMode) {
        return exactMode;
    }

    /*
     * Structured syntax suffixes are common for API responses.
     *
     * Examples:
     * application/vnd.api+json
     * application/custom+xml
     */
    if (normalized.endsWith("+json")) {
        return EDITOR_MODES.JSON;
    }

    if (normalized.endsWith("+xml")) {
        return EDITOR_MODES.XML;
    }

    return EDITOR_MODES.TEXT;
}

// ============================================================
// Filename Helpers
// ============================================================

/**
 * Remove URL query/hash information from a filename.
 *
 * @param {string} filename
 * @returns {string}
 */
function cleanFilename(filename) {
    return filename
        .split(/[?#]/, 1)[0]
        .trim()
        .toLowerCase();
}

/**
 * Get the final file extension.
 *
 * @param {string} filename
 * @returns {string}
 */
function getFileExtension(filename) {
    const cleanName = cleanFilename(filename);

    if (!cleanName) {
        return "";
    }

    const lastSlash =
        Math.max(
            cleanName.lastIndexOf("/"),
            cleanName.lastIndexOf("\\"),
        );

    const basename =
        cleanName.slice(lastSlash + 1);

    const lastDot =
        basename.lastIndexOf(".");

    if (
        lastDot <= 0 ||
        lastDot === basename.length - 1
    ) {
        return "";
    }

    return basename
        .slice(lastDot + 1)
        .toLowerCase();
}

/**
 * Get the editor mode from a filename or extension.
 *
 * @param {unknown} filename
 * @returns {string}
 */
export function getModeFromFilename(filename = "") {
    if (typeof filename !== "string") {
        return EDITOR_MODES.TEXT;
    }

    const extension =
        getFileExtension(filename);

    if (!extension) {
        return EDITOR_MODES.TEXT;
    }

    return (
        EXTENSION_MODE_MAP[extension] ||
        EDITOR_MODES.TEXT
    );
}

// ============================================================
// HTTP Helpers
// ============================================================

/**
 * Get the suggested editor mode for an HTTP method.
 *
 * This is a suggestion only. Explicit content-type or editor-mode
 * information should take precedence when available.
 *
 * @param {unknown} method
 * @returns {string}
 */
export function getModeFromMethod(method) {
    if (typeof method !== "string") {
        return EDITOR_MODES.TEXT;
    }

    const normalized =
        method.trim().toUpperCase();

    if (!normalized) {
        return EDITOR_MODES.TEXT;
    }

    return (
        METHOD_MODE_MAP[normalized] ||
        EDITOR_MODES.TEXT
    );
}

// ============================================================
// Content Detection
// ============================================================

/**
 * Detect whether a value contains valid JSON.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function looksLikeJson(value) {
    if (typeof value !== "string") {
        return false;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return false;
    }

    const firstCharacter =
        trimmed[0];

    if (
        firstCharacter !== "{" &&
        firstCharacter !== "["
    ) {
        return false;
    }

    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Editor Mode Detection
// ============================================================

/**
 * Detect a suitable editor mode from response metadata/content.
 *
 * Priority:
 * 1. Content-Type
 * 2. Filename
 * 3. JSON content detection
 * 4. Plain text
 *
 * @param {Object} options
 * @param {string} [options.contentType]
 * @param {string} [options.filename]
 * @param {string} [options.value]
 * @returns {string}
 */
export function detectEditorMode({
    contentType = "",
    filename = "",
    value = "",
} = {}) {
    const contentTypeMode =
        getModeFromContentType(
            contentType,
        );

    if (
        contentTypeMode !==
        EDITOR_MODES.TEXT
    ) {
        return contentTypeMode;
    }

    const filenameMode =
        getModeFromFilename(filename);

    if (
        filenameMode !==
        EDITOR_MODES.TEXT
    ) {
        return filenameMode;
    }

    if (looksLikeJson(value)) {
        return EDITOR_MODES.JSON;
    }

    return EDITOR_MODES.TEXT;
}

// ============================================================
// Configuration Builders
// ============================================================

/**
 * Create a request-editor configuration.
 *
 * Explicit options override the defaults.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getRequestEditorConfig(
    options = {},
) {
    const safeOptions =
        options &&
        typeof options === "object"
            ? options
            : {};

    return {
        ...REQUEST_EDITOR_CONFIG,
        ...safeOptions,

        type: EDITOR_TYPES.REQUEST_BODY,

        mode: normalizeEditorMode(
            safeOptions.mode ??
                REQUEST_EDITOR_CONFIG.mode,
        ),
    };
}

/**
 * Create a response-editor configuration.
 *
 * Response editors are read-only by default, but an explicit
 * readOnly option may override that behavior.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getResponseEditorConfig(
    options = {},
) {
    const safeOptions =
        options &&
        typeof options === "object"
            ? options
            : {};

    return {
        ...RESPONSE_EDITOR_CONFIG,
        ...safeOptions,

        type: EDITOR_TYPES.RESPONSE_BODY,

        mode: normalizeEditorMode(
            safeOptions.mode ??
                RESPONSE_EDITOR_CONFIG.mode,
        ),

        readOnly:
            safeOptions.readOnly === undefined
                ? RESPONSE_EDITOR_CONFIG.readOnly
                : Boolean(
                      safeOptions.readOnly,
                  ),
    };
}

/**
 * Create a generic editor configuration.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getEditorConfig(
    options = {},
) {
    const safeOptions =
        options &&
        typeof options === "object"
            ? options
            : {};

    return {
        ...EDITOR_DEFAULTS,
        ...safeOptions,

        mode: normalizeEditorMode(
            safeOptions.mode ??
                EDITOR_DEFAULTS.mode,
        ),
    };
}

// ============================================================
// Editor DOM Selectors
// ============================================================

export const EDITOR_SELECTORS = Object.freeze({
    requestBody: "#request-body",
    responseBody: "#response-body",
    requestEditor: "#request-editor",
    responseEditor: "#response-editor",
});

// ============================================================
// Default Export
// ============================================================

export default {
    EDITOR_MODES,
    EDITOR_TYPES,
    EDITOR_DEFAULTS,
    REQUEST_EDITOR_CONFIG,
    RESPONSE_EDITOR_CONFIG,
    MIME_TYPES,
    EDITOR_SELECTORS,

    isSupportedEditorMode,
    normalizeEditorMode,

    normalizeContentType,
    getModeFromContentType,

    getModeFromFilename,
    getModeFromMethod,

    looksLikeJson,
    detectEditorMode,

    getRequestEditorConfig,
    getResponseEditorConfig,
    getEditorConfig,
};