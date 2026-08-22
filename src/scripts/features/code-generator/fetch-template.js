// src/scripts/features/code-generator/fetch-template.js

/**
 * Fetch Code Template
 *
 * Generates a JavaScript Fetch API example from a normalized request object.
 *
 * Responsibilities:
 * - Convert request configuration into executable Fetch code
 * - Build the request URL with query parameters
 * - Generate headers and authentication
 * - Generate request bodies safely
 *
 * This module does not:
 * - execute requests
 * - manipulate the DOM
 * - update application state
 * - render UI
 */

/**
 * Escape a value for use inside a JavaScript string literal.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeString(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${");
}

/**
 * Create a JavaScript string literal using template literals.
 *
 * @param {unknown} value
 * @returns {string}
 */
function toTemplateLiteral(value) {
    return `\`${escapeString(value)}\``;
}

/**
 * Check whether a value is a plain object.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

/**
 * Format a JavaScript value for generated source code.
 *
 * @param {unknown} value
 * @param {number} [indent=0]
 * @returns {string}
 */
function formatJavaScriptValue(value, indent = 0) {
    if (value === null) {
        return "null";
    }

    if (typeof value === "string") {
        return JSON.stringify(value);
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "[]";
        }

        const padding = " ".repeat(indent);
        const childPadding = " ".repeat(indent + 4);

        return `[\n${value
            .map(
                (item) =>
                    `${childPadding}${formatJavaScriptValue(
                        item,
                        indent + 4,
                    )}`,
            )
            .join(",\n")}\n${padding}]`;
    }

    if (isPlainObject(value)) {
        const entries = Object.entries(value);

        if (entries.length === 0) {
            return "{}";
        }

        const padding = " ".repeat(indent);
        const childPadding = " ".repeat(indent + 4);

        return `{\n${entries
            .map(([key, item]) => {
                const propertyName = /^[A-Za-z_$][\w$]*$/.test(key)
                    ? key
                    : JSON.stringify(key);

                return `${childPadding}${propertyName}: ${formatJavaScriptValue(
                    item,
                    indent + 4,
                )}`;
            })
            .join(",\n")}\n${padding}}`;
    }

    return JSON.stringify(String(value));
}

/**
 * Normalize a request object.
 *
 * @param {Object} request
 * @returns {Object}
 */
