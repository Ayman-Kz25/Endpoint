// src/scripts/utils/clipboard.js

/**
 * Clipboard utilities.
 *
 * Provides safe browser clipboard operations with a fallback for
 * environments where the Clipboard API is unavailable.
 */

// ============================================================
// Constants
// ============================================================

const COPY_FEEDBACK_DURATION = 1500;

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Check whether the modern Clipboard API is available.
 *
 * @returns {boolean}
 */
function hasClipboardApi() {
    return (
        typeof navigator !== "undefined" &&
        Boolean(navigator.clipboard) &&
        typeof navigator.clipboard.writeText === "function"
    );
}

/**
 * Check whether a value can be converted into clipboard text.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isClipboardValue(value) {
    return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    );
}

/**
 * Convert a supported value into text.
 *
 * @param {*} value
 * @returns {string}
 */
function toClipboardText(value) {
    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    return "";
}

// ============================================================
// Write
// ============================================================

/**
 * Copy text to the clipboard.
 *
 * Uses navigator.clipboard when available and falls back to
 * document.execCommand("copy") for older browsers.
 *
 * @param {*} value
 * @returns {Promise<boolean>}
 */
export async function copyText(value) {
    if (!isClipboardValue(value)) {
        return false;
    }

    const text = toClipboardText(value);

    if (!text) {
        return false;
    }

    if (hasClipboardApi()) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to the legacy implementation.
        }
    }

    return copyTextFallback(text);
}

/**
 * Legacy clipboard fallback.
 *
 * @param {string} text
 * @returns {boolean}
 */
function copyTextFallback(text) {
    if (
        typeof document === "undefined" ||
        !document.body
    ) {
        return false;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;

    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");

    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    let copied = false;

    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    }

    textarea.remove();

    return copied;
}

/**
 * Copy the text content of a DOM element.
 *
 * @param {Element|string} elementOrSelector
 * @returns {Promise<boolean>}
 */
export async function copyElementText(
    elementOrSelector
) {
    const element = resolveElement(
        elementOrSelector
    );

    if (!element) {
        return false;
    }

    return copyText(
        element.textContent || ""
    );
}

/**
 * Copy the value of an input or textarea.
 *
 * @param {Element|string} elementOrSelector
 * @returns {Promise<boolean>}
 */
export async function copyInputValue(
    elementOrSelector
) {
    const element = resolveElement(
        elementOrSelector
    );

    if (!element || !("value" in element)) {
        return false;
    }

    return copyText(element.value);
}

// ============================================================
// Read
// ============================================================

/**
 * Read text from the clipboard.
 *
 * @returns {Promise<string|null>}
 */
export async function readText() {
    if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.readText !== "function"
    ) {
        return null;
    }

    try {
        return await navigator.clipboard.readText();
    } catch {
        return null;
    }
}

// ============================================================
// DOM Helpers
// ============================================================

/**
 * Resolve a DOM element or selector.
 *
 * @param {Element|string} elementOrSelector
 * @returns {Element|null}
 */
function resolveElement(elementOrSelector) {
    if (
        typeof Element !== "undefined" &&
        elementOrSelector instanceof Element
    ) {
        return elementOrSelector;
    }

    if (
        typeof elementOrSelector !== "string" ||
        typeof document === "undefined"
    ) {
        return null;
    }

    try {
        return document.querySelector(
            elementOrSelector
        );
    } catch {
        return null;
    }
}

// ============================================================
// Button Feedback
// ============================================================

/**
 * Copy text and temporarily update a button's content.
 *
 * Useful for buttons such as:
 *
 *     #copy-response-button
 *
 * The button's original HTML and accessible label are restored
 * automatically.
 *
 * @param {*} value
 * @param {Element|string} buttonOrSelector
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export async function copyWithButtonFeedback(
    value,
    buttonOrSelector,
    options = {}
) {
    const button = resolveElement(
        buttonOrSelector
    );

    if (!button) {
        return copyText(value);
    }

    const {
        successText = "Copied",
        failureText = "Copy failed",
        duration = COPY_FEEDBACK_DURATION,
    } = options;

    const originalHtml = button.innerHTML;
    const originalAriaLabel =
        button.getAttribute("aria-label");
    const originalTitle =
        button.getAttribute("title");

    const copied = await copyText(value);

    if (copied) {
        button.innerHTML = successText;
        button.setAttribute(
            "aria-label",
            successText
        );
        button.setAttribute(
            "title",
            successText
        );
    } else {
        button.innerHTML = failureText;
        button.setAttribute(
            "aria-label",
            failureText
        );
        button.setAttribute(
            "title",
            failureText
        );
    }

    window.setTimeout(() => {
        button.innerHTML = originalHtml;

        restoreAttribute(
            button,
            "aria-label",
            originalAriaLabel
        );

        restoreAttribute(
            button,
            "title",
            originalTitle
        );
    }, duration);

    return copied;
}

/**
 * Restore an element attribute.
 *
 * @param {Element} element
 * @param {string} attribute
 * @param {string|null} value
 */
function restoreAttribute(
    element,
    attribute,
    value
) {
    if (value === null) {
        element.removeAttribute(attribute);
        return;
    }

    element.setAttribute(
        attribute,
        value
    );
}

// ============================================================
// Response Viewer Helper
// ============================================================

/**
 * Copy response text and update the response copy button.
 *
 * Matches the HTML supplied for the response viewer:
 *
 *     #response-raw
 *     #copy-response-button
 *
 * @param {string} responseText
 * @returns {Promise<boolean>}
 */
export async function copyResponse(
    responseText
) {
    return copyWithButtonFeedback(
        responseText,
        "#copy-response-button",
        {
            successText: "Copied",
            failureText: "Failed",
        }
    );
}

// ============================================================
// Code Generator Helper
// ============================================================

/**
 * Copy generated code and update a supplied button.
 *
 * @param {string} code
 * @param {Element|string} buttonOrSelector
 * @returns {Promise<boolean>}
 */
export async function copyGeneratedCode(
    code,
    buttonOrSelector
) {
    return copyWithButtonFeedback(
        code,
        buttonOrSelector,
        {
            successText: "Copied",
            failureText: "Failed",
        }
    );
}

// ============================================================
// Capability
// ============================================================

/**
 * Check whether clipboard write functionality is available.
 *
 * @returns {boolean}
 */
export function canWriteClipboard() {
    return hasClipboardApi() || (
        typeof document !== "undefined" &&
        typeof document.execCommand === "function"
    );
}

/**
 * Check whether clipboard read functionality is available.
 *
 * @returns {boolean}
 */
export function canReadClipboard() {
    return (
        typeof navigator !== "undefined" &&
        Boolean(navigator.clipboard) &&
        typeof navigator.clipboard.readText === "function"
    );
}

// ============================================================
// Default Export
// ============================================================

export default {
    copyText,
    copyElementText,
    copyInputValue,
    copyResponse,
    copyGeneratedCode,
    copyWithButtonFeedback,

    readText,

    canWriteClipboard,
    canReadClipboard,
};