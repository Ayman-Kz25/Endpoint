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
 * - Format and minify JSON
 * - Manage selections
 * - Manage read-only state
 * - Expose a small API to the editor/request-builder layer
 *
 * This module does not:
 * - execute HTTP requests
 * - update application state directly
 * - render responses
 * - show notifications
 */

import { Compartment, EditorState } from "@codemirror/state";

import {
    EditorView,
    highlightActiveLine,
    keymap,
    lineNumbers,
} from "@codemirror/view";

import {
    defaultKeymap,
    indentWithTab,
    redo,
    undo,
} from "@codemirror/commands";

import { json } from "@codemirror/lang-json";

import {
    indentUnit,
} from "@codemirror/language";

import { oneDark } from "@codemirror/theme-one-dark";

import {
    EDITOR_DEFAULTS,
    EDITOR_MODES,
    REQUEST_EDITOR_CONFIG,
    normalizeEditorMode,
} from "./editor-config.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_VALUE = "";

const READ_ONLY_COMPARTMENT = new Compartment();

const DISPLAY_COMPARTMENT = new Compartment();

const DEFAULT_OPTIONS = Object.freeze({
    ...REQUEST_EDITOR_CONFIG,

    mode: EDITOR_MODES.JSON,

    tabSize: EDITOR_DEFAULTS.tabSize,

    lineNumbers: EDITOR_DEFAULTS.lineNumbers,

    lineWrapping: EDITOR_DEFAULTS.lineWrapping,

    readOnly: false,

    autofocus: false,

    placeholder: "Enter JSON...",
});

// ============================================================
// Internal State
// ============================================================

let editorView = null;
let editorParent = null;
let editorOptions = {
    ...DEFAULT_OPTIONS,
};

// ============================================================
// Option Helpers
// ============================================================

/**
 * Normalize editor options.
 *
 * @param {Object} options
 * @returns {Object}
 */
function normalizeOptions(options = {}) {
    const tabSize =
        Number.isInteger(options.tabSize) &&
        options.tabSize > 0
            ? options.tabSize
            : DEFAULT_OPTIONS.tabSize;

    const lineNumbers =
        options.lineNumbers !== undefined
            ? Boolean(options.lineNumbers)
            : DEFAULT_OPTIONS.lineNumbers;

    const lineWrapping =
        options.lineWrapping !== undefined
            ? Boolean(options.lineWrapping)
            : DEFAULT_OPTIONS.lineWrapping;

    const readOnly =
        options.readOnly !== undefined
            ? Boolean(options.readOnly)
            : DEFAULT_OPTIONS.readOnly;

    const autofocus =
        options.autofocus !== undefined
            ? Boolean(options.autofocus)
            : DEFAULT_OPTIONS.autofocus;

    const placeholder =
        options.placeholder !== undefined
            ? String(options.placeholder ?? "")
            : DEFAULT_OPTIONS.placeholder;

    return {
        ...DEFAULT_OPTIONS,
        ...options,

        mode: EDITOR_MODES.JSON,

        tabSize,
        lineNumbers,
        lineWrapping,
        readOnly,
        autofocus,
        placeholder,
    };
}

/**
 * Resolve a DOM element from an element or selector.
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

    if (
        typeof HTMLElement !== "undefined" &&
        target instanceof HTMLElement
    ) {
        return target;
    }

    return null;
}

// ============================================================
// CodeMirror Extensions
// ============================================================

/**
 * Create the base editor theme.
 *
 * @returns {Extension}
 */
function createEditorTheme() {
    return EditorView.theme({
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
    });
}

/**
 * Create the placeholder extension.
 *
 * @param {string} placeholder
 * @returns {Extension}
 */
function createPlaceholderExtension(placeholder) {
    if (!placeholder) {
        return [];
    }

    return [
        EditorView.contentAttributes.of({
            "data-placeholder": placeholder,
        }),

        EditorView.theme({
            ".cm-content:empty:before": {
                content: "attr(data-placeholder)",
                opacity: "0.45",
                pointerEvents: "none",
            },
        }),
    ];
}

/**
 * Create display-related extensions.
 *
 * These extensions are placed inside a compartment so settings
 * such as line numbers and wrapping can be changed after
 * initialization.
 *
 * @param {Object} options
 * @returns {Extension[]}
 */
