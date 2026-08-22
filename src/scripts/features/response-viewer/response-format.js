// src/scripts/features/response-viewer/response-format.js

/**
 * Response Format Utilities
 *
 * Provides formatting, parsing, and display helpers for HTTP responses.
 *
 * Responsibilities:
 * - Detect response formats
 * - Parse JSON safely
 * - Format JSON/XML/HTML/text
 * - Escape HTML for safe display
 * - Format response metadata
 *
 * This module does not:
 * - Execute HTTP requests
 * - Modify application state
 * - Manipulate the DOM
 * - Render response UI
 */

// ============================================================
// Constants
// ============================================================

const FORMAT_TYPES = Object.freeze({
    JSON: "json",
    XML: "xml",
    HTML: "html",
    TEXT: "text",
    UNKNOWN: "unknown",
});

const JSON_CONTENT_TYPES = [
    "application/json",
    "application/ld+json",
    "application/problem+json",
    "application/vnd.api+json",
];

const XML_CONTENT_TYPES = [
    "application/xml",
    "text/xml",
    "application/xhtml+xml",
];

const HTML_CONTENT_TYPES = [
    "text/html",
];

const BINARY_CONTENT_TYPES = [
    "application/octet-stream",
    "application/pdf",
    "application/zip",
    "application/gzip",
    "application/x-gzip",
    "image/",
    "audio/",
    "video/",
];

// ============================================================
// Content-Type Helpers
// ============================================================

/**
 * Normalize a Content-Type header.
 *
 * @param {string} contentType
 * @returns {string}
 */
export function normalizeContentType(contentType = "") {
    return String(contentType)
        .split(";")[0]
        .trim()
        .toLowerCase();
}

/**
 * Detect the response format from Content-Type.
 *
 * @param {string} contentType
 * @param {unknown} data
 * @returns {string}
 */
export function detectResponseFormat(
    contentType = "",
    data = ""
) {
    const normalized = normalizeContentType(contentType);

    if (
        JSON_CONTENT_TYPES.some((type) =>
            normalized === type
        )
    ) {
        return FORMAT_TYPES.JSON;
    }

    if (
        XML_CONTENT_TYPES.some((type) =>
            normalized === type
        )
    ) {
        return FORMAT_TYPES.XML;
    }

    if (
        HTML_CONTENT_TYPES.some((type) =>
            normalized === type
        )
    ) {
        return FORMAT_TYPES.HTML;
    }

    if (
        BINARY_CONTENT_TYPES.some((type) =>
            normalized.startsWith(type)
        )
    ) {
        return FORMAT_TYPES.UNKNOWN;
    }

    return detectFormatFromContent(data);
}

/**
 * Detect a response format from its content.
 *
 * @param {unknown} data
 * @returns {string}
 */
export function detectFormatFromContent(data = "") {
    if (
        data !== null &&
        typeof data === "object"
    ) {
        return FORMAT_TYPES.JSON;
    }

    const text = String(data ?? "").trim();

    if (!text) {
        return FORMAT_TYPES.TEXT;
    }

    if (isValidJson(text)) {
        return FORMAT_TYPES.JSON;
    }

    if (looksLikeXml(text)) {
        return FORMAT_TYPES.XML;
    }

    if (looksLikeHtml(text)) {
        return FORMAT_TYPES.HTML;
    }

    return FORMAT_TYPES.TEXT;
}

/**
 * Check whether a content type represents JSON.
 *
 * @param {string} contentType
 * @returns {boolean}
 */
export function isJsonContentType(contentType = "") {
    const normalized = normalizeContentType(contentType);

    return JSON_CONTENT_TYPES.some(
        (type) => normalized === type
    );
}

/**
 * Check whether a content type represents XML.
 *
 * @param {string} contentType
 * @returns {boolean}
 */
export function isXmlContentType(contentType = "") {
    const normalized = normalizeContentType(contentType);

    return XML_CONTENT_TYPES.some(
        (type) => normalized === type
    );
}

/**
 * Check whether a content type represents HTML.
 *
 * @param {string} contentType
 * @returns {boolean}
 */
