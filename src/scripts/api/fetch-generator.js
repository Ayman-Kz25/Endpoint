// src/scripts/api/fetch-generator.js

/**
 * Fetch Code Generator
 *
 * Responsible for generating JavaScript Fetch API code
 * from the application's request configuration.
 *
 * This module does not:
 * - send HTTP requests
 * - manipulate the DOM
 * - update application state
 * - show notifications
 *
 * It only converts request configuration into
 * executable JavaScript Fetch code.
 */

// ============================================================
// Constants
// ============================================================

const BODY_METHODS = [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
];

const DEFAULT_INDENT = "  ";

// ============================================================
// Helpers
// ============================================================

/**
 * Escape a value for use inside a JavaScript string.
 *
 * Uses JSON.stringify because it safely handles:
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
    return JSON.stringify(String(value ?? ""));
}

/**
 * Normalize an HTTP method.
 *
 * @param {string} method
 * @returns {string}
 */
function normalizeMethod(method = "GET") {
    return String(method).trim().toUpperCase() || "GET";
}

/**
 * Check whether an HTTP method normally supports a request body.
 *
 * @param {string} method
 * @returns {boolean}
 */
function methodSupportsBody(method) {
    return BODY_METHODS.includes(normalizeMethod(method));
}

/**
 * Normalize headers into a predictable array.
 *
 * Supports both:
 *
 * [
 *   { name: "Content-Type", value: "application/json" }
 * ]
 *
 * and:
 *
 * {
 *   "Content-Type": "application/json"
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
                name: String(header.name ?? "").trim(),
                value: String(header.value ?? ""),
            }))
            .filter((header) => header.name);
    }

    if (headers && typeof headers === "object") {
        return Object.entries(headers)
            .map(([name, value]) => ({
                name: String(name).trim(),
                value: String(value ?? ""),
            }))
            .filter((header) => header.name);
    }

    return [];
}

/**
 * Normalize query parameters.
 *
 * @param {Array|Object} params
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeParams(params = []) {
    if (Array.isArray(params)) {
        return params
            .filter(Boolean)
            .map((param) => ({
                name: String(
                    param.name ??
                    param.key ??
                    ""
                ).trim(),

                value: String(
                    param.value ?? ""
                ),
            }))
            .filter((param) => param.name);
    }

    if (params && typeof params === "object") {
        return Object.entries(params)
            .map(([name, value]) => ({
                name: String(name).trim(),
                value: String(value ?? ""),
            }))
            .filter((param) => param.name);
    }

    return [];
}

/**
 * Check whether a header already exists.
 *
 * Header names are case-insensitive.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {string} targetName
 * @returns {boolean}
 */
