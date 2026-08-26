// src/scripts/features/request-builder/method-selector.js

import state from "../../core/state.js";
import { DEFAULT_HTTP_METHOD, HTTP_METHODS } from "../../core/constants.js";

const SELECTOR_ID = "request-method";

function getElement() {
    return document.getElementById(SELECTOR_ID);
}

function normalizeMethod(method) {
    return String(method || DEFAULT_HTTP_METHOD).toUpperCase();
}

export function isValidMethod(method) {
    if (typeof method !== "string" || !method.trim()) {
        return false;
    }

    return HTTP_METHODS.includes(normalizeMethod(method));
}

export function getRequestMethod() {
    const element = getElement();

    return normalizeMethod(
        element?.value || state.request.method
    );
}

export function setRequestMethod(method) {
    const normalizedMethod = normalizeMethod(method);
    const finalMethod = isValidMethod(normalizedMethod)
        ? normalizedMethod
        : DEFAULT_HTTP_METHOD;

    const element = getElement();

    if (element) {
        element.value = finalMethod;
    }

    state.request.method = finalMethod;

    return finalMethod;
}

export function initMethodSelector() {
    const element = getElement();

    if (!element) {
        return;
    }

    setRequestMethod(
        state.request.method || DEFAULT_HTTP_METHOD
    );

    element.addEventListener("change", handleMethodChange);
}

function handleMethodChange(event) {
    const method = event.target?.value;

    setRequestMethod(
        isValidMethod(method)
            ? method
            : DEFAULT_HTTP_METHOD
    );
}

export function methodAllowsBody(
    method = getRequestMethod()
) {
    return !["GET", "HEAD"].includes(
        normalizeMethod(method)
    );
}

export function isIdempotentMethod(
    method = getRequestMethod()
) {
    return [
        "GET",
        "HEAD",
        "PUT",
        "DELETE",
        "OPTIONS",
        "TRACE",
    ].includes(normalizeMethod(method));
}

export function isSafeMethod(
    method = getRequestMethod()
) {
    return [
        "GET",
        "HEAD",
        "OPTIONS",
        "TRACE",
    ].includes(normalizeMethod(method));
}

export default {
    initMethodSelector,
    getRequestMethod,
    setRequestMethod,
    isValidMethod,
    methodAllowsBody,
    isIdempotentMethod,
    isSafeMethod,
};