export function isHtmlContentType(contentType = "") {
    const normalized = normalizeContentType(contentType);

    return HTML_CONTENT_TYPES.some(
        (type) => normalized === type
    );
}

/**
 * Check whether a content type is likely binary.
 *
 * @param {string} contentType
 * @returns {boolean}
 */
export function isBinaryContentType(contentType = "") {
    const normalized = normalizeContentType(contentType);

    return BINARY_CONTENT_TYPES.some(
        (type) => normalized.startsWith(type)
    );
}

// ============================================================
// JSON
// ============================================================

/**
 * Check whether a value contains valid JSON.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidJson(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }

    if (typeof value === "object") {
        return true;
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return false;
    }

    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse JSON safely.
 *
 * @param {unknown} value
 * @returns {{success: boolean, data: unknown, error: Error|null}}
 */
export function parseJson(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return {
            success: false,
            data: null,
            error: null,
        };
    }

    if (typeof value === "object") {
        return {
            success: true,
            data: value,
            error: null,
        };
    }

    try {
        return {
            success: true,
            data: JSON.parse(String(value)),
            error: null,
        };
    } catch (error) {
        return {
            success: false,
            data: null,
            error:
                error instanceof Error
                    ? error
                    : new Error("Invalid JSON."),
        };
    }
}

/**
 * Format JSON using two-space indentation.
 *
 * @param {unknown} value
 * @param {number} indentation
 * @returns {string}
 */
export function formatJson(value, indentation = 2) {
    const parsed = parseJson(value);

    if (!parsed.success) {
        return String(value ?? "");
    }

    try {
        return JSON.stringify(
            parsed.data,
            null,
            indentation
        );
    } catch {
        return String(value ?? "");
    }
}

/**
 * Minify JSON.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function minifyJson(value) {
    const parsed = parseJson(value);

    if (!parsed.success) {
        return String(value ?? "");
    }

    try {
        return JSON.stringify(parsed.data);
    } catch {
        return String(value ?? "");
    }
}

/**
 * Format JSON if valid, otherwise return original text.
 *
 * @param {string} value
 * @returns {string}
 */
export function prettifyJson(value = "") {
    return formatJson(value, 2);
}

// ============================================================
// XML
// ============================================================

/**
 * Check whether content looks like XML.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeXml(value = "") {
    const text = String(value).trim();

    if (!text) {
        return false;
    }

    return (
        /^<\?xml[\s>]/i.test(text) ||
        /^<[\w:-]+(?:\s[^>]*)?>[\s\S]*<\/[\w:-]+>\s*$/i.test(
            text
        )
    );
}

/**
 * Format XML with indentation.
 *
 * This is intended for display formatting, not XML transformation.
 *
 * @param {string} value
 * @param {number} indentation
 * @returns {string}
 */
export function formatXml(
    value = "",
    indentation = 2
) {
    const text = String(value ?? "").trim();

    if (!text) {
        return "";
    }

    if (typeof DOMParser === "undefined") {
        return basicXmlFormat(text, indentation);
    }

    try {
        const parser = new DOMParser();
        const documentNode = parser.parseFromString(
            text,
            "application/xml"
        );

        const parserError =
            documentNode.querySelector("parsererror");

        if (parserError) {
            return basicXmlFormat(text, indentation);
        }

        return serializeXmlNode(
            documentNode.documentElement,
            0,
            indentation
        );
    } catch {
        return basicXmlFormat(text, indentation);
    }
}

/**
 * Basic XML formatter used as a fallback.
 *
 * @param {string} value
 * @param {number} indentation
 * @returns {string}
 */
function basicXmlFormat(
    value,
    indentation = 2
) {
    const spaces = " ".repeat(
        Math.max(0, indentation)
    );

    let formatted = value
        .replace(/>\s*</g, "><")
        .replace(/</g, "~::~<")
        .replace(/\s*xmlns(:\w+)?="[^"]*"/g, "");

    const parts = formatted
        .split("~::~")
        .filter(Boolean);

    let level = 0;
    const output = [];

    parts.forEach((part) => {
        const item = part.trim();

        if (!item) {
            return;
        }

        if (
            /^<\/[^>]+>/.test(item)
        ) {
            level = Math.max(0, level - 1);
        }

        output.push(
            spaces.repeat(level) + item
        );

        if (
            /^<[^!?/][^>]*[^/]?>$/.test(item) &&
            !/<\/[^>]+>$/.test(item)
        ) {
            level += 1;
        }
    });

    return output.join("\n");
}

