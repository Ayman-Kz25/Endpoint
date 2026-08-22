// src/scripts/features/request-builder/method-selector.js

/**
 * HTTP Method Selector
 *
 * Responsible for managing the HTTP method selector in the
 * request builder.
 *
 * This module does not:
 * - execute requests
 * - manipulate other request fields
 * - render responses
 * - show notifications
 */

import state from "../../core/state.js";
import {
    DEFAULT_HTTP_METHOD,
    HTTP_METHODS,
} from "../../core/constants.js";

// ============================================================
// DOM
// ============================================================

const SELECTOR_ID = "request-method";

function getElement() {
    return document.getElementById(SELECTOR_ID);
}

// ============================================================
// Validation
// ============================================================

/**
 * Check whether a value is a supported HTTP method.
 *
 * @param {string} method
 * @returns {boolean}
 */
export function isValidMethod(method) {
    if (!method || typeof method !== "string") {
        return false;
    }

    const normalizedMethod = method.toUpperCase();

    if (Array.isArray(HTTP_METHODS)) {
        return HTTP_METHODS.includes(normalizedMethod);
    }

    if (
        HTTP_METHODS &&
        typeof HTTP_METHODS === "object"
    ) {
        return Object.values(HTTP_METHODS).includes(
            normalizedMethod
        );
    }

    return false;
}

// ============================================================
// Getter
// ============================================================

/**
 * Get the currently selected HTTP method.
 *
 * @returns {string}
 */
export function getRequestMethod() {
    const element = getElement();

    if (element?.value) {
        return element.value.toUpperCase();
    }

    return (
        state.request.method ||
        DEFAULT_HTTP_METHOD
    ).toUpperCase();
}

// ============================================================
// Setter
// ============================================================

/**
 * Set the HTTP method selector.
 *
 * @param {string} method
 * @returns {string}
 */
export function setRequestMethod(method) {
    const normalizedMethod = (
        method ||
        DEFAULT_HTTP_METHOD
    ).toUpperCase();

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

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the HTTP method selector.
 *
 * Sets the initial value and binds change events.
 */
export function initMethodSelector() {
    const element = getElement();

    if (!element) {
        return;
    }

    setRequestMethod(
        state.request.method ||
            DEFAULT_HTTP_METHOD
    );

    element.addEventListener(
        "change",
        handleMethodChange
    );
}

// ============================================================
// Events
// ============================================================

/**
 * Handle method selector changes.
 *
 * @param {Event} event
 */
function handleMethodChange(event) {
    const method = event.target?.value;

    if (!isValidMethod(method)) {
        setRequestMethod(DEFAULT_HTTP_METHOD);
        return;
    }

    state.request.method =
        method.toUpperCase();
}

// ============================================================
// Method Helpers
// ============================================================

/**
 * Check whether the current method can contain a request body.
 *
 * @param {string} [method]
 * @returns {boolean}
 */
export function methodAllowsBody(
    method = getRequestMethod()
) {
    const normalizedMethod =
        method.toUpperCase();

    return !["GET", "HEAD"].includes(
        normalizedMethod
    );
}

/**
 * Check whether the current method is considered
 * idempotent.
 *
 * @param {string} [method]
 * @returns {boolean}
 */
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
    ].includes(method.toUpperCase());
}

/**
 * Check whether the current method is safe.
 *
 * @param {string} [method]
 * @returns {boolean}
 */
export function isSafeMethod(
    method = getRequestMethod()
) {
    return [
        "GET",
        "HEAD",
        "OPTIONS",
        "TRACE",
    ].includes(method.toUpperCase());
}

// ============================================================
// Export
// ============================================================

export default {
    initMethodSelector,
    getRequestMethod,
    setRequestMethod,
    isValidMethod,
    methodAllowsBody,
    isIdempotentMethod,
    isSafeMethod,
};