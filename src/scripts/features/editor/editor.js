// src/scripts/features/editor/editor.js

/**
 * Editor Feature
 *
 * Manages an editor content area and its associated controls.
 *
 * Responsibilities:
 * - Initialize the editor UI
 * - Read and write editor content
 * - Handle editor keyboard interactions
 * - Handle formatting
 * - Handle copy and clear actions
 * - Track editor metadata
 * - Track the selected editor language
 *
 * This module does not:
 * - execute HTTP requests
 * - manage application state globally
 * - render API responses
 * - show toast notifications
 * - define editor configuration
 */

import {
    EDITOR_MODES,
    EDITOR_DEFAULTS,
    EDITOR_SELECTORS,
    normalizeEditorMode,
} from "./editor-config.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    editor: null,
    copyButton: null,
    clearButton: null,
    formatButton: null,
    language: null,
    characterCount: null,
    lineCount: null,
};

// ============================================================
// State
// ============================================================

let editorValue = "";
let editorLanguage = EDITOR_MODES.TEXT;
let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the editor.
 *
 * Calling initEditor() more than once is safe. Existing event
 * listeners are not registered repeatedly.
 *
 * @param {Object} [options]
 * @param {string} [options.initialValue]
 * @param {string} [options.mode]
 * @param {string} [options.language]
 * @returns {Object} Editor API
 */
export function initEditor(options = {}) {
    cacheElements();

    if (!initialized) {
        bindEvents();
        initialized = true;
    }

    if (typeof options.initialValue === "string") {
        setEditorValue(options.initialValue);
    } else {
        syncFromUI();
    }

    const requestedLanguage =
        options.language ??
        options.mode ??
        getEditorLanguage();

    setEditorLanguage(requestedLanguage);

    updateEditorMeta();

    return createEditorApi();
}

/**
 * Create the public editor API.
 *
 * @returns {Object}
 */
function createEditorApi() {
    return {
        getValue,
        setValue: setEditorValue,
        clear: clearEditor,
        format: formatEditor,
        copy: copyEditorContent,
        focus: focusEditor,
        syncFromUI,
        syncToUI,
        isEmpty: isEditorEmpty,
        getStats: getEditorStats,
        setLanguage: setEditorLanguage,
        getLanguage: getEditorLanguage,
        isInitialized: isEditorInitialized,
    };
}

// ============================================================
// DOM
// ============================================================

/**
 * Cache editor-related DOM elements.
 */
function cacheElements() {
    elements.editor = findElement(
        EDITOR_SELECTORS.requestEditor,
        EDITOR_SELECTORS.requestBody,
        "[data-editor]",
    );

    elements.copyButton = findElement(
        "#editor-copy",
        "[data-editor-copy]",
    );

    elements.clearButton = findElement(
        "#editor-clear",
        "[data-editor-clear]",
    );

    elements.formatButton = findElement(
        "#editor-format",
        "[data-editor-format]",
    );

    elements.language = findElement(
        "#editor-language",
        "[data-editor-language]",
    );

    elements.characterCount = findElement(
        "#editor-character-count",
        "[data-editor-character-count]",
    );

    elements.lineCount = findElement(
        "#editor-line-count",
        "[data-editor-line-count]",
    );
}

/**
 * Find the first matching element.
 *
 * @param {...string} selectors
 * @returns {Element|null}
 */
function findElement(...selectors) {
    for (const selector of selectors) {
        if (!selector) {
            continue;
        }

        const element = document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}

// ============================================================
// Events
// ============================================================

/**
 * Bind editor events.
 */
function bindEvents() {
    if (elements.editor) {
        elements.editor.addEventListener(
            "input",
            handleEditorInput,
        );

        elements.editor.addEventListener(
            "keydown",
            handleEditorKeydown,
        );
    }

    if (elements.copyButton) {
        elements.copyButton.addEventListener(
            "click",
            handleCopy,
        );
    }

    if (elements.clearButton) {
        elements.clearButton.addEventListener(
            "click",
            handleClear,
        );
    }

    if (elements.formatButton) {
        elements.formatButton.addEventListener(
            "click",
            handleFormat,
        );
    }
}

/**
 * Handle editor input.
 *
 * @param {Event} event
 */
function handleEditorInput(event) {
    editorValue = getElementValue(event.target);
    updateEditorMeta();
}

/**
 * Handle editor keyboard shortcuts.
 *
 * @param {KeyboardEvent} event
 */
function handleEditorKeydown(event) {
    const modifierPressed = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifierPressed && key === "s") {
        event.preventDefault();
        return;
    }

    if (
        modifierPressed &&
        event.shiftKey &&
        key === "f"
    ) {
        event.preventDefault();
        formatEditor();
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        insertAtCursor(" ".repeat(
            Number.isInteger(EDITOR_DEFAULTS.indentUnit)
                ? EDITOR_DEFAULTS.indentUnit
                : 2,
        ));
    }
}

