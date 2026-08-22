// src/scripts/features/editor/json-editor.js

/**
 * JSON Editor
 *
 * CodeMirror 6 editor used for JSON request bodies.
 *
 * Responsibilities:
 * - Create and manage a CodeMirror 6 editor instance
 * - Configure JSON syntax highlighting
 * - Read and update editor content
 * - Validate JSON
 * - Format JSON
 * - Expose a small API for the request-builder/editor layer
 *
 * This module does not:
 * - execute HTTP requests
 * - update application state directly
 * - render responses
 * - show notifications
 */

import { EditorState } from "@codemirror/state";
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

// ============================================================
// Constants
// ============================================================

const DEFAULT_VALUE = "";

const DEFAULT_OPTIONS = Object.freeze({
    tabSize: 2,
    lineNumbers: true,
    lineWrapping: true,
    readOnly: false,
    autofocus: false,
    placeholder: "Enter JSON...",
});

// ============================================================
// Internal State
// ============================================================

let editorView = null;
let editorParent = null;

// ============================================================
// Helpers
// ============================================================

/**
 * Normalize editor options.
 *
 * @param {Object} options
 * @returns {Object}
 */
function normalizeOptions(options = {}) {
    return {
        ...DEFAULT_OPTIONS,
        ...options,
        tabSize:
            Number.isInteger(options.tabSize) && options.tabSize > 0
                ? options.tabSize
                : DEFAULT_OPTIONS.tabSize,
        lineNumbers:
            options.lineNumbers !== undefined
                ? Boolean(options.lineNumbers)
                : DEFAULT_OPTIONS.lineNumbers,
        lineWrapping:
            options.lineWrapping !== undefined
                ? Boolean(options.lineWrapping)
                : DEFAULT_OPTIONS.lineWrapping,
        readOnly:
            options.readOnly !== undefined
                ? Boolean(options.readOnly)
                : DEFAULT_OPTIONS.readOnly,
        autofocus:
            options.autofocus !== undefined
                ? Boolean(options.autofocus)
                : DEFAULT_OPTIONS.autofocus,
    };
}

/**
 * Resolve a DOM element from either an element or selector.
 *
 * @param {HTMLElement|string} target
 * @returns {HTMLElement|null}
 */
function resolveParent(target) {
    if (!target) {
        return null;
    }

    if (typeof target === "string") {
        return document.querySelector(target);
    }

    if (target instanceof HTMLElement) {
        return target;
    }

    return null;
}

/**
 * Create the editor extensions.
 *
 * @param {Object} options
 * @returns {Array}
 */
function createExtensions(options) {
    const extensions = [
        json(),

        oneDark,

        keymap.of([
            ...defaultKeymap,
            indentWithTab,
        ]),

        indentUnit.of(" ".repeat(options.tabSize)),

        highlightActiveLine,

        EditorView.theme({
            "&": {
                height: "100%",
                fontSize: "13px",
            },

            ".cm-scroller": {
                overflow: "auto",
                fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },

            ".cm-content": {
                minHeight: "100%",
                padding: "12px 0",
            },

            ".cm-line": {
                padding: "0 12px",
            },

            ".cm-gutters": {
                minHeight: "100%",
            },

            ".cm-focused": {
                outline: "none",
            },
        }),

        EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
                return;
            }

            dispatchEditorEvent("change", {
                value: update.state.doc.toString(),
            });
        }),
    ];

    if (options.lineNumbers) {
        extensions.push(lineNumbers());
    }

    if (options.lineWrapping) {
        extensions.push(EditorView.lineWrapping);
    }

    if (options.readOnly) {
        extensions.push(EditorState.readOnly.of(true));
    }

    if (options.placeholder) {
        extensions.push(
            EditorView.contentAttributes.of({
                "data-placeholder": options.placeholder,
            }),
        );

        extensions.push(
            EditorView.theme({
                ".cm-content:empty:before": {
                    content: `attr(data-placeholder)`,
                    opacity: "0.45",
                    pointerEvents: "none",
                },
            }),
        );
    }

    return extensions;
}

/**
 * Dispatch a custom event from the editor host.
 *
 * @param {string} type
 * @param {Object} detail
 */