/**
 * Serialize an XML node for display.
 *
 * @param {Node} node
 * @param {number} level
 * @param {number} indentation
 * @returns {string}
 */
function serializeXmlNode(
    node,
    level,
    indentation
) {
    const indent = " ".repeat(
        level * indentation
    );

    if (
        node.nodeType === Node.TEXT_NODE
    ) {
        return node.nodeValue?.trim() || "";
    }

    if (
        node.nodeType === Node.COMMENT_NODE
    ) {
        return `${indent}<!--${node.nodeValue}-->`;
    }

    if (
        node.nodeType !== Node.ELEMENT_NODE
    ) {
        return "";
    }

    const attributes = Array.from(
        node.attributes || []
    )
        .map(
            (attribute) =>
                ` ${attribute.name}="${escapeXml(
                    attribute.value
                )}"`
        )
        .join("");

    const children = Array.from(
        node.childNodes || []
    ).filter((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            return Boolean(
                child.nodeValue?.trim()
            );
        }

        return true;
    });

    if (!children.length) {
        return `${indent}<${node.tagName}${attributes}/>`;
    }

    const hasOnlyText =
        children.length === 1 &&
        children[0].nodeType === Node.TEXT_NODE;

    if (hasOnlyText) {
        return (
            `${indent}<${node.tagName}${attributes}>` +
            `${escapeXml(children[0].nodeValue || "")}` +
            `</${node.tagName}>`
        );
    }

    const childOutput = children
        .map((child) =>
            serializeXmlNode(
                child,
                level + 1,
                indentation
            )
        )
        .filter(Boolean)
        .join("\n");

    return [
        `${indent}<${node.tagName}${attributes}>`,
        childOutput,
        `${indent}</${node.tagName}>`,
    ].join("\n");
}

/**
 * Escape XML special characters.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeXml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ============================================================
// HTML
// ============================================================

/**
 * Check whether content looks like HTML.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeHtml(value = "") {
    const text = String(value).trim();

    if (!text) {
        return false;
    }

    return (
        /^<!doctype\s+html/i.test(text) ||
        /<html(?:\s[^>]*)?>/i.test(text) ||
        /<(body|head|div|main|section|article|table|form)(?:\s[^>]*)?>/i.test(
            text
        )
    );
}

/**
 * Format HTML for text-based response display.
 *
 * The returned value is escaped and safe to insert as text.
 *
 * @param {string} value
 * @returns {string}
 */
export function formatHtml(value = "") {
    const text = String(value ?? "").trim();

    if (!text) {
        return "";
    }

    return basicHtmlFormat(text);
}

/**
 * Basic HTML formatter.
 *
 * @param {string} value
 * @returns {string}
 */