/**
 * Handle copy action.
 */
function handleCopy() {
    void copyEditorContent();
}

/**
 * Handle clear action.
 */
function handleClear() {
    clearEditor();
}

/**
 * Handle format action.
 */
function handleFormat() {
    formatEditor();
}

// ============================================================
// Value Access
// ============================================================

/**
 * Get the current editor value.
 *
 * @returns {string}
 */
export function getValue() {
    if (elements.editor) {
        editorValue = getElementValue(elements.editor);
    }

    return editorValue;
}

/**
 * Set the editor value.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function setEditorValue(value = "") {
    editorValue = String(value ?? "");

    syncToUI();

    return editorValue;
}

/**
 * Read a value from an input, textarea, or contenteditable element.
 *
 * @param {Element|null} element
 * @returns {string}
 */
function getElementValue(element) {
    if (!element) {
        return "";
    }

    if (
        "value" in element &&
        typeof element.value === "string"
    ) {
        return element.value;
    }

    return element.textContent || "";
}

// ============================================================
// Synchronization
// ============================================================

/**
 * Synchronize editor state from the DOM.
 *
 * @returns {string}
 */
export function syncFromUI() {
    if (elements.editor) {
        editorValue = getElementValue(elements.editor);
    }

    updateEditorMeta();

    return editorValue;
}

/**
 * Synchronize editor state into the DOM.
 *
 * @returns {string}
 */
export function syncToUI() {
    if (!elements.editor) {
        updateEditorMeta();
        return editorValue;
    }

    if (
        "value" in elements.editor &&
        typeof elements.editor.value === "string"
    ) {
        elements.editor.value = editorValue;
    } else {
        elements.editor.textContent = editorValue;
    }

    updateEditorMeta();

    return editorValue;
}

// ============================================================
// Formatting
// ============================================================

/**
 * Format the current editor content.
 *
 * JSON is formatted when valid JSON is detected.
 * Other content is normalized only for line endings and trailing
 * whitespace. The original content is otherwise preserved.
 *
 * @returns {string}
 */
export function formatEditor() {
    const value = getValue();

    if (!value.trim()) {
        return value;
    }

    const formatted = formatContent(
        value,
        editorLanguage,
    );

    if (formatted !== value) {
        setEditorValue(formatted);
    }

    return editorValue;
}

/**
 * Format supported editor content.
 *
 * @param {string} value
 * @param {string} mode
 * @returns {string}
 */
function formatContent(value, mode) {
    if (mode === EDITOR_MODES.JSON || looksLikeJson(value)) {
        try {
            const parsed = JSON.parse(value);

            return JSON.stringify(
                parsed,
                null,
                EDITOR_DEFAULTS.indentUnit,
            );
        } catch {
            // Preserve invalid JSON rather than damaging it.
        }
    }

    return normalizeLineEndings(value);
}

/**
 * Normalize line endings and remove trailing whitespace.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeLineEndings(value) {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n");
}

/**
 * Determine whether a string contains valid JSON.
 *
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeJson(value) {
    const trimmed = value.trim();

    if (!trimmed) {
        return false;
    }

    if (
        !trimmed.startsWith("{") &&
        !trimmed.startsWith("[")
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
// Editing
// ============================================================

/**
 * Insert text at the current cursor position.
 *
 * @param {string} text
 */
