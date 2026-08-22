// src/scripts/utils/formatters.js

/**
 * Formatting utilities
 *
 * Small, dependency-free helpers used throughout the application.
 *
 * Responsibilities:
 * - Format response status
 * - Format durations
 * - Format byte sizes
 * - Format JSON
 * - Format dates and timestamps
 * - Format request/response headers
 * - Escape HTML when text is inserted into HTML
 *
 * This module does not:
 * - Manipulate the DOM
 * - Manage application state
 * - Perform HTTP requests
 */

// ============================================================
// Constants
// ============================================================

const DEFAULT_LOCALE = "en-US";

const BYTE_UNITS = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
];

const HTTP_STATUS_TEXT = {
    100: "Continue",
    101: "Switching Protocols",
    102: "Processing",
    103: "Early Hints",

    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi-Status",
    208: "Already Reported",
    226: "IM Used",

    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    307: "Temporary Redirect",
    308: "Permanent Redirect",

    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Content Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Content",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",

    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
};

// ============================================================
// HTTP Status
// ============================================================

/**
 * Get a human-readable HTTP status text.
 *
 * @param {number|string} status
 * @returns {string}
 */
export function getStatusText(status) {
    const code = Number(status);

    if (!Number.isFinite(code)) {
        return "";
    }

    return (
        HTTP_STATUS_TEXT[code] ||
        "Unknown Status"
    );
}

/**
 * Format an HTTP status as "200 OK".
 *
 * @param {number|string} status
 * @param {string} [statusText]
 * @returns {string}
 */
export function formatStatus(status, statusText = "") {
    const code = Number(status);

    if (!Number.isFinite(code)) {
        return "";
    }

    const text =
        String(statusText).trim() ||
        getStatusText(code);

    return text
        ? `${code} ${text}`
        : String(code);
}

/**
 * Get a status category.
 *
 * @param {number|string} status
 * @returns {"informational"|"success"|"redirect"|"client-error"|"server-error"|"unknown"}
 */
export function getStatusCategory(status) {
    const code = Number(status);

    if (!Number.isFinite(code)) {
        return "unknown";
    }

    if (code >= 100 && code < 200) {
        return "informational";
    }

    if (code >= 200 && code < 300) {
        return "success";
    }

    if (code >= 300 && code < 400) {
        return "redirect";
    }

    if (code >= 400 && code < 500) {
        return "client-error";
    }

    if (code >= 500 && code < 600) {
        return "server-error";
    }

    return "unknown";
}

/**
 * Get a CSS-friendly status class suffix.
 *
 * @param {number|string} status
 * @returns {string}
 */
export function getStatusClass(status) {
    return getStatusCategory(status);
}

/**
 * Check whether an HTTP status represents success.
 *
 * @param {number|string} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
    return getStatusCategory(status) === "success";
}

// ============================================================
// Duration
// ============================================================

/**
 * Format a request duration.
 *
 * Examples:
 * - 0.4 -> "0 ms"
 * - 184 -> "184 ms"
 * - 1200 -> "1.2 s"
 * - 65000 -> "1m 5s"
 *
 * @param {number|string} milliseconds
 * @returns {string}
 */
export function formatDuration(milliseconds) {
    const value = Number(milliseconds);

    if (!Number.isFinite(value) || value < 0) {
        return "0 ms";
    }

    if (value < 1000) {
        return `${Math.round(value)} ms`;
    }

    if (value < 60000) {
        const seconds = value / 1000;

        return `${formatNumber(seconds, 1)} s`;
    }

    const totalSeconds = Math.floor(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (seconds === 0) {
        return `${minutes}m`;
    }

    return `${minutes}m ${seconds}s`;
}

// ============================================================
// Bytes
// ============================================================

/**
 * Format a byte count.
 *
 * Examples:
 * - 500 -> "500 B"
 * - 1024 -> "1 KB"
 * - 1234 -> "1.21 KB"
 * - 1048576 -> "1 MB"
 *
 * @param {number|string} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    const value = Number(bytes);

    if (!Number.isFinite(value) || value < 0) {
        return "0 B";
    }

    if (value === 0) {
        return "0 B";
    }

    const precision = Math.max(
        0,
        Number(decimals) || 0
    );

    const unitIndex = Math.min(
        Math.floor(
            Math.log(value) /
                Math.log(1024)
        ),
        BYTE_UNITS.length - 1
    );

    const size =
        value /
        Math.pow(1024, unitIndex);

    return `${formatNumber(size, precision)} ${BYTE_UNITS[unitIndex]}`;
}

/**
 * Parse a Content-Length header and format it.
 *
 * @param {string|number|null} value
 * @returns {string}
 */
export function formatContentLength(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const bytes = Number(value);

    if (!Number.isFinite(bytes)) {
        return String(value);
    }

    return formatBytes(bytes);
}

// ============================================================
// Numbers
// ============================================================

/**
 * Format a number while removing unnecessary trailing zeros.
 *
 * @param {number|string} value
 * @param {number} [maximumFractionDigits=2]
 * @returns {string}
 */
export function formatNumber(
    value,
    maximumFractionDigits = 2
) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    const digits = Math.max(
        0,
        Number(maximumFractionDigits) || 0
    );

    return new Intl.NumberFormat(
        DEFAULT_LOCALE,
        {
            maximumFractionDigits: digits,
        }
    ).format(number);
}