function basicHtmlFormat(value) {
    return value
        .replace(/>\s+</g, "><")
        .replace(/</g, "\n<")
        .replace(/>/g, ">\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

// ============================================================
// Text Formatting
// ============================================================

/**
 * Normalize line endings.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeText(value = "") {
    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
}

/**
 * Trim trailing whitespace from each line.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cleanText(value = "") {
    return normalizeText(value)
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
}

// ============================================================
// Display Formatting
// ============================================================

/**
 * Format response data for display.
 *
 * @param {Object} options
 * @param {unknown} options.data
 * @param {string} [options.contentType]
 * @param {string} [options.raw]
 * @returns {{format: string, text: string, parsed: unknown|null}}
 */
export function formatResponse({
    data = null,
    contentType = "",
    raw = "",
} = {}) {
    const format = detectResponseFormat(
        contentType,
        data ?? raw
    );

    if (format === FORMAT_TYPES.JSON) {
        const parsed = parseJson(
            data ?? raw
        );

        if (parsed.success) {
            return {
                format,
                text: formatJson(parsed.data),
                parsed: parsed.data,
            };
        }
    }

    if (format === FORMAT_TYPES.XML) {
        return {
            format,
            text: formatXml(
                typeof data === "string"
                    ? data
                    : raw
            ),
            parsed: null,
        };
    }

    if (format === FORMAT_TYPES.HTML) {
        return {
            format,
            text: formatHtml(
                typeof data === "string"
                    ? data
                    : raw
            ),
            parsed: null,
        };
    }

    return {
        format,
        text: normalizeText(
            typeof data === "string"
                ? data
                : data ?? raw ?? ""
        ),
        parsed: null,
    };
}

/**
 * Get a display label for a response format.
 *
 * @param {string} format
 * @returns {string}
 */
export function getFormatLabel(format = "") {
    switch (format) {
        case FORMAT_TYPES.JSON:
            return "JSON";

        case FORMAT_TYPES.XML:
            return "XML";

        case FORMAT_TYPES.HTML:
            return "HTML";

        case FORMAT_TYPES.TEXT:
            return "Text";

        default:
            return "Unknown";
    }
}

// ============================================================
// Safe Display Helpers
// ============================================================

/**
 * Escape HTML so response content can safely be displayed as HTML text.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Convert response content into safe display HTML.
 *
 * No response content is treated as executable markup.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function toSafeHtml(value = "") {
    return escapeHtml(value);
}

// ============================================================
// Metadata Formatting
// ============================================================

/**
 * Format response duration.
 *
 * @param {number} milliseconds
 * @returns {string}
 */
export function formatDuration(milliseconds) {
    if (
        !Number.isFinite(milliseconds) ||
        milliseconds < 0
    ) {
        return "0 ms";
    }

    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)} ms`;
    }

    return `${(milliseconds / 1000).toFixed(2)} s`;
}

/**
 * Format response size.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {
        return "0 B";
    }

    if (bytes < 1024) {
        return `${Math.round(bytes)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
}

/**
 * Format HTTP status.
 *
 * @param {number} status
 * @param {string} statusText
 * @returns {string}
 */
export function formatStatus(
    status,
    statusText = ""
) {
    if (!Number.isFinite(status)) {
        return "";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

/**
 * Get a human-readable status category.
 *
 * @param {number} status
 * @returns {string}
 */
export function getStatusCategory(status) {
    if (
        !Number.isFinite(status)
    ) {
        return "unknown";
    }

    if (status >= 200 && status < 300) {
        return "success";
    }

    if (status >= 300 && status < 400) {
        return "redirect";
    }

    if (status >= 400 && status < 500) {
        return "client-error";
    }

    if (status >= 500 && status < 600) {
        return "server-error";
    }

    return "unknown";
}

// ============================================================
// Utility Helpers
// ============================================================

/**
 * Return a short preview of response data.
 *
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function createPreview(
    value = "",
    maxLength = 120
) {
    const text = normalizeText(
        typeof value === "string"
            ? value
            : stringifyValue(value)
    ).trim();

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

/**
 * Safely stringify any value.
 *
 * @param {unknown} value
 * @returns {string}
 */
function stringifyValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Escape XML attribute/text content.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeXmlAttribute(value) {
    return escapeXml(value);
}

// ============================================================
// Exports
// ============================================================

export {
    FORMAT_TYPES,
};

export default {
    FORMAT_TYPES,
    normalizeContentType,
    detectResponseFormat,
    detectFormatFromContent,
    isJsonContentType,
    isXmlContentType,
    isHtmlContentType,
    isBinaryContentType,
    isValidJson,
    parseJson,
    formatJson,
    minifyJson,
    prettifyJson,
    looksLikeXml,
    formatXml,
    escapeXml,
    looksLikeHtml,
    formatHtml,
    normalizeText,
    cleanText,
    formatResponse,
    getFormatLabel,
    escapeHtml,
    toSafeHtml,
    formatDuration,
    formatSize,
    formatStatus,
    getStatusCategory,
    createPreview,
};