function createDisplayExtensions(options) {
    const extensions = [
        createEditorTheme(),

        highlightActiveLine,

        indentUnit.of(
            " ".repeat(options.tabSize),
        ),

        ...createPlaceholderExtension(
            options.placeholder,
        ),
    ];

    if (options.lineNumbers) {
        extensions.push(lineNumbers());
    }

    if (options.lineWrapping) {
        extensions.push(EditorView.lineWrapping);
    }

    return extensions;
}

/**
 * Create all editor extensions.
 *
 * @param {Object} options
 * @returns {Extension[]}
 */
function createExtensions(options) {
    return [
        json(),

        oneDark,

        keymap.of([
            ...defaultKeymap,
            indentWithTab,
        ]),

        READ_ONLY_COMPARTMENT.of(
            EditorState.readOnly.of(
                options.readOnly,
            ),
        ),

        DISPLAY_COMPARTMENT.of(
            createDisplayExtensions(options),
        ),

        EditorView.updateListener.of(
            (update) => {
                if (!update.docChanged) {
                    return;
                }

                dispatchEditorEvent("change", {
                    value: update.state.doc.toString(),
                });
            },
        ),
    ];
}

// ============================================================
// Events
// ============================================================

/**
 * Dispatch an editor-specific custom event.
 *
 * @param {string} type
 * @param {Object} detail
 */
function dispatchEditorEvent(type, detail = {}) {
    if (!editorParent) {
        return;
    }

    editorParent.dispatchEvent(
        new CustomEvent(
            `json-editor:${type}`,
            {
                bubbles: true,
                detail,
            },
        ),
    );
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize a CodeMirror JSON editor.
 *
 * Existing editor instances are destroyed before creating
 * a new instance.
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

    const normalizedOptions =
        normalizeOptions(options);

    const initialValue =
        options.value === null ||
        options.value === undefined
            ? DEFAULT_VALUE
            : String(options.value);

    editorParent = parent;
    editorOptions = normalizedOptions;

    const state = EditorState.create({
        doc: initialValue,
        extensions:
            createExtensions(
                normalizedOptions,
            ),
    });

    editorView = new EditorView({
        state,
        parent,
    });

    setEditorDataAttributes();

    if (normalizedOptions.autofocus) {
        focusJsonEditor();
    }

    dispatchEditorEvent("ready", {
        value: initialValue,
    });

    return editorView;
}

/**
 * Update editor data attributes.
 */
function setEditorDataAttributes() {
    if (!editorParent) {
        return;
    }

    editorParent.dataset.editorMode =
        EDITOR_MODES.JSON;

    editorParent.dataset.editorType =
        "request-body";
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
 * Check whether the JSON editor exists.
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
 * Get the current JSON editor value.
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
 * Set the JSON editor value.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function setJsonValue(value = "") {
    if (!editorView) {
        return false;
    }

    const nextValue =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    const currentValue =
        getJsonValue();

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
 * Clear the JSON editor.
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
 * Focus the JSON editor.
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
 * Check whether the JSON editor currently has focus.
 *
 * @returns {boolean}
 */
export function isJsonEditorFocused() {
    return Boolean(
        editorView?.hasFocus,
    );
}

// ============================================================
// JSON Validation
// ============================================================

/**
 * Validate JSON.
 *
 * Empty input is considered valid because an empty request body
 * does not represent malformed JSON.
 *
 * @param {unknown} [value]
 * @returns {{
 *     valid: boolean,
 *     value: unknown,
 *     error: Error|null
 * }}
 */
export function validateJson(
    value = getJsonValue(),
) {
    const source =
        value === null ||
        value === undefined
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
                    : new Error(
                          "Invalid JSON.",
                      ),
        };
    }
}

/**
 * Check whether the current editor contains valid JSON.
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
 * Normalize an indentation value.
 *
 * @param {number} indent
 * @returns {number}
 */
function normalizeIndent(indent) {
    return Number.isInteger(indent) &&
        indent >= 0
        ? indent
        : DEFAULT_OPTIONS.tabSize;
}