// ============================================================
// JSON
// ============================================================

/**
 * Pretty-print JSON.
 *
 * If the input is already an object, it is stringified.
 * If parsing fails, the original string is returned.
 *
 * @param {string|Object|Array} value
 * @param {number} [indent=2]
 * @returns {string}
 */
export function formatJson(value, indent = 2) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const spacing = Math.max(
        0,
        Number(indent) || 0
    );

    if (typeof value === "object") {
        try {
            return JSON.stringify(
                value,
                null,
                spacing
            );
        } catch {
            return String(value);
        }
    }

    const source = String(value).trim();

    if (!source) {
        return "";
    }

    try {
        const parsed = JSON.parse(source);

        return JSON.stringify(
            parsed,
            null,
            spacing
        );
    } catch {
        return String(value);
    }
}

/**
 * Check whether a value contains valid JSON.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidJson(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return false;
    }

    try {
        JSON.parse(String(value));
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely parse JSON.
 *
 * @param {string} value
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function parseJson(
    value,
    fallback = null
) {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    try {
        return JSON.parse(String(value));
    } catch {
        return fallback;
    }
}

// ============================================================
// Dates and Time
// ============================================================

/**
 * Format a date/time value.
 *
 * @param {string|number|Date} value
 * @param {Object} [options]
 * @returns {string}
 */
export function formatDate(
    value,
    options = {}
) {
    const date = toDate(value);

    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat(
        DEFAULT_LOCALE,
        options
    ).format(date);
}

/**
 * Format a date/time for history entries.
 *
 * Recent entries show the time.
 * Older entries show the date.
 *
 * @param {string|number|Date} value
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function formatRelativeDate(
    value,
    now = new Date()
) {
    const date = toDate(value);
    const current = toDate(now);

    if (!date || !current) {
        return "";
    }

    const difference =
        current.getTime() -
        date.getTime();

    const seconds = Math.floor(
        difference / 1000
    );

    if (seconds >= 0 && seconds < 60) {
        return "Just now";
    }

    if (
        seconds >= 60 &&
        seconds < 3600
    ) {
        const minutes = Math.floor(
            seconds / 60
        );

        return `${minutes}m ago`;
    }

    if (
        seconds >= 3600 &&
        seconds < 86400
    ) {
        const hours = Math.floor(
            seconds / 3600
        );

        return `${hours}h ago`;
    }

    if (
        seconds >= 86400 &&
        seconds < 604800
    ) {
        const days = Math.floor(
            seconds / 86400
        );

        return `${days}d ago`;
    }

    return formatDate(date, {
        month: "short",
        day: "numeric",
        year:
            date.getFullYear() !==
            current.getFullYear()
                ? "numeric"
                : undefined,
    });
}

/**
 * Convert an input to a Date.
 *
 * @param {string|number|Date} value
 * @returns {Date|null}
 */
