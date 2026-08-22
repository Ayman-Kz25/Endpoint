// src/scripts/features/editor/editor-config.js

/**
 * Editor Configuration
 *
 * Centralizes configuration used by the request/response editors.
 *
 * Responsibilities:
 * - Provide editor defaults
 * - Define supported editor modes
 * - Provide syntax highlighting configuration
 * - Keep editor-related constants out of UI modules
 *
 * This module does not:
 * - manipulate the DOM
 * - manage editor instances
 * - update application state
 * - execute requests
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

  readOnly: false,

  placeholder: "Enter request body...",

  mode: EDITOR_MODES.TEXT,
});

// ============================================================
// Response Editor Configuration
// ============================================================

export const RESPONSE_EDITOR_CONFIG = Object.freeze({
  ...EDITOR_DEFAULTS,

  type: EDITOR_TYPES.RESPONSE_BODY,

  readOnly: true,

  placeholder: "Response body will appear here...",

  mode: EDITOR_MODES.TEXT,
});

// ============================================================
// Language / MIME Type Mapping
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
  [MIME_TYPES.JSON]: EDITOR_MODES.JSON,
  "application/ld+json": EDITOR_MODES.JSON,
  "application/problem+json": EDITOR_MODES.JSON,

  [MIME_TYPES.JAVASCRIPT]: EDITOR_MODES.JAVASCRIPT,
  "text/javascript": EDITOR_MODES.JAVASCRIPT,

  [MIME_TYPES.HTML]: EDITOR_MODES.HTML,
  "application/xhtml+xml": EDITOR_MODES.HTML,

  [MIME_TYPES.CSS]: EDITOR_MODES.CSS,

  [MIME_TYPES.XML]: EDITOR_MODES.XML,
  "text/xml": EDITOR_MODES.XML,

  [MIME_TYPES.SQL]: EDITOR_MODES.SQL,

  [MIME_TYPES.TEXT]: EDITOR_MODES.TEXT,
});

// ============================================================
// File Extension -> Editor Mode
// ============================================================

const EXTENSION_MODE_MAP = Object.freeze({
  json: EDITOR_MODES.JSON,
  jsonc: EDITOR_MODES.JSON,

  js: EDITOR_MODES.JAVASCRIPT,
  mjs: EDITOR_MODES.JAVASCRIPT,
  cjs: EDITOR_MODES.JAVASCRIPT,

  html: EDITOR_MODES.HTML,
  htm: EDITOR_MODES.HTML,

  css: EDITOR_MODES.CSS,

  xml: EDITOR_MODES.XML,
  svg: EDITOR_MODES.XML,

  sql: EDITOR_MODES.SQL,

  md: EDITOR_MODES.MARKDOWN,
  markdown: EDITOR_MODES.MARKDOWN,

  txt: EDITOR_MODES.TEXT,
});

// ============================================================
// Method -> Suggested Body Mode
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
 * @param {string} mode
 * @returns {boolean}
 */
export function isSupportedEditorMode(mode) {
  return Object.values(EDITOR_MODES).includes(mode);
}

/**
 * Normalize an editor mode.
 *
 * @param {string} mode
 * @returns {string}
 */
export function normalizeEditorMode(mode) {
  if (!mode || typeof mode !== "string") {
    return EDITOR_MODES.TEXT;
  }

  const normalized = mode.trim().toLowerCase();

  return isSupportedEditorMode(normalized) ? normalized : EDITOR_MODES.TEXT;
}

// ============================================================
// MIME Helpers
// ============================================================

/**
 * Normalize a Content-Type value.
 *
 * Handles values such as:
 * application/json; charset=utf-8
 *
 * @param {string} contentType
 * @returns {string}
 */
export function normalizeContentType(contentType = "") {
  if (!contentType || typeof contentType !== "string") {
    return "";
  }

  return contentType.split(";")[0].trim().toLowerCase();
}

/**
 * Get the editor mode for a MIME type.
 *
 * @param {string} contentType
 * @returns {string}
 */
export function getModeFromContentType(contentType) {
  const normalized = normalizeContentType(contentType);

  if (!normalized) {
    return EDITOR_MODES.TEXT;
  }

  return MIME_MODE_MAP[normalized] || EDITOR_MODES.TEXT;
}

// ============================================================
// Extension Helpers
// ============================================================

/**
 * Get the editor mode from a file name or extension.
 *
 * @param {string} filename
 * @returns {string}
 */
export function getModeFromFilename(filename = "") {
  if (!filename || typeof filename !== "string") {
    return EDITOR_MODES.TEXT;
  }

  const cleanName = filename.split("?")[0].split("#")[0].trim().toLowerCase();

  const parts = cleanName.split(".");

  if (parts.length < 2) {
    return EDITOR_MODES.TEXT;
  }

  const extension = parts.pop();

  return EXTENSION_MODE_MAP[extension] || EDITOR_MODES.TEXT;
}

// ============================================================
// HTTP Helpers
// ============================================================

/**
 * Get a sensible editor mode for an HTTP method.
 *
 * @param {string} method
 * @returns {string}
 */
export function getModeFromMethod(method) {
  if (!method || typeof method !== "string") {
    return EDITOR_MODES.TEXT;
  }

  const normalizedMethod = method.trim().toUpperCase();

  return METHOD_MODE_MAP[normalizedMethod] || EDITOR_MODES.TEXT;
}

// ============================================================
// Content Detection
// ============================================================

/**
 * Detect whether text looks like JSON.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeJson(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect a reasonable editor mode from response content.
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
  const contentMode = getModeFromContentType(contentType);

  if (contentMode !== EDITOR_MODES.TEXT) {
    return contentMode;
  }

  const filenameMode = getModeFromFilename(filename);

  if (filenameMode !== EDITOR_MODES.TEXT) {
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
 * Create request-editor configuration.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getRequestEditorConfig(options = {}) {
  return {
    ...REQUEST_EDITOR_CONFIG,
    ...options,
    mode: normalizeEditorMode(options.mode || REQUEST_EDITOR_CONFIG.mode),
  };
}

/**
 * Create response-editor configuration.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getResponseEditorConfig(options = {}) {
  return {
    ...RESPONSE_EDITOR_CONFIG,
    ...options,
    mode: normalizeEditorMode(options.mode || RESPONSE_EDITOR_CONFIG.mode),
    readOnly: options.readOnly !== undefined ? Boolean(options.readOnly) : true,
  };
}

/**
 * Create a generic editor configuration.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getEditorConfig(options = {}) {
  return {
    ...EDITOR_DEFAULTS,
    ...options,
    mode: normalizeEditorMode(options.mode || EDITOR_DEFAULTS.mode),
  };
}

// ============================================================
// Editor DOM Defaults
// ============================================================

export const EDITOR_SELECTORS = Object.freeze({
  requestBody: "#request-body",
  responseBody: "#response-body",
  requestEditor: "#request-editor",
  responseEditor: "#response-editor",
});

// ============================================================
// Exports
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
