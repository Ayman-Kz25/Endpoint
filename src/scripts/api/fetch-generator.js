// src/scripts/api/fetch-generator.js

/**
 * Fetch Code Generator
 *
 * Responsible for generating JavaScript Fetch API code
 * from request configuration.
 *
 * This module does not:
 * - send HTTP requests
 * - manipulate the DOM
 * - update application state
 * - show notifications
 *
 * It only transforms request configuration into
 * executable JavaScript Fetch API code.
 */

// ============================================================
// Constants
// ============================================================

const BODY_METHODS = new Set([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
]);

const DEFAULT_METHOD = "GET";
const DEFAULT_INDENT = "  ";

// ============================================================
// General Helpers
// ============================================================

/**
 * Safely convert a value to a string.
 *
 * @param {unknown} value
 * @returns {string}
 */
function toStringValue(value) {
    return String(value ?? "");
}

/**
 * Convert a value into a JavaScript string literal.
 *
 * JSON.stringify safely handles:
 * - quotes
 * - backslashes
 * - new lines
 * - tabs
 * - unicode characters
 *
 * @param {unknown} value
 * @returns {string}
 */
function stringifyValue(value) {
    return JSON.stringify(toStringValue(value));
}

/**
 * Normalize an HTTP method.
 *
 * @param {string} method
 * @returns {string}
 */
function normalizeMethod(method = DEFAULT_METHOD) {
    return (
        toStringValue(method).trim().toUpperCase() ||
        DEFAULT_METHOD
    );
}

/**
 * Check whether an HTTP method supports a request body.
 *
 * @param {string} method
 * @returns {boolean}
 */
function methodSupportsBody(method) {
    return BODY_METHODS.has(
        normalizeMethod(method)
    );
}

// ============================================================
// Parameter Normalization
// ============================================================

/**
 * Normalize query parameters into a predictable array.
 *
 * Supported formats:
 *
 * [
 *     { name: "page", value: "1" }
 * ]
 *
 * [
 *     { key: "page", value: "1" }
 * ]
 *
 * {
 *     page: "1"
 * }
 *
 * @param {Array|Object} params
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeParams(params = []) {
    if (Array.isArray(params)) {
        return params
            .filter(Boolean)
            .map((param) => ({
                name: toStringValue(
                    param.name ??
                    param.key ??
                    ""
                ).trim(),

                value: toStringValue(
                    param.value
                ),
            }))
            .filter((param) => param.name);
    }

    if (
        params &&
        typeof params === "object"
    ) {
        return Object.entries(params)
            .map(([name, value]) => ({
                name: toStringValue(name).trim(),
                value: toStringValue(value),
            }))
            .filter((param) => param.name);
    }

    return [];
}

// ============================================================
// Header Normalization
// ============================================================

/**
 * Normalize headers into a predictable array.
 *
 * Supported formats:
 *
 * [
 *     {
 *         name: "Content-Type",
 *         value: "application/json"
 *     }
 * ]
 *
 * {
 *     "Content-Type": "application/json"
 * }
 *
 * @param {Array|Object} headers
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeHeaders(headers = []) {
    if (Array.isArray(headers)) {
        return headers
            .filter(Boolean)
            .map((header) => ({
                name: toStringValue(
                    header.name
                ).trim(),

                value: toStringValue(
                    header.value
                ),
            }))
            .filter((header) => header.name);
    }

    if (
        headers &&
        typeof headers === "object"
    ) {
        return Object.entries(headers)
            .map(([name, value]) => ({
                name: toStringValue(name).trim(),
                value: toStringValue(value),
            }))
            .filter((header) => header.name);
    }

    return [];
}

/**
 * Check whether a header exists.
 *
 * Header names are case-insensitive.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {string} targetName
 * @returns {boolean}
 */
function hasHeader(headers, targetName) {
    const normalizedTarget = toStringValue(
        targetName
    )
        .trim()
        .toLowerCase();

    return headers.some(
        (header) =>
            header.name
                .trim()
                .toLowerCase() === normalizedTarget
    );
}

/**
 * Add a header if it does not already exist.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {string} name
 * @param {string} value
 * @returns {Array<{name: string, value: string}>}
 */
function addHeaderIfMissing(
    headers,
    name,
    value
) {
    if (hasHeader(headers, name)) {
        return headers;
    }

    return [
        ...headers,
        {
            name,
            value,
        },
    ];
}

// ============================================================
// URL Generation
// ============================================================

/**
 * Build a request URL with query parameters.
 *
 * Existing query parameters are preserved.
 *
 * @param {string} url
 * @param {Array|Object} params
 * @returns {string}
 */