function normalizeRequest(request = {}) {
    return {
        method: String(request.method || "GET").toUpperCase(),
        url: String(request.url || "").trim(),
        params: Array.isArray(request.params)
            ? request.params
            : [],
        headers: Array.isArray(request.headers)
            ? request.headers
            : [],
        body: request.body ?? "",
        auth: {
            type: request.auth?.type || "none",
            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };
}

/**
 * Build a URL containing enabled query parameters.
 *
 * @param {Object} request
 * @returns {string}
 */
function buildRequestUrl(request) {
    if (!request.url) {
        return "";
    }

    let url;

    try {
        url = new URL(request.url);
    } catch {
        return request.url;
    }

    if (Array.isArray(request.params)) {
        request.params.forEach((param) => {
            if (!param || param.enabled === false) {
                return;
            }

            const key = String(param.key ?? "").trim();
            const value = String(param.value ?? "");

            if (!key) {
                return;
            }

            url.searchParams.set(key, value);
        });
    }

    const auth = request.auth;

    if (
        auth?.type === "api-key" &&
        auth.fields?.location === "query"
    ) {
        const key = String(auth.fields?.key ?? "").trim();
        const value = String(auth.fields?.value ?? "");

        if (key && value) {
            url.searchParams.set(key, value);
        }
    }

    return url.href;
}

/**
 * Add authentication headers to a header map.
 *
 * @param {Object} request
 * @param {Map<string, string>} headerMap
 */
function applyAuthentication(request, headerMap) {
    const auth = request.auth;

    if (!auth || auth.type === "none") {
        return;
    }

    if (auth.type === "bearer") {
        const token = String(auth.fields?.token ?? "").trim();

        if (token) {
            headerMap.set("Authorization", `Bearer ${token}`);
        }

        return;
    }

    if (auth.type === "basic") {
        const username = String(auth.fields?.username ?? "");
        const password = String(auth.fields?.password ?? "");

        if (username || password) {
            const credentials = `${username}:${password}`;

            headerMap.set(
                "Authorization",
                `Basic ${credentials}`,
            );
        }

        return;
    }

    if (auth.type === "api-key") {
        const key = String(auth.fields?.key ?? "").trim();
        const value = String(auth.fields?.value ?? "");
        const location = auth.fields?.location || "header";

        if (
            key &&
            value &&
            location === "header"
        ) {
            headerMap.set(key, value);
        }
    }
}

/**
 * Build the final request headers.
 *
 * @param {Object} request
 * @returns {Object}
 */
function buildHeaders(request) {
    const headers = new Map();

    request.headers.forEach((header) => {
        if (!header) {
            return;
        }

        const name = String(header.name ?? "").trim();
        const value = String(header.value ?? "");

        if (!name) {
            return;
        }

        headers.set(name, value);
    });

    applyAuthentication(request, headers);

    return Object.fromEntries(headers);
}

/**
 * Convert headers into generated JavaScript.
 *
 * @param {Object} headers
 * @returns {string}
 */
function generateHeaders(headers) {
    const entries = Object.entries(headers);

    if (entries.length === 0) {
        return "";
    }

    return `    headers: ${formatJavaScriptValue(
        headers,
        4,
    )},`;
}

/**
 * Determine whether a request has a usable body.
 *
 * @param {Object} request
 * @returns {boolean}
 */
function hasRequestBody(request) {
    if (
        request.method === "GET" ||
        request.method === "HEAD"
    ) {
        return false;
    }

    if (
        request.body === null ||
        request.body === undefined
    ) {
        return false;
    }

    if (
        typeof request.body === "string" &&
        request.body.trim() === ""
    ) {
        return false;
    }

    return true;
}

/**
 * Try to parse a body as JSON.
 *
 * @param {unknown} body
 * @returns {{ parsed: boolean, value: unknown }}
 */
function parseJsonBody(body) {
    if (typeof body !== "string") {
        return {
            parsed: isPlainObject(body) || Array.isArray(body),
            value: body,
        };
    }

    const trimmed = body.trim();

    if (!trimmed) {
        return {
            parsed: false,
            value: body,
        };
    }

    try {
        return {
            parsed: true,
            value: JSON.parse(trimmed),
        };
    } catch {
        return {
            parsed: false,
            value: body,
        };
    }
}

/**
 * Generate a request body.
 *
 * JSON bodies are emitted through JSON.stringify so the generated
 * code sends valid JSON instead of a JavaScript object directly.
 *
 * @param {Object} request
 * @returns {string}
 */
function generateBody(request) {
    if (!hasRequestBody(request)) {
        return "";
    }

    const parsed = parseJsonBody(request.body);

    if (parsed.parsed) {
        return `    body: JSON.stringify(${formatJavaScriptValue(
            parsed.value,
            4,
        )}),`;
    }

    return `    body: ${toTemplateLiteral(request.body)},`;
}

/**
 * Generate the Fetch API request configuration.
 *
 * @param {Object} request
 * @returns {string}
 */
function generateRequestOptions(request) {
    const headers = buildHeaders(request);
    const lines = [
        `    method: ${JSON.stringify(request.method)},`,
    ];

    const generatedHeaders = generateHeaders(headers);

    if (generatedHeaders) {
        lines.push(generatedHeaders);
    }

    const generatedBody = generateBody(request);

    if (generatedBody) {
        lines.push(generatedBody);
    }

    return `{\n${lines.join("\n")}\n}`;
}

/**
 * Generate a complete Fetch API example.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchTemplate(request = {}) {
    const normalizedRequest = normalizeRequest(request);
    const url = buildRequestUrl(normalizedRequest);

    const urlValue = url
        ? toTemplateLiteral(url)
        : '""';

    const options = generateRequestOptions(normalizedRequest);

    return `const response = await fetch(
    ${urlValue},
    ${options},
);

const data = await response.json();

console.log(data);`;
}

/**
 * Generate a Fetch example that handles both JSON and text responses.
 *
 * This version is useful when the response content type is unknown.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchTemplateWithResponseHandling(
    request = {},
) {
    const normalizedRequest = normalizeRequest(request);
    const url = buildRequestUrl(normalizedRequest);

    const urlValue = url
        ? toTemplateLiteral(url)
        : '""';

    const options = generateRequestOptions(normalizedRequest);

    return `const response = await fetch(
    ${urlValue},
    ${options},
);

const contentType = response.headers.get("content-type") || "";

const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

if (!response.ok) {
    throw new Error(
        \`HTTP error: \${response.status} \${response.statusText}\`,
    );
}

console.log(data);`;
}

/**
 * Generate a Fetch example using a reusable async function.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchFunction(request = {}) {
    const normalizedRequest = normalizeRequest(request);
    const url = buildRequestUrl(normalizedRequest);

    const urlValue = url
        ? toTemplateLiteral(url)
        : '""';

    const options = generateRequestOptions(normalizedRequest);

    return `async function sendRequest() {
    const response = await fetch(
        ${urlValue},
        ${options},
    );

    const contentType =
        response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(
            \`HTTP error: \${response.status} \${response.statusText}\`,
        );
    }

    return data;
}

sendRequest()
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        console.error(error);
    });`;
}

/**
 * Build a normalized request suitable for code generation.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function normalizeFetchRequest(request = {}) {
    const normalizedRequest = normalizeRequest(request);

    return {
        ...normalizedRequest,
        url: buildRequestUrl(normalizedRequest),
        headers: buildHeaders(normalizedRequest),
    };
}

/**
 * Get the final generated URL without modifying the request.
 *
 * @param {Object} request
 * @returns {string}
 */
export function getFetchRequestUrl(request = {}) {
    return buildRequestUrl(normalizeRequest(request));
}

/**
 * Get the headers that will be used by the generated Fetch request.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function getFetchRequestHeaders(request = {}) {
    return buildHeaders(normalizeRequest(request));
}

/**
 * Default export.
 */
export default {
    generateFetchTemplate,
    generateFetchTemplateWithResponseHandling,
    generateFetchFunction,
    normalizeFetchRequest,
    getFetchRequestUrl,
    getFetchRequestHeaders,
};