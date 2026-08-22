// src/scripts/utils/validators.js

/**
 * Validation utilities.
 *
 * These helpers are intentionally framework-independent.
 * They validate values without changing application state or DOM.
 */

// ============================================================
// Constants
// ============================================================

const HTTP_PROTOCOLS = ["http:", "https:"];

const HTTP_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
];

const AUTH_TYPES = [
    "none",
    "bearer",
    "basic",
    "api-key",
];

// ============================================================
// Generic Validators
// ============================================================

/**
 * Check whether a value is a non-empty string.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check whether a value is a plain object.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype ||
        prototype === null;
}

/**
 * Check whether a value is a valid array.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isArray(value) {
    return Array.isArray(value);
}

// ============================================================
// URL Validation
// ============================================================

/**
 * Validate an HTTP/HTTPS URL.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidUrl(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    try {
        const url = new URL(value.trim());

        return HTTP_PROTOCOLS.includes(url.protocol);
    } catch {
        return false;
    }
}

/**
 * Validate a URL and return detailed information.
 *
 * @param {*} value
 * @returns {{
 *   valid: boolean,
 *   error: string,
 *   url: URL|null
 * }}
 */
export function validateUrl(value) {
    if (!isNonEmptyString(value)) {
        return {
            valid: false,
            error: "URL is required.",
            url: null,
        };
    }

    let url;

    try {
        url = new URL(value.trim());
    } catch {
        return {
            valid: false,
            error: "Please enter a valid URL.",
            url: null,
        };
    }

    if (!HTTP_PROTOCOLS.includes(url.protocol)) {
        return {
            valid: false,
            error: "Only HTTP and HTTPS URLs are supported.",
            url: null,
        };
    }

    return {
        valid: true,
        error: "",
        url,
    };
}

// ============================================================
// HTTP Method Validation
// ============================================================

/**
 * Check whether a value is a supported HTTP method.
 *
 * @param {*} method
 * @returns {boolean}
 */
export function isValidHttpMethod(method) {
    if (!isNonEmptyString(method)) {
        return false;
    }

    return HTTP_METHODS.includes(
        method.trim().toUpperCase()
    );
}

/**
 * Validate an HTTP method.
 *
 * @param {*} method
 * @returns {{
 *   valid: boolean,
 *   error: string
 * }}
 */
export function validateHttpMethod(method) {
    if (!isNonEmptyString(method)) {
        return {
            valid: false,
            error: "HTTP method is required.",
        };
    }

    const normalizedMethod = method.trim().toUpperCase();

    if (!HTTP_METHODS.includes(normalizedMethod)) {
        return {
            valid: false,
            error: `Unsupported HTTP method: ${method}.`,
        };
    }

    return {
        valid: true,
        error: "",
    };
}

// ============================================================
// Header Validation
// ============================================================

/**
 * Validate a header name.
 *
 * Header names follow the HTTP token syntax.
 *
 * @param {*} name
 * @returns {boolean}
 */
export function isValidHeaderName(name) {
    if (!isNonEmptyString(name)) {
        return false;
    }

    const value = name.trim();

    // RFC-style HTTP token validation.
    return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(value);
}

/**
 * Validate a header value.
 *
 * Reject CR/LF to prevent malformed header injection.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidHeaderValue(value) {
    if (value === null || value === undefined) {
        return false;
    }

    return !/[\r\n]/.test(String(value));
}

/**
 * Validate a complete header row.
 *
 * @param {Object} header
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateHeader(header = {}) {
    const errors = [];

    if (!isValidHeaderName(header.key)) {
        errors.push("Header name is invalid.");
    }

    if (!isValidHeaderValue(header.value)) {
        errors.push("Header value is invalid.");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate an array of headers.
 *
 * Disabled headers are ignored.
 *
 * @param {*} headers
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateHeaders(headers) {
    if (!Array.isArray(headers)) {
        return {
            valid: false,
            errors: ["Headers must be an array."],
        };
    }

    const errors = [];

    headers.forEach((header, index) => {
        if (!header || header.enabled === false) {
            return;
        }

        const result = validateHeader(header);

        result.errors.forEach((error) => {
            errors.push(`Header ${index + 1}: ${error}`);
        });
    });

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// Query Parameter Validation
// ============================================================

/**
 * Validate a query parameter.
 *
 * @param {Object} param
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateQueryParam(param = {}) {
    const errors = [];

    if (!isNonEmptyString(param.key)) {
        errors.push("Parameter name is required.");
    }

    if (param.value !== null && param.value !== undefined) {
        if (/[\r\n]/.test(String(param.value))) {
            errors.push("Parameter value contains invalid characters.");
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate an array of query parameters.
 *
 * Disabled parameters are ignored.
 *
 * @param {*} params
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateQueryParams(params) {
    if (!Array.isArray(params)) {
        return {
            valid: false,
            errors: ["Query parameters must be an array."],
        };
    }

    const errors = [];

    params.forEach((param, index) => {
        if (!param || param.enabled === false) {
            return;
        }

        const result = validateQueryParam(param);

        result.errors.forEach((error) => {
            errors.push(`Parameter ${index + 1}: ${error}`);
        });
    });

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// JSON Validation
// ============================================================

/**
 * Check whether a string contains valid JSON.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidJson(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse JSON safely.
 *
 * @param {*} value
 * @returns {{
 *   valid: boolean,
 *   value: *,
 *   error: string
 * }}
 */