function insertAtCursor(text) {
    if (!elements.editor) {
        return;
    }

    const element = elements.editor;

    if (
        typeof element.selectionStart === "number" &&
        typeof element.selectionEnd === "number"
    ) {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const value = getElementValue(element);

        const nextValue =
            value.slice(0, start) +
            text +
            value.slice(end);

        editorValue = nextValue;

        if (
            "value" in element &&
            typeof element.value === "string"
        ) {
            element.value = nextValue;
        } else {
            element.textContent = nextValue;
        }

        const cursorPosition = start + text.length;

        if (
            typeof element.setSelectionRange ===
            "function"
        ) {
            element.setSelectionRange(
                cursorPosition,
                cursorPosition,
            );
        }

        updateEditorMeta();

        return;
    }

    editorValue += text;
    syncToUI();
}

/**
 * Focus the editor.
 *
 * @returns {boolean}
 */
export function focusEditor() {
    if (
        !elements.editor ||
        typeof elements.editor.focus !== "function"
    ) {
        return false;
    }

    elements.editor.focus();

    return true;
}

// ============================================================
// Clipboard
// ============================================================

/**
 * Copy editor content to the clipboard.
 *
 * @returns {Promise<boolean>}
 */
export async function copyEditorContent() {
    const value = getValue();

    if (!value) {
        return false;
    }

    if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
    ) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            // Use the fallback below.
        }
    }

    return copyWithFallback(value);
}

/**
 * Copy text using the legacy clipboard API.
 *
 * @param {string} value
 * @returns {boolean}
 */
function copyWithFallback(value) {
    if (!document.body) {
        return false;
    }

    const textarea = document.createElement("textarea");

    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");

    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    if (
        typeof textarea.setSelectionRange ===
        "function"
    ) {
        textarea.setSelectionRange(
            0,
            textarea.value.length,
        );
    }

    let copied = false;

    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    }

    textarea.remove();

    return copied;
}

// ============================================================
// Clear
// ============================================================

/**
 * Clear the editor.
 *
 * @returns {string}
 */
export function clearEditor() {
    return setEditorValue("");
}

/**
 * Determine whether the editor is empty.
 *
 * @returns {boolean}
 */
export function isEditorEmpty() {
    return !getValue().trim();
}

// ============================================================
// Metadata
// ============================================================

/**
 * Update editor character and line counters.
 */
function updateEditorMeta() {
    const value = editorValue;

    if (elements.characterCount) {
        elements.characterCount.textContent =
            String(value.length);
    }

    if (elements.lineCount) {
        elements.lineCount.textContent =
            String(value ? value.split("\n").length : 0);
    }
}

/**
 * Get editor statistics.
 *
 * @returns {{
 *   characters: number,
 *   lines: number,
 *   words: number
 * }}
 */
export function getEditorStats() {
    const value = getValue();
    const trimmed = value.trim();

    return {
        characters: value.length,
        lines: value ? value.split("\n").length : 0,
        words: trimmed
            ? trimmed.split(/\s+/).length
            : 0,
    };
}

// ============================================================
// Language
// ============================================================

/**
 * Set the editor language/mode.
 *
 * @param {string} language
 * @returns {string}
 */
export function setEditorLanguage(
    language = EDITOR_MODES.TEXT,
) {
    const normalized = normalizeEditorMode(language);

    editorLanguage = normalized;

    if (elements.language) {
        setElementValue(
            elements.language,
            normalized,
        );
    }

    if (elements.editor) {
        elements.editor.dataset.language = normalized;
        elements.editor.dataset.mode = normalized;
    }

    return normalized;
}

/**
 * Get the current editor language/mode.
 *
 * @returns {string}
 */
export function getEditorLanguage() {
    return editorLanguage;
}

/**
 * Set the value of a DOM element.
 *
 * @param {Element} element
 * @param {string} value
 */
function setElementValue(element, value) {
    if (
        "value" in element &&
        typeof element.value === "string"
    ) {
        element.value = value;
        return;
    }

    element.textContent = value;
}

// ============================================================
// Initialization State
// ============================================================

/**
 * Check whether the editor has been initialized.
 *
 * @returns {boolean}
 */
export function isEditorInitialized() {
    return initialized;
}

// ============================================================
// Default Export
// ============================================================

export default {
    initEditor,
    getValue,
    setEditorValue,
    syncFromUI,
    syncToUI,
    formatEditor,
    copyEditorContent,
    clearEditor,
    isEditorEmpty,
    focusEditor,
    getEditorStats,
    setEditorLanguage,
    getEditorLanguage,
    isEditorInitialized,
};