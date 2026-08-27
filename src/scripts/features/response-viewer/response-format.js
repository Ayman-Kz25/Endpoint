// src/scripts/features/response-viewer/response-format.js

import { RESPONSE_FORMAT } from "../../core/constants.js";

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

export function normalizeContentType(contentType = "") {
    return String(contentType)
        .split(";")[0]
        .trim()
        .toLowerCase();
}

export function detectResponseFormat(
    contentType = "",
    data = ""
) {
    const type = normalizeContentType(contentType);

    if (JSON_CONTENT_TYPES.includes(type)) {
        return RESPONSE_FORMAT.JSON;
    }

    if (XML_CONTENT_TYPES.includes(type)) {
        return RESPONSE_FORMAT.XML;
    }

    if (HTML_CONTENT_TYPES.includes(type)) {
        return RESPONSE_FORMAT.HTML;
    }

    if (isBinaryContentType(type)) {
        return RESPONSE_FORMAT.UNKNOWN;
    }

    return detectFormatFromContent(data);
}

export function detectFormatFromContent(data = "") {
    if (data !== null && typeof data === "object") {
        return RESPONSE_FORMAT.JSON;
    }

    const text = String(data ?? "").trim();

    if (!text) {
        return RESPONSE_FORMAT.TEXT;
    }

    if (isValidJson(text)) {
        return RESPONSE_FORMAT.JSON;
    }

    if (looksLikeXml(text)) {
        return RESPONSE_FORMAT.XML;
    }

    if (looksLikeHtml(text)) {
        return RESPONSE_FORMAT.HTML;
    }

    return RESPONSE_FORMAT.TEXT;
}

export function isJsonContentType(contentType = "") {
    return JSON_CONTENT_TYPES.includes(
        normalizeContentType(contentType)
    );
}

export function isXmlContentType(contentType = "") {
    return XML_CONTENT_TYPES.includes(
        normalizeContentType(contentType)
    );
}

export function isHtmlContentType(contentType = "") {
    return HTML_CONTENT_TYPES.includes(
        normalizeContentType(contentType)
    );
}

export function isBinaryContentType(contentType = "") {
    const type = normalizeContentType(contentType);

    return BINARY_CONTENT_TYPES.some((value) =>
        type.startsWith(value)
    );
}

export function isValidJson(value) {
    if (typeof value !== "string") {
        return false;
    }

    const text = value.trim();

    if (!text) {
        return false;
    }

    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

export function parseJson(value) {
    if (value === null || value === undefined || value === "") {
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

export function prettifyJson(value = "") {
    return formatJson(value, 2);
}

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

export function formatXml(value = "", indentation = 2) {
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

        if (documentNode.querySelector("parsererror")) {
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

function basicXmlFormat(value, indentation = 2) {
    const spaces = " ".repeat(
        Math.max(0, indentation)
    );

    const parts = value
        .replace(/>\s*</g, "><")
        .replace(/</g, "~::~<")
        .split("~::~")
        .filter(Boolean);

    let level = 0;
    const output = [];

    parts.forEach((part) => {
        const item = part.trim();

        if (!item) {
            return;
        }

        if (/^<\/[^>]+>/.test(item)) {
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

function serializeXmlNode(node, level, indentation) {
    const indent = " ".repeat(
        level * indentation
    );

    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue?.trim() || "";
    }

    if (node.nodeType === Node.COMMENT_NODE) {
        return `${indent}<!--${node.nodeValue}-->`;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
    }

    const attributes = Array.from(node.attributes || [])
        .map(
            (attribute) =>
                ` ${attribute.name}="${escapeXml(attribute.value)}"`
        )
        .join("");

    const children = Array.from(node.childNodes || [])
        .filter((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                return Boolean(child.nodeValue?.trim());
            }

            return true;
        });

    if (!children.length) {
        return `${indent}<${node.tagName}${attributes}/>`;
    }

    if (
        children.length === 1 &&
        children[0].nodeType === Node.TEXT_NODE
    ) {
        return (
            `${indent}<${node.tagName}${attributes}>` +
            escapeXml(children[0].nodeValue || "") +
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

export function escapeXml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

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

export function formatHtml(value = "") {
    const text = String(value ?? "").trim();

    if (!text) {
        return "";
    }

    return text
        .replace(/>\s+</g, "><")
        .replace(/</g, "\n<")
        .replace(/>/g, ">\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

export function normalizeText(value = "") {
    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
}

export function cleanText(value = "") {
    return normalizeText(value)
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
}

export function formatResponse({
    data = null,
    contentType = "",
    raw = "",
} = {}) {
    const value = data ?? raw;
    const format = detectResponseFormat(
        contentType,
        value
    );

    if (format === RESPONSE_FORMAT.JSON) {
        const parsed = parseJson(value);

        if (parsed.success) {
            return {
                format,
                text: formatJson(parsed.data),
                parsed: parsed.data,
            };
        }
    }

    if (format === RESPONSE_FORMAT.XML) {
        return {
            format,
            text: formatXml(
                typeof value === "string" ? value : raw
            ),
            parsed: null,
        };
    }

    if (format === RESPONSE_FORMAT.HTML) {
        return {
            format,
            text: formatHtml(
                typeof value === "string" ? value : raw
            ),
            parsed: null,
        };
    }

    return {
        format,
        text: normalizeText(
            typeof value === "string"
                ? value
                : value ?? ""
        ),
        parsed: null,
    };
}

export function getFormatLabel(format = "") {
    switch (format) {
        case RESPONSE_FORMAT.JSON:
            return "JSON";

        case RESPONSE_FORMAT.XML:
            return "XML";

        case RESPONSE_FORMAT.HTML:
            return "HTML";

        case RESPONSE_FORMAT.TEXT:
            return "Text";

        default:
            return "Unknown";
    }
}

export function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function toSafeHtml(value = "") {
    return escapeHtml(value);
}

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
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
}

export function formatStatus(status, statusText = "") {
    if (!Number.isFinite(status)) {
        return "";
    }

    return statusText
        ? `${status} ${statusText}`
        : String(status);
}

export function getStatusCategory(status) {
    if (!Number.isFinite(status)) {
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

export function createPreview(value = "", maxLength = 120) {
    const text = normalizeText(
        typeof value === "string"
            ? value
            : stringifyValue(value)
    ).trim();

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(
        0,
        Math.max(0, maxLength - 3)
    )}...`;
}

function stringifyValue(value) {
    if (value === null || value === undefined) {
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

export default {
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