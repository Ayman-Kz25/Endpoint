// src/scripts/features/request-builder/body.js

import {
    getJsonValue,
    setJsonValue,
    hasJsonEditor,
    validateJson as validateEditorJson,
    formatJson as formatEditorJson,
    minifyJson as minifyEditorJson,
} from "../editor/json-editor.js";

const elements = {
    formatButton: null,
    validationStatus: null,
};

let initialized = false;

function cacheElements() {
    elements.formatButton = document.getElementById(
        "format-body-button",
    );

    elements.validationStatus = document.getElementById(
        "body-validation-status",
    );
}

function bindEvents() {
    elements.formatButton?.addEventListener(
        "click",
        handleFormat,
    );

    document.addEventListener(
        "json-editor:change",
        handleEditorChange,
    );
}

function handleEditorChange(event) {
    const value = event.detail?.value ?? "";

    validateRequestBody(value);

    if (elements.validationStatus) {
        elements.validationStatus.dataset.empty =
            value.trim() ? "false" : "true";
    }
}

function handleFormat(event) {
    event.preventDefault();

    const result = formatEditorJson(
        getRequestBody(),
        2,
    );

    if (!result.valid) {
        updateValidationStatus(false);
        return;
    }

    setRequestBody(result.value);
    updateValidationStatus(true);
}

function updateValidationStatus(valid) {
    if (!elements.validationStatus) {
        return;
    }

    elements.validationStatus.textContent = valid
        ? "Valid JSON"
        : "Invalid JSON";

    elements.validationStatus.dataset.valid = String(
        valid,
    );
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
    if (!hasJsonEditor()) {
        return "";
    }

    return getJsonValue();
}

export function setRequestBody(value = "") {
    if (value === null || value === undefined) {
        setJsonValue("");
        return;
    }

    if (typeof value === "string") {
        setJsonValue(value);
        return;
    }

    try {
        setJsonValue(
            JSON.stringify(value, null, 2),
        );
    } catch {
        setJsonValue(String(value));
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

export function isValidJson(value = getRequestBody()) {
    return validateEditorJson(value).valid;
}

export function formatJson(value = "") {
    return formatEditorJson(value, 2).value;
}

export function minifyJson(value = "") {
    return minifyEditorJson(value).value;
}

export function parseJsonBody(value = getRequestBody()) {
    const result = validateEditorJson(value);

    return result.valid ? result.value : null;
}

export function validateRequestBody(
    value = getRequestBody(),
    type = getBodyType(),
) {
    const body = String(value ?? "").trim();

    if (!body) {
        updateValidationStatus(true);

        return {
            valid: true,
            error: "",
        };
    }

    if (
        type === "json" &&
        !validateEditorJson(body).valid
    ) {
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
    type = getBodyType(),
) {
    return String(type).toLowerCase() === "json"
        ? "application/json"
        : "";
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
