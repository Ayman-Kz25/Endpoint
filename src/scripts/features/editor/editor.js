// src/scripts/features/editor/editor.js

/**
 * Editor Feature
 *
 * Manages editable code/content areas used by the application.
 *
 * Responsibilities:
 * - Initialize editor controls
 * - Read and write editor content
 * - Handle formatting
 * - Handle copy and clear actions
 * - Keep editor UI synchronized
 *
 * This module does not:
 * - execute HTTP requests
 * - manage application state globally
 * - render API responses
 * - show toast notifications
 */

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
let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the editor.
 *
 * @param {Object} [options]
 * @param {string} [options.initialValue=""]
 * @returns {Object} Editor API
 */
export function initEditor(options = {}) {
    cacheElements();
    bindEvents();

    initialized = true;

    if (typeof options.initialValue === "string") {
        setEditorValue(options.initialValue);
    } else {
        syncFromUI();
        updateEditorMeta();
    }

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
    };
}

// ============================================================
// DOM
// ============================================================

/**
 * Cache editor DOM elements.
 */
function cacheElements() {
    elements.editor =
        document.getElementById("code-editor") ||
        document.querySelector("[data-editor]");

    elements.copyButton =
        document.getElementById("editor-copy") ||
        document.querySelector("[data-editor-copy]");

    elements.clearButton =
        document.getElementById("editor-clear") ||
        document.querySelector("[data-editor-clear]");

    elements.formatButton =
        document.getElementById("editor-format") ||
        document.querySelector("[data-editor-format]");

    elements.language =
        document.getElementById("editor-language") ||
        document.querySelector("[data-editor-language]");

    elements.characterCount =
        document.getElementById("editor-character-count") ||
        document.querySelector("[data-editor-character-count]");

    elements.lineCount =
        document.getElementById("editor-line-count") ||
        document.querySelector("[data-editor-line-count]");
}

/**
 * Bind editor events.
 */
function bindEvents() {
    if (!elements.editor) {
        return;
    }

    elements.editor.addEventListener("input", handleEditorInput);

    elements.editor.addEventListener("keydown", handleEditorKeydown);

    elements.editor.addEventListener("paste", () => {
        requestAnimationFrame(() => {
            syncFromUI();
            updateEditorMeta();
        });
    });

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

// ============================================================
// Event Handlers
// ============================================================

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
    if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
    ) {
        event.preventDefault();
        return;
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "f"
    ) {
        event.preventDefault();
        formatEditor();
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();

        insertAtCursor("    ");
    }
}

/**
 * Handle copy button.
 */
function handleCopy() {
    copyEditorContent();
}

/**
 * Handle clear button.
 */
function handleClear() {
    clearEditor();
}

/**
 * Handle format button.
 */
function handleFormat() {
    formatEditor();
}

// ============================================================
// Value Access
// ============================================================

/**
 * Read the current editor value.
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
 * Set editor value.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function setEditorValue(value = "") {
    editorValue = String(value ?? "");

    syncToUI();
    updateEditorMeta();

    return editorValue;
}

/**
 * Read a value from an input, textarea, or contenteditable element.
 *
 * @param {HTMLElement} element
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
 * Synchronize the editor value from the UI.
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
 * Synchronize the editor value into the UI.
 *
 * @returns {string}
 */
export function syncToUI() {
    if (!elements.editor) {
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
 * The formatter detects JSON automatically. Non-JSON content
 * is returned unchanged after basic whitespace normalization.
 *
 * @returns {string}
 */
export function formatEditor() {
    const value = getValue();

    if (!value.trim()) {
        return "";
    }

    const formatted = formatContent(value);

    if (formatted !== value) {
        editorValue = formatted;
        syncToUI();
    }

    return editorValue;
}

/**
 * Format supported content.
 *
 * @param {string} value
 * @returns {string}
 */
function formatContent(value) {
    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    try {
        const parsed = JSON.parse(trimmed);

        return JSON.stringify(parsed, null, 2);
    } catch {
        return formatJavaScriptLikeContent(value);
    }
}

/**
 * Apply lightweight formatting to JavaScript-like code.
 *
 * This intentionally avoids aggressive source rewriting.
 *
 * @param {string} value
 * @returns {string}
 */
function formatJavaScriptLikeContent(value) {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n")
        .trim();
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

        if ("value" in element) {
            element.value = nextValue;
        } else {
            element.textContent = nextValue;
        }

        const cursorPosition = start + text.length;

        if (typeof element.setSelectionRange === "function") {
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
    if (!elements.editor) {
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

    try {
        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
        ) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Fall back to the legacy clipboard implementation.
    }

    return copyWithFallback(value);
}

/**
 * Copy text using a temporary textarea.
 *
 * @param {string} value
 * @returns {boolean}
 */
function copyWithFallback(value) {
    const textarea = document.createElement("textarea");

    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

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
    editorValue = "";

    syncToUI();
    updateEditorMeta();

    return editorValue;
}

/**
 * Check whether the editor is empty.
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
 * Update character and line counters.
 */
function updateEditorMeta() {
    const value = editorValue;

    if (elements.characterCount) {
        elements.characterCount.textContent =
            String(value.length);
    }

    if (elements.lineCount) {
        const lines = value
            ? value.split("\n").length
            : 0;

        elements.lineCount.textContent = String(lines);
    }
}

/**
 * Get editor metadata.
 *
 * @returns {{ characters: number, lines: number, words: number }}
 */
export function getEditorStats() {
    const value = getValue();

    const words = value.trim()
        ? value.trim().split(/\s+/).length
        : 0;

    return {
        characters: value.length,
        lines: value ? value.split("\n").length : 0,
        words,
    };
}

// ============================================================
// Language
// ============================================================

/**
 * Set the editor language label.
 *
 * @param {string} language
 * @returns {string}
 */
export function setEditorLanguage(language = "javascript") {
    const normalized = String(language || "javascript").trim();

    if (elements.language) {
        if (
            "value" in elements.language &&
            typeof elements.language.value === "string"
        ) {
            elements.language.value = normalized;
        } else {
            elements.language.textContent = normalized;
        }
    }

    if (elements.editor) {
        elements.editor.dataset.language = normalized;
    }

    return normalized;
}

/**
 * Get the current editor language.
 *
 * @returns {string}
 */
export function getEditorLanguage() {
    if (elements.language) {
        return getElementValue(elements.language) || "javascript";
    }

    return elements.editor?.dataset?.language || "javascript";
}

// ============================================================
// Public API
// ============================================================

/**
 * Check whether the editor has been initialized.
 *
 * @returns {boolean}
 */
export function isEditorInitialized() {
    return initialized;
}

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