export function parseJson(value) {
    if (!isNonEmptyString(value)) {
        return {
            valid: false,
            value: null,
            error: "JSON value is empty.",
        };
    }

    try {
        return {
            valid: true,
            value: JSON.parse(value),
            error: "",
        };
    } catch (error) {
        return {
            valid: false,
            value: null,
            error: error instanceof Error
                ? error.message
                : "Invalid JSON.",
        };
    }
}

/**
 * Validate JSON and return a useful error message.
 *
 * @param {*} value
 * @returns {{
 *   valid: boolean,
 *   error: string
 * }}
 */
export function validateJson(value) {
    if (!isNonEmptyString(value)) {
        return {
            valid: false,
            error: "JSON body is empty.",
        };
    }

    try {
        JSON.parse(value);

        return {
            valid: true,
            error: "",
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error
                ? error.message
                : "Invalid JSON.",
        };
    }
}

// ============================================================
// Authentication Validation
// ============================================================

/**
 * Check whether an authentication type is supported.
 *
 * @param {*} type
 * @returns {boolean}
 */
export function isValidAuthType(type) {
    if (!isNonEmptyString(type)) {
        return false;
    }

    return AUTH_TYPES.includes(type.trim().toLowerCase());
}

/**
 * Validate authentication configuration.
 *
 * @param {Object} auth
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateAuth(auth = {}) {
    const errors = [];

    const type = isNonEmptyString(auth.type)
        ? auth.type.trim().toLowerCase()
        : "none";

    if (!AUTH_TYPES.includes(type)) {
        errors.push("Unsupported authentication type.");
        return {
            valid: false,
            errors,
        };
    }

    const fields = isPlainObject(auth.fields)
        ? auth.fields
        : {};

    if (type === "bearer") {
        if (!isNonEmptyString(fields.token)) {
            errors.push("Bearer token is required.");
        }
    }

    if (type === "basic") {
        if (!isNonEmptyString(fields.username)) {
            errors.push("Username is required.");
        }

        if (!isNonEmptyString(fields.password)) {
            errors.push("Password is required.");
        }
    }

    if (type === "api-key") {
        if (!isNonEmptyString(fields.key)) {
            errors.push("API key name is required.");
        }

        if (!isNonEmptyString(fields.value)) {
            errors.push("API key value is required.");
        }

        const location = fields.location || "header";

        if (!["header", "query"].includes(location)) {
            errors.push(
                "API key location must be header or query."
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// Request Validation
// ============================================================

/**
 * Validate the complete request configuration.
 *
 * This is suitable for use immediately before sending a request.
 *
 * @param {Object} request
 * @returns {{
 *   valid: boolean,
 *   errors: string[]
 * }}
 */
export function validateRequest(request = {}) {
    const errors = [];

    const urlResult = validateUrl(request.url);

    if (!urlResult.valid) {
        errors.push(urlResult.error);
    }

    const methodResult = validateHttpMethod(request.method);

    if (!methodResult.valid) {
        errors.push(methodResult.error);
    }

    if (request.params !== undefined) {
        const paramsResult = validateQueryParams(
            request.params
        );

        errors.push(...paramsResult.errors);
    }

    if (request.headers !== undefined) {
        const headersResult = validateHeaders(
            request.headers
        );

        errors.push(...headersResult.errors);
    }

    if (request.auth !== undefined) {
        const authResult = validateAuth(
            request.auth
        );

        errors.push(...authResult.errors);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================
// Export Constants
// ============================================================

export {
    HTTP_PROTOCOLS,
    HTTP_METHODS,
    AUTH_TYPES,
};

// ============================================================
// Default Export
// ============================================================

export default {
    isNonEmptyString,
    isPlainObject,
    isArray,

    isValidUrl,
    validateUrl,

    isValidHttpMethod,
    validateHttpMethod,

    isValidHeaderName,
    isValidHeaderValue,
    validateHeader,
    validateHeaders,

    validateQueryParam,
    validateQueryParams,

    isValidJson,
    parseJson,
    validateJson,

    isValidAuthType,
    validateAuth,

    validateRequest,

    HTTP_PROTOCOLS,
    HTTP_METHODS,
    AUTH_TYPES,
};