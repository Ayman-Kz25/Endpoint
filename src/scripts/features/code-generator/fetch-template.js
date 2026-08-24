// src/scripts/features/code-generator/fetch-template.js

/**
 * Fetch Code Template
 *
 * Generates JavaScript Fetch API examples from a request configuration.
 *
 * Responsibilities:
 * - Generate Fetch API source code
 * - Build request URLs with enabled query parameters
 * - Generate request headers
 * - Generate authentication
 * - Generate request bodies
 *
 * This module does not:
 * - execute requests
 * - manipulate the DOM
 * - update application state
 * - show notifications
 */

import {
    AUTH_TYPES,
} from "../../core/constants.js";

// ============================================================
// Helpers
// ============================================================

/**
 * Normalize a request object for Fetch code generation.
 *
 * @param {Object} request
 * @returns {Object}
 */
function normalizeRequest(request = {}) {
    return {
        method: String(
            request.method || "GET",
        ).toUpperCase(),

        url: String(
            request.url || "",
        ).trim(),

        params: Array.isArray(request.params)
            ? request.params
            : [],

        headers: Array.isArray(request.headers)
            ? request.headers
            : [],

        body:
            request.body === undefined ||
            request.body === null
                ? ""
                : request.body,

        auth: {
            type:
                request.auth?.type ||
                AUTH_TYPES.NONE,

            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };
}

/**
 * Escape a value for generated JavaScript source.
 *
 * JSON string literals are used instead of template literals because
 * JSON.stringify safely handles quotes, backslashes, newlines, and
 * interpolation characters.
 *
 * @param {unknown} value
 * @returns {string}
 */
function stringifyJavaScript(value) {
    return JSON.stringify(
        String(value ?? ""),
    );
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
 * Format a JavaScript value for generated source.
 *
 * @param {unknown} value
 * @param {number} indent
 * @returns {string}
 */
function formatJavaScriptValue(
    value,
    indent = 0,
) {
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
        const childPadding =
            " ".repeat(indent + 4);

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
        const childPadding =
            " ".repeat(indent + 4);

        return `{\n${entries
            .map(([key, item]) => {
                const propertyName =
                    /^[A-Za-z_$][\w$]*$/.test(key)
                        ? key
                        : JSON.stringify(key);

                return `${childPadding}${propertyName}: ${formatJavaScriptValue(
                    item,
                    indent + 4,
                )}`;
            })
            .join(",\n")}\n${padding}}`;
    }

    return JSON.stringify(
        String(value),
    );
}

/**
 * Get enabled query parameters.
 *
 * @param {Array} params
 * @returns {Array<{key: string, value: string}>}
 */
function getEnabledParams(params = []) {
    if (!Array.isArray(params)) {
        return [];
    }

    return params
        .filter(
            (param) =>
                param &&
                typeof param === "object" &&
                param.enabled !== false,
        )
        .map((param) => ({
            key: String(
                param.key ?? "",
            ).trim(),

            value: String(
                param.value ?? "",
            ),
        }))
        .filter((param) => Boolean(param.key));
}

/**
 * Build the final request URL.
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
        url = new URL(
            request.url,
        );
    } catch {
        return request.url;
    }

    getEnabledParams(
        request.params,
    ).forEach((param) => {
        url.searchParams.set(
            param.key,
            param.value,
        );
    });

    const auth = request.auth;

    if (
        auth?.type === AUTH_TYPES.API_KEY &&
        auth.fields?.location === "query"
    ) {
        const key = String(
            auth.fields?.key ?? "",
        ).trim();

        const value = String(
            auth.fields?.value ?? "",
        );

        if (key && value) {
            url.searchParams.set(
                key,
                value,
            );
        }
    }

    return url.href;
}

/**
 * Get enabled request headers.
 *
 * @param {Array} headers
 * @returns {Array<{name: string, value: string}>}
 */
function getEnabledHeaders(headers = []) {
    if (!Array.isArray(headers)) {
        return [];
    }

    return headers
        .filter(
            (header) =>
                header &&
                typeof header === "object" &&
                header.enabled !== false,
        )
        .map((header) => ({
            name: String(
                header.name ?? "",
            ).trim(),

            value: String(
                header.value ?? "",
            ),
        }))
        .filter((header) => Boolean(header.name));
}

/**
 * Add a header while treating header names as case-insensitive.
 *
 * @param {Map<string, Object>} headers
 * @param {string} name
 * @param {string} value
 */
function setHeader(
    headers,
    name,
    value,
) {
    const target = name.toLowerCase();

    for (const existingName of headers.keys()) {
        if (
            existingName.toLowerCase() ===
            target
        ) {
            headers.delete(
                existingName,
            );

            break;
        }
    }

    headers.set(name, {
        name,
        value,
    });
}

/**
 * Build request headers including authentication.
 *
 * @param {Object} request
 * @returns {Array<{name: string, value: string}>}
 */
function buildHeaders(request) {
    const headers = new Map();

    getEnabledHeaders(
        request.headers,
    ).forEach((header) => {
        setHeader(
            headers,
            header.name,
            header.value,
        );
    });

    applyAuthentication(
        request,
        headers,
    );

    return Array.from(
        headers.values(),
    );
}

/**
 * Add authentication headers.
 *
 * @param {Object} request
 * @param {Map<string, Object>} headers
 */
function applyAuthentication(
    request,
    headers,
) {
    const auth = request.auth;

    if (
        !auth ||
        auth.type === AUTH_TYPES.NONE
    ) {
        return;
    }

    const fields =
        auth.fields || {};

    if (
        auth.type === AUTH_TYPES.BEARER
    ) {
        const token = String(
            fields.token ?? "",
        ).trim();

        if (token) {
            setHeader(
                headers,
                "Authorization",
                `Bearer ${token}`,
            );
        }

        return;
    }

    if (
        auth.type === AUTH_TYPES.BASIC
    ) {
        const username = String(
            fields.username ?? "",
        );

        const password = String(
            fields.password ?? "",
        );

        if (
            username ||
            password
        ) {
            const credentials =
                `${username}:${password}`;

            const encoded =
                encodeBase64(
                    credentials,
                );

            setHeader(
                headers,
                "Authorization",
                `Basic ${encoded}`,
            );
        }

        return;
    }

    if (
        auth.type === AUTH_TYPES.API_KEY
    ) {
        const key = String(
            fields.key ?? "",
        ).trim();

        const value = String(
            fields.value ?? "",
        );

        const location =
            fields.location ||
            "header";

        if (
            key &&
            value &&
            location === "header"
        ) {
            setHeader(
                headers,
                key,
                value,
            );
        }
    }
}

/**
 * Encode Basic Auth credentials.
 *
 * The generated source should perform the encoding at runtime.
 * This function only exists for compatibility when this module
 * is used to inspect or prepare request data directly.
 *
 * @param {string} value
 * @returns {string}
 */
function encodeBase64(value) {
    try {
        if (
            typeof btoa === "function"
        ) {
            return btoa(value);
        }
    } catch {
        // Fall through.
    }

    return value;
}

/**
 * Determine whether the request can contain a body.
 *
 * @param {Object} request
 * @returns {boolean}
 */
function hasRequestBody(request) {
    if (
        ["GET", "HEAD"].includes(
            request.method,
        )
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
        !request.body.trim()
    ) {
        return false;
    }

    return true;
}

/**
 * Parse a request body as JSON when possible.
 *
 * @param {unknown} body
 * @returns {{parsed: boolean, value: unknown}}
 */
function parseJsonBody(body) {
    if (
        typeof body !== "string"
    ) {
        return {
            parsed:
                isPlainObject(body) ||
                Array.isArray(body),

            value: body,
        };
    }

    const text =
        body.trim();

    if (!text) {
        return {
            parsed: false,
            value: body,
        };
    }

    try {
        return {
            parsed: true,
            value: JSON.parse(text),
        };
    } catch {
        return {
            parsed: false,
            value: body,
        };
    }
}

/**
 * Generate the request body.
 *
 * @param {Object} request
 * @returns {string}
 */
function generateBody(request) {
    if (
        !hasRequestBody(request)
    ) {
        return "";
    }

    const parsed =
        parseJsonBody(
            request.body,
        );

    if (parsed.parsed) {
        return `    body: JSON.stringify(${formatJavaScriptValue(
            parsed.value,
            4,
        )}),`;
    }

    return `    body: ${stringifyJavaScript(
        request.body,
    )},`;
}

/**
 * Convert headers into a JavaScript object.
 *
 * @param {Array} headers
 * @returns {string}
 */
function generateHeaders(headers) {
    if (!headers.length) {
        return "";
    }

    const headerObject = {};

    headers.forEach(
        (header) => {
            headerObject[
                header.name
            ] = header.value;
        },
    );

    return `    headers: ${formatJavaScriptValue(
        headerObject,
        4,
    )},`;
}

/**
 * Generate Fetch request options.
 *
 * @param {Object} request
 * @returns {string}
 */
function generateRequestOptions(
    request,
) {
    const headers =
        buildHeaders(request);

    const lines = [
        `    method: ${JSON.stringify(
            request.method,
        )},`,
    ];

    const generatedHeaders =
        generateHeaders(
            headers,
        );

    if (generatedHeaders) {
        lines.push(
            generatedHeaders,
        );
    }

    const generatedBody =
        generateBody(request);

    if (generatedBody) {
        lines.push(
            generatedBody,
        );
    }

    return `{\n${lines.join(
        "\n",
    )}\n}`;
}

/**
 * Generate the URL expression used by Fetch.
 *
 * @param {string} url
 * @returns {string}
 */
function generateUrlExpression(
    url,
) {
    return url
        ? stringifyJavaScript(url)
        : '""';
}

// ============================================================
// Public Generators
// ============================================================

/**
 * Generate a basic Fetch API example.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchTemplate(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    const url =
        buildRequestUrl(
            normalized,
        );

    const options =
        generateRequestOptions(
            normalized,
        );

    return `const response = await fetch(
    ${generateUrlExpression(url)},
    ${options},
);

const data = await response.text();

console.log(data);`;
}

/**
 * Generate a Fetch example that supports JSON and text responses.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchTemplateWithResponseHandling(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    const url =
        buildRequestUrl(
            normalized,
        );

    const options =
        generateRequestOptions(
            normalized,
        );

    return `const response = await fetch(
    ${generateUrlExpression(url)},
    ${options},
);

const contentType =
    response.headers.get("content-type") || "";

const data =
    contentType.includes("application/json")
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
 * Generate a reusable Fetch request function.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateFetchFunction(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    const url =
        buildRequestUrl(
            normalized,
        );

    const options =
        generateRequestOptions(
            normalized,
        );

    return `async function sendRequest() {
    const response = await fetch(
        ${generateUrlExpression(url)},
        ${options},
    );

    const contentType =
        response.headers.get("content-type") || "";

    const data =
        contentType.includes("application/json")
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

// ============================================================
// Request Helpers
// ============================================================

/**
 * Build a normalized Fetch request.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function normalizeFetchRequest(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    return {
        ...normalized,

        url: buildRequestUrl(
            normalized,
        ),

        headers: buildHeaders(
            normalized,
        ),
    };
}

/**
 * Get the final Fetch URL.
 *
 * @param {Object} request
 * @returns {string}
 */
export function getFetchRequestUrl(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    return buildRequestUrl(
        normalized,
    );
}

/**
 * Get the final Fetch headers.
 *
 * @param {Object} request
 * @returns {Array<{name: string, value: string}>}
 */
export function getFetchRequestHeaders(
    request = {},
) {
    const normalized =
        normalizeRequest(
            request,
        );

    return buildHeaders(
        normalized,
    );
}

// ============================================================
// Default Export
// ============================================================

export default {
    generateFetchTemplate,
    generateFetchTemplateWithResponseHandling,
    generateFetchFunction,
    normalizeFetchRequest,
    getFetchRequestUrl,
    getFetchRequestHeaders,
};