export function buildFetchUrl(
    url,
    params = []
) {
    const rawUrl = toStringValue(url).trim();

    if (!rawUrl) {
        return "";
    }

    const normalizedParams =
        normalizeParams(params);

    if (!normalizedParams.length) {
        return rawUrl;
    }

    try {
        const parsedUrl = new URL(rawUrl);

        normalizedParams.forEach(
            ({ name, value }) => {
                parsedUrl.searchParams.set(
                    name,
                    value
                );
            }
        );

        return parsedUrl.toString();
    } catch {
        /**
         * Keep the original URL when it cannot
         * be parsed by the URL constructor.
         *
         * Parameters are appended manually so
         * the generator can still produce code.
         */

        const query = normalizedParams
            .map(
                ({ name, value }) =>
                    `${encodeURIComponent(
                        name
                    )}=${encodeURIComponent(
                        value
                    )}`
            )
            .join("&");

        if (!query) {
            return rawUrl;
        }

        if (rawUrl.endsWith("?")) {
            return `${rawUrl}${query}`;
        }

        if (rawUrl.endsWith("&")) {
            return `${rawUrl}${query}`;
        }

        const separator = rawUrl.includes("?")
            ? "&"
            : "?";

        return `${rawUrl}${separator}${query}`;
    }
}

// ============================================================
// Authentication
// ============================================================

/**
 * Apply authentication configuration to headers.
 *
 * Supported authentication types:
 * - none
 * - bearer
 * - basic
 * - api-key
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {Object|null} auth
 * @returns {Array<{name: string, value: string}>}
 */
function applyAuthToHeaders(
    headers,
    auth
) {
    if (
        !auth ||
        typeof auth !== "object"
    ) {
        return headers;
    }

    const result = [...headers];

    // --------------------------------------------------------
    // Bearer Token
    // --------------------------------------------------------

    if (auth.type === "bearer") {
        const token = toStringValue(
            auth.fields?.token
        ).trim();

        if (
            token &&
            !hasHeader(
                result,
                "Authorization"
            )
        ) {
            result.push({
                name: "Authorization",
                value: `Bearer ${token}`,
            });
        }
    }

    // --------------------------------------------------------
    // Basic Authentication
    // --------------------------------------------------------

    if (auth.type === "basic") {
        const username = toStringValue(
            auth.fields?.username
        );

        const password = toStringValue(
            auth.fields?.password
        );

        if (
            (username || password) &&
            !hasHeader(
                result,
                "Authorization"
            )
        ) {
            /**
             * Keep the generated credentials inside
             * the generated code rather than encoding
             * them inside this module.
             */

            result.push({
                name: "Authorization",
                value: {
                    type: "basic",
                    username,
                    password,
                },
            });
        }
    }

    // --------------------------------------------------------
    // API Key
    // --------------------------------------------------------

    if (auth.type === "api-key") {
        const key = toStringValue(
            auth.fields?.key
        ).trim();

        const value = toStringValue(
            auth.fields?.value
        );

        const location =
            auth.fields?.location ||
            "header";

        if (
            key &&
            value &&
            location === "header" &&
            !hasHeader(result, key)
        ) {
            result.push({
                name: key,
                value,
            });
        }
    }

    return result;
}

/**
 * Generate a JavaScript expression for a header value.
 *
 * @param {string|Object} value
 * @returns {string}
 */
function generateHeaderValue(value) {
    if (
        value &&
        typeof value === "object" &&
        value.type === "basic"
    ) {
        const credentials =
            `${value.username}:${value.password}`;

        return `\`Basic \${btoa(${stringifyValue(
            credentials
        )})}\``;
    }

    return stringifyValue(value);
}

// ============================================================
// Body Generation
// ============================================================

/**
 * Check whether a body contains meaningful content.
 *
 * @param {unknown} body
 * @returns {boolean}
 */
function hasBody(body) {
    if (
        body === undefined ||
        body === null
    ) {
        return false;
    }

    if (
        typeof body === "string"
    ) {
        return body.trim() !== "";
    }

    return true;
}

/**
 * Generate a JavaScript expression for a request body.
 *
 * JSON strings become JSON.stringify(object).
 * Objects become JSON.stringify(object).
 * Plain text remains a normal JavaScript string.
 *
 * @param {unknown} body
 * @returns {string|null}
 */
export function generateBodyExpression(
    body
) {
    if (!hasBody(body)) {
        return null;
    }

    if (
        typeof body === "object"
    ) {
        return `JSON.stringify(${JSON.stringify(
            body,
            null,
            2
        )})`;
    }

    const stringBody =
        toStringValue(body);

    try {
        const parsedBody =
            JSON.parse(stringBody);

        return `JSON.stringify(${JSON.stringify(
            parsedBody,
            null,
            2
        )})`;
    } catch {
        return stringifyValue(
            stringBody
        );
    }
}

/**
 * Determine whether JSON Content-Type should
 * be added automatically.
 *
 * @param {unknown} body
 * @param {Array} headers
 * @returns {boolean}
 */