function dispatchEditorEvent(type, detail = {}) {
    if (!editorParent) {
        return;
    }

    editorParent.dispatchEvent(
        new CustomEvent(`json-editor:${type}`, {
            bubbles: true,
            detail,
        }),
    );
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize a CodeMirror JSON editor.
 *
 * @param {HTMLElement|string} target
 * @param {Object} options
 * @returns {EditorView|null}
 */
export function initJsonEditor(
    target,
    options = {},
) {
    destroyJsonEditor();

    const parent = resolveParent(target);

    if (!parent) {
        return null;
    }

    const normalizedOptions = normalizeOptions(options);

    const initialValue =
        typeof options.value === "string"
            ? options.value
            : DEFAULT_VALUE;

    editorParent = parent;

    const state = EditorState.create({
        doc: initialValue,
        extensions: createExtensions(normalizedOptions),
    });

    editorView = new EditorView({
        state,
        parent,
    });

    if (normalizedOptions.autofocus) {
        focusJsonEditor();
    }

    dispatchEditorEvent("ready", {
        value: initialValue,
    });

    return editorView;
}

// ============================================================
// Instance Access
// ============================================================

/**
 * Get the current CodeMirror editor instance.
 *
 * @returns {EditorView|null}
 */
export function getJsonEditor() {
    return editorView;
}

/**
 * Check whether the editor has been initialized.
 *
 * @returns {boolean}
 */
export function hasJsonEditor() {
    return Boolean(editorView);
}

// ============================================================
// Value Access
// ============================================================

/**
 * Get the current editor value.
 *
 * @returns {string}
 */
export function getJsonValue() {
    if (!editorView) {
        return "";
    }

    return editorView.state.doc.toString();
}

/**
 * Set the editor value.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function setJsonValue(value = "") {
    if (!editorView) {
        return false;
    }

    const nextValue =
        value === null || value === undefined
            ? ""
            : String(value);

    const currentValue = getJsonValue();

    if (currentValue === nextValue) {
        return true;
    }

    editorView.dispatch({
        changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: nextValue,
        },
    });

    return true;
}

/**
 * Clear the editor.
 *
 * @returns {boolean}
 */
export function clearJsonEditor() {
    return setJsonValue("");
}

// ============================================================
// Focus
// ============================================================

/**
 * Focus the editor.
 *
 * @returns {boolean}
 */
export function focusJsonEditor() {
    if (!editorView) {
        return false;
    }

    editorView.focus();
    return true;
}

/**
 * Check whether the editor currently has focus.
 *
 * @returns {boolean}
 */
export function isJsonEditorFocused() {
    if (!editorView) {
        return false;
    }

    return editorView.hasFocus;
}

// ============================================================
// JSON Validation
// ============================================================

/**
 * Validate the current editor content as JSON.
 *
 * @param {string} [value]
 * @returns {{
 *     valid: boolean,
 *     value: unknown,
 *     error: Error|null
 * }}
 */
export function validateJson(value = getJsonValue()) {
    const source =
        value === null || value === undefined
            ? ""
            : String(value);

    if (!source.trim()) {
        return {
            valid: true,
            value: null,
            error: null,
        };
    }

    try {
        return {
            valid: true,
            value: JSON.parse(source),
            error: null,
        };
    } catch (error) {
        return {
            valid: false,
            value: null,
            error:
                error instanceof Error
                    ? error
                    : new Error("Invalid JSON."),
        };
    }
}

/**
 * Check whether the current editor value contains valid JSON.
 *
 * @returns {boolean}
 */
export function isValidJson() {
    return validateJson().valid;
}

// ============================================================
// JSON Formatting
// ============================================================

/**
 * Format a JSON string.
 *
 * @param {string} value
 * @param {number} [indent=2]
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function formatJson(value, indent = 2) {
    const source =
        value === null || value === undefined
            ? ""
            : String(value);

    if (!source.trim()) {
        return {
            valid: true,
            value: "",
            error: null,
        };
    }

    try {
        const parsed = JSON.parse(source);

        return {
            valid: true,
            value: JSON.stringify(parsed, null, indent),
            error: null,
        };
    } catch (error) {
        return {
            valid: false,
            value: source,
            error:
                error instanceof Error
                    ? error
                    : new Error("Invalid JSON."),
        };
    }
}

/**
 * Format the current editor content.
 *
 * @param {number} [indent=2]
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function formatCurrentJson(indent = 2) {
    const result = formatJson(
        getJsonValue(),
        indent,
    );

    if (result.valid) {
        setJsonValue(result.value);
    }

    return result;
}

/**
 * Minify a JSON string.
 *
 * @param {string} value
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function minifyJson(value) {
    const source =
        value === null || value === undefined
            ? ""
            : String(value);

    if (!source.trim()) {
        return {
            valid: true,
            value: "",
            error: null,
        };
    }

    try {
        return {
            valid: true,
            value: JSON.stringify(JSON.parse(source)),
            error: null,
        };
    } catch (error) {
        return {
            valid: false,
            value: source,
            error:
                error instanceof Error
                    ? error
                    : new Error("Invalid JSON."),
        };
    }
}

/**
 * Minify the current editor content.
 *
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function minifyCurrentJson() {
    const result = minifyJson(getJsonValue());

    if (result.valid) {
        setJsonValue(result.value);
    }

    return result;
}

// ============================================================
// Selection
// ============================================================

/**
 * Get the current editor selection.
 *
 * @returns {{
 *     from: number,
 *     to: number,
 *     text: string
 * }|null}
 */
export function getJsonSelection() {
    if (!editorView) {
        return null;
    }

    const selection =
        editorView.state.selection.main;

    return {
        from: selection.from,
        to: selection.to,
        text: editorView.state.sliceDoc(
            selection.from,
            selection.to,
        ),
    };
}

/**
 * Replace the current selection.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function replaceJsonSelection(value = "") {
    if (!editorView) {
        return false;
    }

    const selection =
        editorView.state.selection.main;

    editorView.dispatch({
        changes: {
            from: selection.from,
            to: selection.to,
            insert: String(value),
        },
        selection: {
            anchor:
                selection.from + String(value).length,
        },
    });

    return true;
}

// ============================================================
// Editor Commands
// ============================================================

/**
 * Undo the last editor change.
 *
 * @returns {Promise<boolean>}
 */
export async function undoJsonChange() {
    if (!editorView) {
        return false;
    }

    const { undo } = await import("@codemirror/commands");

    return undo(editorView);
}

/**
 * Redo the last editor change.
 *
 * @returns {Promise<boolean>}
 */
export async function redoJsonChange() {
    if (!editorView) {
        return false;
    }

    const { redo } = await import("@codemirror/commands");

    return redo(editorView);
}

// ============================================================
// Read Only
// ============================================================

/**
 * Set editor read-only state.
 *
 * @param {boolean} readOnly
 * @returns {boolean}
 */
export function setJsonReadOnly(readOnly = true) {
    if (!editorView) {
        return false;
    }

    editorView.dispatch({
        effects: EditorState.readOnly.of(Boolean(readOnly)),
    });

    return true;
}

// ============================================================
// Refresh
// ============================================================

/**
 * Request a layout refresh.
 *
 * Useful when the editor is initialized inside a hidden
 * tab or a container whose dimensions changed.
 *
 * @returns {boolean}
 */
export function refreshJsonEditor() {
    if (!editorView) {
        return false;
    }

    editorView.requestMeasure();
    return true;
}

// ============================================================
// Destroy
// ============================================================

/**
 * Destroy the current editor instance.
 */
export function destroyJsonEditor() {
    if (editorView) {
        editorView.destroy();
    }

    editorView = null;
    editorParent = null;
}

// ============================================================
// Default Export
// ============================================================

export default {
    initJsonEditor,
    getJsonEditor,
    hasJsonEditor,

    getJsonValue,
    setJsonValue,
    clearJsonEditor,

    focusJsonEditor,
    isJsonEditorFocused,

    validateJson,
    isValidJson,

    formatJson,
    formatCurrentJson,

    minifyJson,
    minifyCurrentJson,

    getJsonSelection,
    replaceJsonSelection,

    undoJsonChange,
    redoJsonChange,

    setJsonReadOnly,
    refreshJsonEditor,
    destroyJsonEditor,
};