/**
 * Format a JSON string.
 *
 * @param {unknown} value
 * @param {number} [indent=2]
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function formatJson(
    value,
    indent = DEFAULT_OPTIONS.tabSize,
) {
    const source =
        value === null ||
        value === undefined
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
        const normalizedIndent =
            normalizeIndent(indent);

        return {
            valid: true,
            value: JSON.stringify(
                parsed,
                null,
                normalizedIndent,
            ),
            error: null,
        };
    } catch (error) {
        return {
            valid: false,
            value: source,
            error:
                error instanceof Error
                    ? error
                    : new Error(
                          "Invalid JSON.",
                      ),
        };
    }
}

/**
 * Format the current JSON editor content.
 *
 * @param {number} [indent=2]
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function formatCurrentJson(
    indent = DEFAULT_OPTIONS.tabSize,
) {
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
 * @param {unknown} value
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function minifyJson(value) {
    const source =
        value === null ||
        value === undefined
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
            value: JSON.stringify(
                JSON.parse(source),
            ),
            error: null,
        };
    } catch (error) {
        return {
            valid: false,
            value: source,
            error:
                error instanceof Error
                    ? error
                    : new Error(
                          "Invalid JSON.",
                      ),
        };
    }
}

/**
 * Minify the current JSON editor content.
 *
 * @returns {{
 *     valid: boolean,
 *     value: string,
 *     error: Error|null
 * }}
 */
export function minifyCurrentJson() {
    const result =
        minifyJson(getJsonValue());

    if (result.valid) {
        setJsonValue(result.value);
    }

    return result;
}

// ============================================================
// Selection
// ============================================================

/**
 * Get the main editor selection.
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
 * @param {unknown} value
 * @returns {boolean}
 */
export function replaceJsonSelection(
    value = "",
) {
    if (!editorView) {
        return false;
    }

    const replacement =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    const selection =
        editorView.state.selection.main;

    const cursor =
        selection.from + replacement.length;

    editorView.dispatch({
        changes: {
            from: selection.from,
            to: selection.to,
            insert: replacement,
        },

        selection: {
            anchor: cursor,
        },
    });

    return true;
}

// ============================================================
// Undo / Redo
// ============================================================

/**
 * Undo the last editor change.
 *
 * @returns {boolean}
 */
export function undoJsonChange() {
    if (!editorView) {
        return false;
    }

    return undo(editorView);
}

/**
 * Redo the last editor change.
 *
 * @returns {boolean}
 */
export function redoJsonChange() {
    if (!editorView) {
        return false;
    }

    return redo(editorView);
}

// ============================================================
// Read Only
// ============================================================

/**
 * Set the editor read-only state.
 *
 * @param {boolean} readOnly
 * @returns {boolean}
 */
export function setJsonReadOnly(
    readOnly = true,
) {
    if (!editorView) {
        return false;
    }

    const nextReadOnly =
        Boolean(readOnly);

    editorOptions = {
        ...editorOptions,
        readOnly: nextReadOnly,
    };

    editorView.dispatch({
        effects:
            READ_ONLY_COMPARTMENT.reconfigure(
                EditorState.readOnly.of(
                    nextReadOnly,
                ),
            ),
    });

    return true;
}

/**
 * Check whether the editor is read-only.
 *
 * @returns {boolean}
 */
export function isJsonReadOnly() {
    if (!editorView) {
        return false;
    }

    return editorView.state.facet(
        EditorState.readOnly,
    );
}

// ============================================================
// Editor Options
// ============================================================

/**
 * Get the current editor options.
 *
 * @returns {Object}
 */
export function getJsonEditorOptions() {
    return {
        ...editorOptions,
    };
}

/**
 * Update supported display options.
 *
 * @param {Object} options
 * @returns {boolean}
 */
export function updateJsonEditorOptions(
    options = {},
) {
    if (!editorView) {
        return false;
    }

    const nextOptions =
        normalizeOptions({
            ...editorOptions,
            ...options,
        });

    editorOptions = nextOptions;

    editorView.dispatch({
        effects: [
            READ_ONLY_COMPARTMENT.reconfigure(
                EditorState.readOnly.of(
                    nextOptions.readOnly,
                ),
            ),

            DISPLAY_COMPARTMENT.reconfigure(
                createDisplayExtensions(
                    nextOptions,
                ),
            ),
        ],
    });

    return true;
}

// ============================================================
// Refresh
// ============================================================

/**
 * Request a CodeMirror layout measurement.
 *
 * Useful when the editor is placed inside a hidden tab,
 * modal, panel, or dynamically resized container.
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
 * Destroy the current JSON editor instance.
 */
export function destroyJsonEditor() {
    if (editorView) {
        editorView.destroy();
    }

    editorView = null;
    editorParent = null;
    editorOptions = {
        ...DEFAULT_OPTIONS,
    };
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
    isJsonReadOnly,

    getJsonEditorOptions,
    updateJsonEditorOptions,

    refreshJsonEditor,
    destroyJsonEditor,
};