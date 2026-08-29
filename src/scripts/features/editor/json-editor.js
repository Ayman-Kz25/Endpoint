// src/scripts/features/editor/json-editor.js

import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

let editorView = null;
let editorParent = null;

const readOnlyCompartment = new Compartment();

const DEFAULT_OPTIONS = {
  readOnly: false,
  lineNumbers: true,
  lineWrapping: true,
  tabSize: 2,
};

function resolveElement(target) {
  if (!target) {
    return null;
  }

  if (typeof target === "string") {
    return document.querySelector(target);
  }

  return target instanceof HTMLElement ? target : null;
}

function createExtensions(options) {
  return [
    json(),
    oneDark,

    keymap.of([...defaultKeymap, indentWithTab]),

    options.lineNumbers ? lineNumbers() : [],

    options.lineWrapping ? EditorView.lineWrapping : [],

    EditorState.tabSize.of(options.tabSize),

    readOnlyCompartment.of(EditorState.readOnly.of(options.readOnly)),

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

      ".cm-focused": {
        outline: "none",
      },
    }),

    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !editorParent) {
        return;
      }

      editorParent.dispatchEvent(
        new CustomEvent("json-editor:change", {
          bubbles: true,
          detail: {
            value: update.state.doc.toString(),
          },
        }),
      );
    }),
  ];
}

export function initJsonEditor(target = "#json-editor", options = {}) {
  destroyJsonEditor();

  const parent = resolveElement(target);

  if (!parent) {
    console.error(`JSON editor target not found: ${target}`);

    return null;
  }

  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    readOnly: Boolean(options.readOnly),
    lineNumbers: Boolean(options.lineNumbers),
    lineWrapping: Boolean(options.lineWrapping),
    tabSize: Number(options.tabSize) || 2,
  };

  const value =
    options.value === null || options.value === undefined
      ? ""
      : String(options.value);

  editorParent = parent;

//   console.log("JSON editor config:", config);

  editorView = new EditorView({
    state: EditorState.create({
      doc: value,
      extensions: createExtensions(config),
    }),
    parent,
  });

  /*console.log(
    "JSON editor readonly:",
    editorView.state.facet(EditorState.readOnly),
  );*/

  return editorView;
}

export function getJsonEditor() {
  return editorView;
}

export function hasJsonEditor() {
  return Boolean(editorView);
}

export function getJsonValue() {
  return editorView ? editorView.state.doc.toString() : "";
}

export function setJsonValue(value = "") {
  if (!editorView) {
    return false;
  }

  const nextValue = value === null || value === undefined ? "" : String(value);

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

export function clearJsonEditor() {
  return setJsonValue("");
}

export function focusJsonEditor() {
  if (!editorView) {
    return false;
  }

  editorView.focus();
  return true;
}

export function isJsonEditorFocused() {
  return Boolean(editorView?.hasFocus);
}

export function validateJson(value = getJsonValue()) {
  const source = String(value ?? "");

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
      error,
    };
  }
}

export function isValidJson() {
  return validateJson().valid;
}

export function formatJson(value, indent = 2) {
  const source = String(value ?? "");

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
      error,
    };
  }
}

export function formatCurrentJson(indent = 2) {
  const result = formatJson(getJsonValue(), indent);

  if (result.valid) {
    setJsonValue(result.value);
  }

  return result;
}

export function minifyJson(value) {
  const source = String(value ?? "");

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
      error,
    };
  }
}

export function minifyCurrentJson() {
  const result = minifyJson(getJsonValue());

  if (result.valid) {
    setJsonValue(result.value);
  }

  return result;
}

export function setJsonReadOnly(readOnly = false) {
  if (!editorView) {
    return false;
  }

  editorView.dispatch({
    effects: readOnlyCompartment.reconfigure(
      EditorState.readOnly.of(Boolean(readOnly)),
    ),
  });

  return true;
}

export function isJsonReadOnly() {
  return editorView ? editorView.state.facet(EditorState.readOnly) : false;
}

export function refreshJsonEditor() {
  if (!editorView) {
    return false;
  }

  editorView.requestMeasure();
  return true;
}

export function destroyJsonEditor() {
  if (editorView) {
    editorView.destroy();
  }

  editorView = null;
  editorParent = null;
}

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
  setJsonReadOnly,
  isJsonReadOnly,
  refreshJsonEditor,
  destroyJsonEditor,
};
