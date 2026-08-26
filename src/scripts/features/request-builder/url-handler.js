// src/scripts/features/request-builder/url-handler.js

const elements = {
    url: null,
};

function cacheElements() {
    elements.url = document.getElementById("request-url");
}

export function initUrlHandler() {
    cacheElements();

    return {
        getRequestUrl,
        setRequestUrl,
        clearRequestUrl,
        normalizeRequestUrl,
        validateRequestUrl,
        hasRequestUrl,
    };
}

export function getRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    return elements.url?.value?.trim() || "";
}

export function setRequestUrl(url = "") {
    if (!elements.url) {
        cacheElements();
    }

    const normalized = normalizeRequestUrl(url);

    if (elements.url) {
        elements.url.value = normalized;
    }

    return normalized;
}

export function clearRequestUrl() {
    return setRequestUrl("");
}

export function hasRequestUrl() {
    return Boolean(getRequestUrl());
}

export function normalizeRequestUrl(url) {
    if (url === undefined || url === null) {
        return "";
    }

    return String(url).trim();
}

export function parseRequestUrl() {
    const url = getRequestUrl();

    if (!url) {
        return null;
    }

    try {
        return new URL(url);
    } catch {
        return null;
    }
}

export function getRequestProtocol() {
    return parseRequestUrl()?.protocol || "";
}

export function getRequestHostname() {
    return parseRequestUrl()?.hostname || "";
}

export function getRequestPathname() {
    return parseRequestUrl()?.pathname || "";
}

export function validateRequestUrl(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return {
            valid: false,
            error: "Request URL is required.",
            url: null,
        };
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(value);
    } catch {
        return {
            valid: false,
            error: "Please enter a valid URL.",
            url: null,
        };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return {
            valid: false,
            error: "Only HTTP and HTTPS URLs are supported.",
            url: parsedUrl,
        };
    }

    return {
        valid: true,
        error: "",
        url: parsedUrl,
    };
}

export function isValidRequestUrl(url = getRequestUrl()) {
    return validateRequestUrl(url).valid;
}

export function resolveRequestUrl(url = "", baseUrl = "") {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        return new URL(value, baseUrl || undefined).href;
    } catch {
        return value;
    }
}

export function removeUrlHash(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        const parsedUrl = new URL(value);
        parsedUrl.hash = "";
        return parsedUrl.href;
    } catch {
        return value;
    }
}

export function getUrlWithoutQuery(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        const parsedUrl = new URL(value);
        parsedUrl.search = "";
        return parsedUrl.href;
    } catch {
        return value;
    }
}

export function getUrlQueryString(url = getRequestUrl()) {
    const value = normalizeRequestUrl(url);

    if (!value) {
        return "";
    }

    try {
        return new URL(value).search;
    } catch {
        return "";
    }
}

export function focusRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    elements.url?.focus();
}

export function selectRequestUrl() {
    if (!elements.url) {
        cacheElements();
    }

    if (!elements.url) {
        return;
    }

    elements.url.focus();
    elements.url.select();
}

export default {
    initUrlHandler,
    getRequestUrl,
    setRequestUrl,
    clearRequestUrl,
    hasRequestUrl,
    normalizeRequestUrl,
    parseRequestUrl,
    getRequestProtocol,
    getRequestHostname,
    getRequestPathname,
    validateRequestUrl,
    isValidRequestUrl,
    resolveRequestUrl,
    removeUrlHash,
    getUrlWithoutQuery,
    getUrlQueryString,
    focusRequestUrl,
    selectRequestUrl,
};