function hasHeader(headers, targetName) {
    const normalizedTarget = targetName.toLowerCase();

    return headers.some(
        (header) =>
            header.name.toLowerCase() === normalizedTarget
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
function addHeaderIfMissing(headers, name, value) {
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

/**
 * Build a URL including query parameters.
 *
 * Existing query parameters in the URL are preserved.
 *
 * @param {string} url
 * @param {Array|Object} params
 * @returns {string}
 */
export function buildFetchUrl(url, params = []) {
    const rawUrl = String(url ?? "").trim();

    if (!rawUrl) {
        return "";
    }

    const normalizedParams = normalizeParams(params);

    if (!normalizedParams.length) {
        return rawUrl;
    }

    try {
        const parsedUrl = new URL(rawUrl);

        normalizedParams.forEach(({ name, value }) => {
            parsedUrl.searchParams.set(name, value);
        });

        return parsedUrl.toString();
    } catch {
        /**
         * If the URL cannot be parsed, keep it as-is and
         * append the parameters manually.
         *
         * This lets the generator still produce useful
         * code while the request itself can later report
         * the invalid URL.
         */

        const separator = rawUrl.includes("?")
            ? rawUrl.endsWith("?") || rawUrl.endsWith("&")
                ? ""
                : "&"
            : "?";

        const query = normalizedParams
            .map(
                ({ name, value }) =>
                    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
            )
            .join("&");

        return `${rawUrl}${separator}${query}`;
    }
}

// ============================================================
// Authentication
// ============================================================

/**
 * Apply authentication configuration to generated headers.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {Object|null} auth
 * @returns {Array<{name: string, value: string}>}
 */
function applyAuthToHeaders(headers, auth) {
    if (!auth || typeof auth !== "object") {
        return headers;
    }

    const result = [...headers];

    // --------------------------------------------------------
    // Bearer Token
    // --------------------------------------------------------

    if (auth.type === "bearer") {
        const token = String(
            auth.fields?.token ?? ""
        ).trim();

        if (token && !hasHeader(result, "Authorization")) {
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
        const username = String(
            auth.fields?.username ?? ""
        );

        const password = String(
            auth.fields?.password ?? ""
        );

        if (
            (username || password) &&
            !hasHeader(result, "Authorization")
        ) {
            /**
             * We intentionally generate btoa() instead of
             * calculating the Base64 value here.
             *
             * This makes the generated code easier to edit.
             */

            result.push({
                name: "Authorization",
                value: `__BASIC_AUTH__:${username}:${password}`,
            });
        }
    }

    // --------------------------------------------------------
    // API Key
    // --------------------------------------------------------

    if (auth.type === "api-key") {
        const key = String(
            auth.fields?.key ?? ""
        ).trim();

        const value = String(
            auth.fields?.value ?? ""
        );

        const location =
            auth.fields?.location || "header";

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

// ============================================================
// Body Generation
// ============================================================

/**
 * Convert a request body into a JavaScript expression.
 *
 * JSON objects are generated using JSON.stringify.
 * Plain text is generated as a normal JavaScript string.
 *
 * @param {unknown} body
 * @returns {string|null}
 */
export function generateBodyExpression(body) {
    if (
        body === undefined ||
        body === null ||
        String(body).trim() === ""
    ) {
        return null;
    }

    if (typeof body === "object") {
        return JSON.stringify(body, null, 2);
    }

    const stringBody = String(body);

    /**
     * Try to recognize JSON entered as a string.
     *
     * Example:
     *
     * {
     *   "name": "John"
     * }
     *
     * becomes:
     *
     * JSON.stringify({
     *   "name": "John"
     * })
     */

    try {
        const parsed = JSON.parse(stringBody);

        return `JSON.stringify(${JSON.stringify(
            parsed,
            null,
            2
        )})`;
    } catch {
        return stringifyValue(stringBody);
    }
}

/**
 * Determine whether a Content-Type header should be
 * automatically generated for the request body.
 *
 * @param {unknown} body
 * @param {Array} headers
 * @returns {boolean}
 */
function shouldAddJsonContentType(body, headers) {
    if (
        body === undefined ||
        body === null ||
        String(body).trim() === ""
    ) {
        return false;
    }

    if (hasHeader(headers, "Content-Type")) {
        return false;
    }

    if (typeof body === "object") {
        return true;
    }

    try {
        JSON.parse(String(body));
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Header Generation
// ============================================================

/**
 * Generate the headers section of a fetch configuration.
 *
 * @param {Array<{name: string, value: string}>} headers
 * @returns {string}
 */
function generateHeaders(headers) {
    if (!headers.length) {
        return "";
    }

    const lines = headers.map(
        ({ name, value }) =>
            `${DEFAULT_INDENT}${DEFAULT_INDENT}${stringifyValue(
                name
            )}: ${stringifyValue(value)}`
    );

    return [
        `${DEFAULT_INDENT}headers: {`,
        lines.join(",\n"),
        `${DEFAULT_INDENT}},`,
    ].join("\n");
}

// ============================================================
// Fetch Configuration
// ============================================================

/**
 * Generate the fetch options object.
 *
 * @param {Object} options
 * @returns {string}
 */
function generateFetchOptions({
    method,
    headers,
    body,
}) {
    const configLines = [];

    configLines.push(
        `${DEFAULT_INDENT}method: ${stringifyValue(method)},`
    );

    const headerBlock = generateHeaders(headers);

    if (headerBlock) {
        configLines.push(headerBlock);
    }

    const bodyExpression = generateBodyExpression(body);

    if (
        bodyExpression &&
        methodSupportsBody(method)
    ) {
        configLines.push(
            `${DEFAULT_INDENT}body: ${bodyExpression},`
        );
    }

    return [
        "{",
        configLines.join("\n"),
        "}",
    ].join("\n");
}

// ============================================================
// Basic Auth Special Handling
// ============================================================

/**
 * Replace the internal Basic Auth marker with a generated
 * btoa() expression.
 *
 * @param {string} code
 * @param {Object|null} auth
 * @returns {string}
 */
function replaceBasicAuthMarker(code, auth) {
    if (auth?.type !== "basic") {
        return code;
    }

    const username = String(
        auth.fields?.username ?? ""
    );

    const password = String(
        auth.fields?.password ?? ""
    );

    if (!username && !password) {
        return code;
    }

    const encodedExpression =
        `\`Basic \${btoa(${stringifyValue(
            `${username}:${password}`
        )})}\``;

    return code.replace(
        `"__BASIC_AUTH__:${username}:${password}"`,
        encodedExpression
    );
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
    method = "GET",
    params = [],
    headers = [],
    body = "",
    auth = null,
}) {
    const normalizedMethod = normalizeMethod(method);

    const fetchUrl = buildFetchUrl(
        url,
        params
    );

    let normalizedHeaders = normalizeHeaders(
        headers
    );

    normalizedHeaders = applyAuthToHeaders(
        normalizedHeaders,
        auth
    );

    if (
        shouldAddJsonContentType(
            body,
            normalizedHeaders
        )
    ) {
        normalizedHeaders = addHeaderIfMissing(
            normalizedHeaders,
            "Content-Type",
            "application/json"
        );
    }

    const fetchOptions = generateFetchOptions({
        method: normalizedMethod,
        headers: normalizedHeaders,
        body,
    });

    let code;

    if (
        !normalizedHeaders.length &&
        !generateBodyExpression(body) &&
        normalizedMethod === "GET"
    ) {
        code = `const response = await fetch(${stringifyValue(
            fetchUrl
        )});

const data = await response.json();

console.log(data);`;
    } else {
        code = `const response = await fetch(
    ${stringifyValue(fetchUrl)},
    ${fetchOptions}
);

const data = await response.json();

console.log(data);`;
    }

    return replaceBasicAuthMarker(
        code,
        auth
    );
}

// ============================================================
// Request Object Adapter
// ============================================================

/**
 * Generate Fetch code directly from your application's
 * request state object.
 *
 * This allows code-generator.js to simply pass:
 *
 * state.request
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchFromRequest(request = {}) {
    return generateFetchCode({
        url: request.url ?? "",
        method: request.method ?? "GET",
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
 * Generate a compact one-line Fetch expression.
 *
 * Useful for simple GET requests.
 *
 * @param {string} url
 * @returns {string}
 */
export function generateSimpleFetch(url) {
    return `fetch(${stringifyValue(url)})`;
}

/**
 * Check whether generated code contains a request body.
 *
 * @param {Object} request
 * @returns {boolean}
 */
export function requestHasBody(request = {}) {
    if (!methodSupportsBody(request.method)) {
        return false;
    }

    return (
        request.body !== undefined &&
        request.body !== null &&
        String(request.body).trim() !== ""
    );
}

/**
 * Return the normalized request data used by the generator.
 *
 * This can be useful when you later add other code generators,
 * such as Axios, cURL, Python Requests, or Node.js.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function normalizeFetchRequest(request = {}) {
    const method = normalizeMethod(
        request.method
    );

    let headers = normalizeHeaders(
        request.headers
    );

    headers = applyAuthToHeaders(
        headers,
        request.auth
    );

    const body = request.body ?? "";

    if (
        shouldAddJsonContentType(
            body,
            headers
        )
    ) {
        headers = addHeaderIfMissing(
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
        auth: request.auth ?? null,
    };
}

export default generateFetchCode;