function shouldAddJsonContentType(
    body,
    headers
) {
    if (
        !hasBody(body) ||
        hasHeader(
            headers,
            "Content-Type"
        )
    ) {
        return false;
    }

    if (
        typeof body === "object"
    ) {
        return true;
    }

    try {
        JSON.parse(
            toStringValue(body)
        );

        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Fetch Configuration Generation
// ============================================================

/**
 * Generate the headers section.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @returns {string}
 */
function generateHeaders(
    headers
) {
    if (!headers.length) {
        return "";
    }

    const lines = headers.map(
        ({ name, value }) =>
            `${DEFAULT_INDENT}${DEFAULT_INDENT}${stringifyValue(
                name
            )}: ${generateHeaderValue(
                value
            )}`
    );

    return [
        `${DEFAULT_INDENT}headers: {`,
        lines.join(",\n"),
        `${DEFAULT_INDENT}},`,
    ].join("\n");
}

/**
 * Generate the Fetch options object.
 *
 * @param {Object} options
 * @returns {string}
 */
function generateFetchOptions({
    method,
    headers,
    body,
}) {
    const lines = [];

    lines.push(
        `${DEFAULT_INDENT}method: ${stringifyValue(
            method
        )},`
    );

    const headerBlock =
        generateHeaders(headers);

    if (headerBlock) {
        lines.push(headerBlock);
    }

    const bodyExpression =
        generateBodyExpression(body);

    if (
        bodyExpression &&
        methodSupportsBody(method)
    ) {
        lines.push(
            `${DEFAULT_INDENT}body: ${bodyExpression},`
        );
    }

    return [
        "{",
        lines.join("\n"),
        "}",
    ].join("\n");
}

// ============================================================
// Request Normalization
// ============================================================

/**
 * Normalize request data for the Fetch generator.
 *
 * @param {Object} request
 * @returns {{
 *     url: string,
 *     method: string,
 *     headers: Array,
 *     body: unknown,
 *     auth: Object|null
 * }}
 */
export function normalizeFetchRequest(
    request = {}
) {
    const method =
        normalizeMethod(
            request.method
        );

    const body =
        request.body ?? "";

    let headers =
        normalizeHeaders(
            request.headers
        );

    headers =
        applyAuthToHeaders(
            headers,
            request.auth
        );

    if (
        shouldAddJsonContentType(
            body,
            headers
        )
    ) {
        headers =
            addHeaderIfMissing(
                headers,
                "Content-Type",
                "application/json"
            );
    }

    return {
        url: buildFetchUrl(
            request.url ?? "",
            request.params ?? []
        ),

        method,

        headers,

        body,

        auth:
            request.auth ?? null,
    };
}

// ============================================================
// Main Generator
// ============================================================

/**
 * Generate JavaScript Fetch API code.
 *
 * @param {Object} options
 * @param {string} options.url
 * @param {string} [options.method="GET"]
 * @param {Array|Object} [options.params=[]]
 * @param {Array|Object} [options.headers=[]]
 * @param {unknown} [options.body=""]
 * @param {Object|null} [options.auth=null]
 *
 * @returns {string}
 */
export function generateFetchCode({
    url = "",
    method = DEFAULT_METHOD,
    params = [],
    headers = [],
    body = "",
    auth = null,
} = {}) {
    const normalizedRequest =
        normalizeFetchRequest({
            url,
            method,
            params,
            headers,
            body,
            auth,
        });

    const {
        url: fetchUrl,
        method: normalizedMethod,
        headers: normalizedHeaders,
    } = normalizedRequest;

    const bodyExpression =
        generateBodyExpression(body);

    /**
     * Keep simple GET requests compact.
     */

    if (
        normalizedMethod === "GET" &&
        !normalizedHeaders.length &&
        !bodyExpression
    ) {
        return `const response = await fetch(${stringifyValue(
            fetchUrl
        )});

const data = await response.json();

console.log(data);`;
    }

    const fetchOptions =
        generateFetchOptions({
            method: normalizedMethod,
            headers: normalizedHeaders,
            body,
        });

    return `const response = await fetch(
    ${stringifyValue(fetchUrl)},
    ${fetchOptions}
);

const data = await response.json();

console.log(data);`;
}

// ============================================================
// Request Adapter
// ============================================================

/**
 * Generate Fetch code directly from application
 * request state.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchFromRequest(
    request = {}
) {
    return generateFetchCode({
        url: request.url ?? "",
        method: request.method ?? DEFAULT_METHOD,
        params: request.params ?? [],
        headers: request.headers ?? [],
        body: request.body ?? "",
        auth: request.auth ?? null,
    });
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Generate a simple Fetch expression.
 *
 * @param {string} url
 * @returns {string}
 */
export function generateSimpleFetch(
    url
) {
    return `fetch(${stringifyValue(
        url
    )})`;
}

/**
 * Check whether a request contains a body
 * that can be sent by its HTTP method.
 *
 * @param {Object} request
 * @returns {boolean}
 */
export function requestHasBody(
    request = {}
) {
    if (
        !methodSupportsBody(
            request.method
        )
    ) {
        return false;
    }

    return hasBody(
        request.body
    );
}

/**
 * Check whether an HTTP method supports
 * a request body.
 *
 * @param {string} method
 * @returns {boolean}
 */
export function supportsRequestBody(
    method
) {
    return methodSupportsBody(
        method
    );
}

// ============================================================
// Default Export
// ============================================================

export default generateFetchCode;