export function toDate(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

// ============================================================
// Headers
// ============================================================

/**
 * Normalize headers into an array of key/value objects.
 *
 * Supports:
 * - Headers instance
 * - Plain object
 * - Array of { key, value }
 * - Array of { name, value }
 *
 * @param {Headers|Object|Array} headers
 * @returns {Array<{key: string, value: string}>}
 */
export function normalizeHeaders(headers) {
    if (!headers) {
        return [];
    }

    if (
        typeof Headers !== "undefined" &&
        headers instanceof Headers
    ) {
        return Array.from(
            headers.entries()
        ).map(([key, value]) => ({
            key,
            value,
        }));
    }

    if (Array.isArray(headers)) {
        return headers
            .map((header) => {
                if (!header) {
                    return null;
                }

                return {
                    key: String(
                        header.key ??
                        header.name ??
                        ""
                    ),
                    value: String(
                        header.value ?? ""
                    ),
                };
            })
            .filter(
                (header) =>
                    header &&
                    header.key.trim() !== ""
            );
    }

    if (
        typeof headers === "object"
    ) {
        return Object.entries(headers).map(
            ([key, value]) => ({
                key,
                value:
                    value === null ||
                    value === undefined
                        ? ""
                        : String(value),
            })
        );
    }

    return [];
}

/**
 * Format headers as a readable text block.
 *
 * @param {Headers|Object|Array} headers
 * @returns {string}
 */
export function formatHeaders(headers) {
    return normalizeHeaders(headers)
        .map(
            ({ key, value }) =>
                `${key}: ${value}`
        )
        .join("\n");
}

/**
 * Format headers as an object.
 *
 * When duplicate header names exist, the last value wins.
 *
 * @param {Headers|Array|Object} headers
 * @returns {Object}
 */
export function headersToObject(headers) {
    return normalizeHeaders(headers).reduce(
        (result, header) => {
            result[header.key] = header.value;
            return result;
        },
        {}
    );
}

// ============================================================
// Text
// ============================================================

/**
 * Truncate text to a maximum length.
 *
 * @param {*} value
 * @param {number} maxLength
 * @param {string} [suffix="..."]
 * @returns {string}
 */
export function truncate(
    value,
    maxLength,
    suffix = "..."
) {
    const text =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    const limit = Number(maxLength);

    if (
        !Number.isFinite(limit) ||
        limit <= 0
    ) {
        return "";
    }

    if (text.length <= limit) {
        return text;
    }

    if (suffix.length >= limit) {
        return suffix.slice(0, limit);
    }

    return (
        text.slice(
            0,
            limit - suffix.length
        ) + suffix
    );
}

/**
 * Normalize whitespace.
 *
 * @param {*} value
 * @returns {string}
 */
export function normalizeWhitespace(value) {
    return String(
        value ?? ""
    )
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Convert a value to a safe display string.
 *
 * @param {*} value
 * @returns {string}
 */
export function toDisplayString(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

// ============================================================
// HTML Safety
// ============================================================

/**
 * Escape text before inserting it into innerHTML.
 *
 * Prefer textContent when possible. Use this helper when a
 * feature intentionally needs to construct an HTML string.
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
    const text = toDisplayString(value);

    return text.replace(
        /[&<>"']/g,
        (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            };

            return entities[character];
        }
    );
}

// ============================================================
// URLs
// ============================================================

/**
 * Format a URL for display without changing its value.
 *
 * @param {string} value
 * @param {number} [maxLength]
 * @returns {string}
 */
export function formatUrl(
    value,
    maxLength
) {
    const url = String(value ?? "").trim();

    if (!maxLength) {
        return url;
    }

    return truncate(url, maxLength);
}

/**
 * Get the hostname from a URL.
 *
 * @param {string} value
 * @returns {string}
 */
export function getHostname(value) {
    if (!value) {
        return "";
    }

    try {
        return new URL(value).hostname;
    } catch {
        return "";
    }
}

/**
 * Remove the query string and hash from a URL.
 *
 * @param {string} value
 * @returns {string}
 */
export function getBaseUrl(value) {
    if (!value) {
        return "";
    }

    try {
        const url = new URL(value);

        url.search = "";
        url.hash = "";

        return url.href;
    } catch {
        return String(value);
    }
}

// ============================================================
// Methods
// ============================================================

/**
 * Normalize an HTTP method.
 *
 * @param {string} method
 * @param {string} [fallback="GET"]
 * @returns {string}
 */
export function formatMethod(
    method,
    fallback = "GET"
) {
    const value = String(
        method ?? ""
    )
        .trim()
        .toUpperCase();

    return value || fallback;
}

// ============================================================
// Default Export
// ============================================================

export default {
    getStatusText,
    formatStatus,
    getStatusCategory,
    getStatusClass,
    isSuccessStatus,

    formatDuration,

    formatBytes,
    formatContentLength,

    formatNumber,

    formatJson,
    isValidJson,
    parseJson,

    formatDate,
    formatRelativeDate,
    toDate,

    normalizeHeaders,
    formatHeaders,
    headersToObject,

    truncate,
    normalizeWhitespace,
    toDisplayString,
    escapeHtml,

    formatUrl,
    getHostname,
    getBaseUrl,

    formatMethod,
};