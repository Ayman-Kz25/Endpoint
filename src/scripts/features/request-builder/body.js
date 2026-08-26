// src/scripts/features/request-builder/body.js

const elements = {
    editor: null,
    formatButton: null,
    validationStatus: null,
};

let initialized = false;
let bodyValue = "";

function cacheElements() {
    elements.editor = document.getElementById("json-editor");
    elements.formatButton = document.getElementById("format-body-button");
    elements.validationStatus = document.getElementById(
        "body-validation-status"
    );
}

function getEditor() {
    if (!elements.editor) {
        cacheElements();
    }

    return elements.editor;
}

function bindEvents() {
    elements.formatButton?.addEventListener("click", handleFormat);
}

function handleFormat(event) {
    event.preventDefault();

    const formatted = formatJson(getRequestBody());

    if (formatted === null) {
        updateValidationStatus(false);
        return;
    }

    setRequestBody(formatted);
    updateValidationStatus(true);
}

function updateValidationStatus(valid) {
    if (!elements.validationStatus) {
        return;
    }

    elements.validationStatus.textContent = valid
        ? "Valid JSON"
        : "Invalid JSON";
}

function readEditorValue() {
    const editor = getEditor();

    if (!editor) {
        return bodyValue;
    }

    const textarea = editor.querySelector("textarea");

    if (textarea) {
        bodyValue = textarea.value;
        return bodyValue;
    }

    const content = editor.querySelector(
        ".cm-content, [contenteditable='true']"
    );

    if (content) {
        bodyValue = content.textContent ?? "";
        return bodyValue;
    }

    return bodyValue;
}

function writeEditorValue(value) {
    const editor = getEditor();

    bodyValue = String(value ?? "");

    if (!editor) {
        return;
    }

    const textarea = editor.querySelector("textarea");

    if (textarea) {
        textarea.value = bodyValue;
        textarea.dispatchEvent(
            new Event("input", {
                bubbles: true,
            })
        );
        return;
    }

    const content = editor.querySelector(
        ".cm-content, [contenteditable='true']"
    );

    if (content) {
        content.textContent = bodyValue;
        content.dispatchEvent(
            new Event("input", {
                bubbles: true,
            })
        );
    }
}

export function initRequestBody() {
    cacheElements();

    if (!initialized) {
        bindEvents();
        initialized = true;
    }

    return {
        getRequestBody,
        setRequestBody,
        clearRequestBody,
        getBodyType,
        setBodyType,
        isValidJson,
        formatJson,
        minifyJson,
        parseJsonBody,
        validateRequestBody,
        getContentTypeForBodyType,
    };
}

export function getRequestBody() {
    return readEditorValue();
}

export function setRequestBody(value = "") {
    if (value === null || value === undefined) {
        writeEditorValue("");
        return;
    }

    if (typeof value === "string") {
        writeEditorValue(value);
        return;
    }

    try {
        writeEditorValue(JSON.stringify(value, null, 2));
    } catch {
        writeEditorValue(String(value));
    }
}

export function clearRequestBody() {
    setRequestBody("");
    updateValidationStatus(true);
}

export function getBodyType() {
    return "json";
}

export function setBodyType(type = "json") {
    return String(type).toLowerCase() === "json"
        ? "json"
        : "json";
}

export function isValidJson(value = "") {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

export function formatJson(value = "") {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "";
    }

    try {
        const parsed =
            typeof value === "string"
                ? JSON.parse(value)
                : value;

        return JSON.stringify(parsed, null, 2);
    } catch {
        return null;
    }
}

export function minifyJson(value = "") {
    if (!value || !String(value).trim()) {
        return "";
    }

    try {
        return JSON.stringify(JSON.parse(value));
    } catch {
        return null;
    }
}

export function parseJsonBody(value = getRequestBody()) {
    if (!value || !String(value).trim()) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function validateRequestBody(
    value = getRequestBody(),
    type = getBodyType()
) {
    const body = String(value ?? "").trim();

    if (!body) {
        updateValidationStatus(true);

        return {
            valid: true,
            error: "",
        };
    }

    if (type === "json" && !isValidJson(body)) {
        updateValidationStatus(false);

        return {
            valid: false,
            error: "The request body contains invalid JSON.",
        };
    }

    updateValidationStatus(true);

    return {
        valid: true,
        error: "",
    };
}

export function getContentTypeForBodyType(
    type = getBodyType()
) {
    switch (String(type).toLowerCase()) {
        case "json":
            return "application/json";

        default:
            return "";
    }
}

export default {
    initRequestBody,
    getRequestBody,
    setRequestBody,
    clearRequestBody,
    getBodyType,
    setBodyType,
    isValidJson,
    formatJson,
    minifyJson,
    parseJsonBody,
    validateRequestBody,
    getContentTypeForBodyType,
};