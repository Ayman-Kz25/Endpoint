// src/scripts/features/response-viewer/response-viewer.js

import state from "../../core/state.js";
import { DEFAULT_RESPONSE_TAB } from "../../core/constants.js";

const elements = {
    status: null,
    duration: null,
    size: null,
    pretty: null,
    raw: null,
    headers: null,
    empty: null,
};

let initialized = false;

export function initResponseViewer() {
    cacheElements();

    if (!initialized) {
        initialized = true;
    }

    syncStateToUI();

    return {
        renderResponse,
        clearResponse,
        syncStateToUI,
        stringifyResponse,
        hasResponseBody,
        getResponseStatusCategory,
    };
}

function cacheElements() {
    elements.status = document.getElementById("response-status");
    elements.duration = document.getElementById("response-duration");
    elements.size = document.getElementById("response-size");
    elements.pretty = document.getElementById("response-pretty");
    elements.raw = document.getElementById("response-raw");
    elements.headers = document.getElementById("response-headers-list");
    elements.empty = document.getElementById("response-empty-state");
}

export function renderResponse(response = null) {
    if (!response || typeof response !== "object") {
        clearResponse();
        return;
    }

    state.response = {
        ...state.response,
        status: response.status ?? null,
        statusText: response.statusText ?? "",
        duration: response.duration ?? null,
        size: response.size ?? null,
        data: response.data ?? null,
        raw: response.raw ?? "",
        headers: Array.isArray(response.headers)
            ? response.headers
            : [],
    };

    renderStatus();
    renderMetadata();
    renderPretty();
    renderRaw();
    renderHeaders();
    updateEmptyState();
}

function renderStatus() {
    if (!elements.status) {
        return;
    }

    const { status, statusText } = state.response;

    if (status === null || status === undefined) {
        elements.status.textContent = "";
        elements.status.removeAttribute("data-status");
        elements.status.classList.add("hidden");
        return;
    }

    elements.status.textContent = statusText
        ? `${status} ${statusText}`
        : String(status);

    elements.status.dataset.status =
        getResponseStatusCategory(status);

    elements.status.classList.remove("hidden");
}

function renderMetadata() {
    if (elements.duration) {
        elements.duration.textContent =
            formatDuration(state.response.duration);

        elements.duration.classList.toggle(
            "hidden",
            state.response.duration == null,
        );
    }

    if (elements.size) {
        elements.size.textContent =
            formatSize(state.response.size);

        elements.size.classList.toggle(
            "hidden",
            state.response.size == null,
        );
    }
}

function renderPretty() {
    if (!elements.pretty) {
        return;
    }

    elements.pretty.textContent =
        stringifyResponse(state.response.data) ||
        "No response body.";
}

function renderRaw() {
    if (!elements.raw) {
        return;
    }

    elements.raw.textContent =
        state.response.raw || "No response body.";
}

function renderHeaders() {
    if (!elements.headers) {
        return;
    }

    elements.headers.innerHTML = "";

    const headers = state.response.headers;

    if (!headers.length) {
        elements.headers.textContent = "No response headers.";
        return;
    }

    const fragment = document.createDocumentFragment();

    headers.forEach((header) => {
        if (!header || typeof header !== "object") {
            return;
        }

        const row = document.createElement("div");
        row.className =
            "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-border px-3 py-2 text-sm";

        const name = document.createElement("div");
        name.className = "break-words font-medium";
        name.textContent = String(header.name ?? "");

        const value = document.createElement("div");
        value.className = "break-words text-muted-foreground";
        value.textContent = String(header.value ?? "");

        row.append(name, value);
        fragment.appendChild(row);
    });

    elements.headers.appendChild(fragment);
}

export function clearResponse() {
    state.response = {
        ...state.response,
        status: null,
        statusText: "",
        duration: null,
        size: null,
        data: null,
        raw: "",
        headers: [],
    };

    if (elements.status) {
        elements.status.textContent = "";
        elements.status.removeAttribute("data-status");
        elements.status.classList.add("hidden");
    }

    if (elements.duration) {
        elements.duration.textContent = "";
        elements.duration.classList.add("hidden");
    }

    if (elements.size) {
        elements.size.textContent = "";
        elements.size.classList.add("hidden");
    }

    if (elements.pretty) {
        elements.pretty.textContent = "";
    }

    if (elements.raw) {
        elements.raw.textContent = "";
    }

    if (elements.headers) {
        elements.headers.innerHTML = "";
        elements.headers.textContent = "No response headers.";
    }

    updateEmptyState();
}

function updateEmptyState() {
    if (!elements.empty) {
        return;
    }

    elements.empty.hidden = hasResponseBody() || state.response.status !== null;
}

export function syncStateToUI() {
    renderStatus();
    renderMetadata();
    renderPretty();
    renderRaw();
    renderHeaders();
    updateEmptyState();

    if (!state.responseUI.activeTab) {
        state.responseUI.activeTab = DEFAULT_RESPONSE_TAB;
    }
}

function formatDuration(value) {
    if (!Number.isFinite(value) || value < 0) {
        return "";
    }

    return `${Math.round(value)} ms`;
}

function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getResponseStatusCategory(status) {
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

function parseJson(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function stringifyResponse(data) {
    if (data === null || data === undefined) {
        return "";
    }

    if (typeof data === "string") {
        const parsed = parseJson(data);

        return parsed !== null
            ? JSON.stringify(parsed, null, 2)
            : data;
    }

    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

export function hasResponseBody(response = state.response) {
    if (!response) {
        return false;
    }

    return (
        response.data !== null &&
        response.data !== undefined &&
        response.data !== ""
    ) || Boolean(response.raw);
}

export default {
    initResponseViewer,
    renderResponse,
    clearResponse,
    syncStateToUI,
    stringifyResponse,
    hasResponseBody,
    getResponseStatusCategory,
};