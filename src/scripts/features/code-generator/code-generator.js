/**
 * Code Generator Feature
 *
 * Provides the UI-facing code generation layer for the application.
 *
 * Responsibilities:
 * - Manage supported code-generator languages
 * - Convert the current request into generated client code
 * - Delegate Fetch generation to the API Fetch generator
 * - Provide generators for other supported clients
 * - Manage the code-generator UI
 * - Copy generated code to the clipboard
 *
 * This module does not:
 * - execute HTTP requests
 * - modify application state
 * - show notifications
 * - directly manage request form state
 */

import {
    generateFetchFromRequest,
} from "../../api/fetch-generator.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_LANGUAGE = "javascript-fetch";

const SUPPORTED_LANGUAGES = Object.freeze([
    {
        id: "javascript-fetch",
        label: "JavaScript Fetch",
    },
    {
        id: "javascript-axios",
        label: "JavaScript Axios",
    },
    {
        id: "curl",
        label: "cURL",
    },
    {
        id: "python-requests",
        label: "Python Requests",
    },
    {
        id: "node-fetch",
        label: "Node.js Fetch",
    },
]);

const BODY_METHODS = new Set([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
]);

// ============================================================
// Internal UI State
// ============================================================

const elements = {
    language: null,
    output: null,
    copyButton: null,
};

let currentRequest = null;

// ============================================================
// Request Normalization
// ============================================================

/**
 * Normalize a request object before generation.
 *
 * @param {Object} request
 * @returns {Object}
 */
function normalizeRequest(request = {}) {
    const auth = request.auth;

    return {
        method:
            String(request.method ?? "GET")
                .trim()
                .toUpperCase() || "GET",

        url:
            String(request.url ?? "").trim(),

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

        auth:
            auth && typeof auth === "object"
                ? {
                      type:
                          String(
                              auth.type ?? "none",
                          ).trim() || "none",

                      fields:
                          auth.fields &&
                          typeof auth.fields === "object"
                              ? {
                                    ...auth.fields,
                                }
                              : {},
                  }
                : {
                      type: "none",
                      fields: {},
                  },
    };
}

// ============================================================
// Generic Helpers
// ============================================================

/**
 * Check whether a request method supports a body.
 *
 * @param {string} method
 * @returns {boolean}
 */
function methodSupportsBody(method) {
    return BODY_METHODS.has(
        String(method ?? "")
            .trim()
            .toUpperCase(),
    );
}

/**
 * Escape a value for JavaScript source code.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeJavaScript(value) {
    return JSON.stringify(
        String(value ?? ""),
    );
}

/**
 * Escape a value for Python source code.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapePython(value) {
    return JSON.stringify(
        String(value ?? ""),
    );
}

/**
 * Escape a value for shell source.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeShell(value) {
    const string = String(value ?? "");

    return `'${string.replace(
        /'/g,
        `'\\''`,
    )}'`;
}

/**
 * Check whether a value contains usable request body data.
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

    return String(body).trim() !== "";
}

/**
 * Check whether a body contains valid JSON.
 *
 * @param {unknown} body
 * @returns {boolean}
 */
function isJsonBody(body) {
    if (!hasBody(body)) {
        return false;
    }

    if (
        typeof body === "object" &&
        body !== null
    ) {
        return true;
    }

    try {
        JSON.parse(String(body));
        return true;
    } catch {
        return false;
    }
}

/**
 * Format JSON body for generated source code.
 *
 * @param {unknown} body
 * @returns {string}
 */
function formatJsonBody(body) {
    if (
        body !== null &&
        typeof body === "object"
    ) {
        return JSON.stringify(
            body,
            null,
            2,
        );
    }

    const stringBody = String(
        body ?? "",
    );

    try {
        return JSON.stringify(
            JSON.parse(stringBody),
            null,
            2,
        );
    } catch {
        return stringBody;
    }
}

/**
 * Normalize headers.
 *
 * @param {Array|Object} headers
 * @returns {Array<{name: string, value: string}>}
 */
function normalizeHeaders(headers = []) {
    if (Array.isArray(headers)) {
        return headers
            .filter(Boolean)
            .filter(
                (header) =>
                    header.enabled !== false,
            )
            .map((header) => ({
                name: String(
                    header.name ??
                        header.key ??
                        "",
                ).trim(),

                value: String(
                    header.value ?? "",
                ),
            }))
            .filter(
                (header) => header.name,
            );
    }

    if (
        headers &&
        typeof headers === "object"
    ) {
        return Object.entries(headers)
            .map(([name, value]) => ({
                name: String(name).trim(),
                value: String(
                    value ?? "",
                ),
            }))
            .filter(
                (header) => header.name,
            );
    }

    return [];
}

/**
 * Check whether a header exists.
 *
 * Header names are case-insensitive.
 *
 * @param {Array} headers
 * @param {string} name
 * @returns {boolean}
 */
function hasHeader(headers, name) {
    const target = String(
        name ?? "",
    ).toLowerCase();

    return headers.some(
        (header) =>
            header.name.toLowerCase() ===
            target,
    );
}

/**
 * Add authentication information to headers.
 *
 * @param {Object} request
 * @param {Array} headers
 * @returns {Array}
 */
function getRequestHeaders(request) {
    const headers = normalizeHeaders(
        request.headers,
    );

    const auth = request.auth || {};
    const fields = auth.fields || {};

    if (
        auth.type === "bearer" &&
        !hasHeader(
            headers,
            "Authorization",
        )
    ) {
        const token = String(
            fields.token ?? "",
        ).trim();

        if (token) {
            headers.push({
                name: "Authorization",
                value: `Bearer ${token}`,
            });
        }
    }

    if (
        auth.type === "basic" &&
        !hasHeader(
            headers,
            "Authorization",
        )
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
            headers.push({
                name: "Authorization",
                value: `Basic ${encodeBasicAuth(
                    username,
                    password,
                )}`,
            });
        }
    }

    if (
        auth.type === "api-key" &&
        auth.fields?.location ===
            "header"
    ) {
        const key = String(
            fields.key ?? "",
        ).trim();

        const value = String(
            fields.value ?? "",
        );

        if (
            key &&
            value &&
            !hasHeader(headers, key)
        ) {
            headers.push({
                name: key,
                value,
            });
        }
    }

    return headers;
}

/**
 * Encode Basic Authentication credentials.
 *
 * @param {string} username
 * @param {string} password
 * @returns {string}
 */
function encodeBasicAuth(
    username,
    password,
) {
    const value =
        `${username}:${password}`;

    if (
        typeof btoa === "function"
    ) {
        try {
            return btoa(value);
        } catch {
            // Continue to fallback.
        }
    }

    return value;
}

/**
 * Build a request URL including enabled parameters.
 *
 * @param {Object} request
 * @returns {string}
 */
export function buildRequestUrl(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    if (!normalized.url) {
        return "";
    }

    let url;

    try {
        url = new URL(
            normalized.url,
        );
    } catch {
        return normalized.url;
    }

    normalized.params
        .filter(Boolean)
        .filter(
            (param) =>
                param.enabled !== false,
        )
        .forEach((param) => {
            const key = String(
                param.name ??
                    param.key ??
                    "",
            ).trim();

            if (!key) {
                return;
            }

            const value = String(
                param.value ?? "",
            );

            url.searchParams.set(
                key,
                value,
            );
        });

    const auth =
        normalized.auth;

    if (
        auth.type === "api-key" &&
        auth.fields?.location ===
            "query"
    ) {
        const key = String(
            auth.fields.key ?? "",
        ).trim();

        const value = String(
            auth.fields.value ?? "",
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

// ============================================================
// JavaScript Fetch
// ============================================================

/**
 * Generate JavaScript Fetch code.
 *
 * The actual Fetch syntax is delegated to
 * api/fetch-generator.js.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateJavaScriptFetch(
    request = {},
) {
    return generateFetchFromRequest(
        normalizeRequest(request),
    );
}

// ============================================================
// JavaScript Axios
// ============================================================

/**
 * Generate JavaScript Axios code.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateJavaScriptAxios(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const url =
        buildRequestUrl(normalized);

    const headers =
        getRequestHeaders(normalized);

    const body =
        normalized.body;

    const lines = [
        `const response = await axios({`,
        `  method: ${escapeJavaScript(
            normalized.method,
        )},`,
        `  url: ${escapeJavaScript(
            url,
        )},`,
    ];

    if (headers.length) {
        lines.push(
            "  headers: {",
        );

        headers.forEach(
            (header) => {
                lines.push(
                    `    ${escapeJavaScript(
                        header.name,
                    )}: ${escapeJavaScript(
                        header.value,
                    )},`,
                );
            },
        );

        lines.push("  },");
    }

    if (
        hasBody(body) &&
        methodSupportsBody(
            normalized.method,
        )
    ) {
        if (isJsonBody(body)) {
            lines.push(
                `  data: ${formatJsonBody(
                    body,
                )},`,
            );
        } else {
            lines.push(
                `  data: ${escapeJavaScript(
                    body,
                )},`,
            );
        }
    }

    lines.push("});");
    lines.push("");
    lines.push(
        "console.log(response.data);",
    );

    return lines.join("\n");
}

// ============================================================
// Node.js Fetch
// ============================================================

/**
 * Generate Node.js Fetch code.
 *
 * Node.js uses the standard Fetch API in modern
 * Node.js versions.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateNodeFetch(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const url =
        buildRequestUrl(normalized);

    const headers =
        getRequestHeaders(normalized);

    const body =
        normalized.body;

    const lines = [
        `const response = await fetch(${escapeJavaScript(
            url,
        )}, {`,
        `  method: ${escapeJavaScript(
            normalized.method,
        )},`,
    ];

    if (headers.length) {
        lines.push(
            "  headers: {",
        );

        headers.forEach(
            (header) => {
                lines.push(
                    `    ${escapeJavaScript(
                        header.name,
                    )}: ${escapeJavaScript(
                        header.value,
                    )},`,
                );
            },
        );

        lines.push("  },");
    }

    if (
        hasBody(body) &&
        methodSupportsBody(
            normalized.method,
        )
    ) {
        lines.push(
            `  body: ${escapeJavaScript(
                body,
            )},`,
        );
    }

    lines.push("});");
    lines.push("");
    lines.push(
        "const data = await response.text();",
    );
    lines.push(
        "console.log(data);",
    );

    return lines.join("\n");
}

// ============================================================
// cURL
// ============================================================

/**
 * Generate cURL code.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateCurl(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const url =
        buildRequestUrl(normalized);

    const headers =
        getRequestHeaders(normalized);

    const body =
        normalized.body;

    const lines = [
        `curl ${escapeShell(url)}`,
    ];

    if (
        normalized.method !== "GET"
    ) {
        lines.push(
            `  -X ${escapeShell(
                normalized.method,
            )}`,
        );
    }

    headers.forEach(
        (header) => {
            lines.push(
                `  -H ${escapeShell(
                    `${header.name}: ${header.value}`,
                )}`,
            );
        },
    );

    if (
        hasBody(body) &&
        methodSupportsBody(
            normalized.method,
        )
    ) {
        lines.push(
            `  --data-raw ${escapeShell(
                body,
            )}`,
        );
    }

    return lines.join(
        " \\\n",
    );
}

// ============================================================
// Python Requests
// ============================================================

/**
 * Generate Python Requests code.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generatePythonRequests(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const url =
        buildRequestUrl(normalized);

    const headers =
        getRequestHeaders(normalized);

    const body =
        normalized.body;

    const lines = [
        "import requests",
        "",
        `url = ${escapePython(url)}`,
    ];

    if (headers.length) {
        lines.push(
            "headers = {",
        );

        headers.forEach(
            (header) => {
                lines.push(
                    `    ${escapePython(
                        header.name,
                    )}: ${escapePython(
                        header.value,
                    )},`,
                );
            },
        );

        lines.push("}");
    }

    if (
        hasBody(body) &&
        methodSupportsBody(
            normalized.method,
        )
    ) {
        if (isJsonBody(body)) {
            lines.push(
                `json_data = ${formatJsonBody(
                    body,
                )}`,
            );
        } else {
            lines.push(
                `data = ${escapePython(
                    body,
                )}`,
            );
        }
    }

    lines.push("");

    const argumentsList = [
        "url",
    ];

    if (headers.length) {
        argumentsList.push(
            "headers=headers",
        );
    }

    if (
        hasBody(body) &&
        methodSupportsBody(
            normalized.method,
        )
    ) {
        if (isJsonBody(body)) {
            argumentsList.push(
                "json=json_data",
            );
        } else {
            argumentsList.push(
                "data=data",
            );
        }
    }

    const method =
        normalized.method.toLowerCase();

    lines.push(
        `response = requests.${method}(`,
    );

    lines.push(
        `    ${argumentsList.join(
            ",\n    ",
        )}`,
    );

    lines.push(")");
    lines.push("");
    lines.push(
        "print(response.status_code)",
    );
    lines.push(
        "print(response.text)",
    );

    return lines.join("\n");
}

// ============================================================
// Generic Generator
// ============================================================

/**
 * Generate code for a selected language.
 *
 * @param {Object} request
 * @param {string} language
 * @returns {string}
 */
export function generateCode(
    request = {},
    language = DEFAULT_LANGUAGE,
) {
    switch (language) {
        case "javascript-fetch":
            return generateJavaScriptFetch(
                request,
            );

        case "javascript-axios":
            return generateJavaScriptAxios(
                request,
            );

        case "curl":
            return generateCurl(
                request,
            );

        case "python-requests":
            return generatePythonRequests(
                request,
            );

        case "node-fetch":
            return generateNodeFetch(
                request,
            );

        default:
            return generateJavaScriptFetch(
                request,
            );
    }
}

// ============================================================
// Language Helpers
// ============================================================

/**
 * Get all supported languages.
 *
 * @returns {Array<Object>}
 */
export function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES.map(
        (language) => ({
            ...language,
        }),
    );
}

/**
 * Check whether a language is supported.
 *
 * @param {string} language
 * @returns {boolean}
 */
export function isLanguageSupported(
    language,
) {
    return SUPPORTED_LANGUAGES.some(
        (item) =>
            item.id === language,
    );
}

/**
 * Get the display label for a language.
 *
 * @param {string} language
 * @returns {string}
 */
export function getLanguageLabel(
    language,
) {
    return (
        SUPPORTED_LANGUAGES.find(
            (item) =>
                item.id === language,
        )?.label ||
        "JavaScript Fetch"
    );
}

// ============================================================
// DOM Integration
// ============================================================

/**
 * Initialize the code-generator UI.
 *
 * Expected elements:
 * - #code-language
 * - #generated-code
 * - #copy-code
 *
 * @param {Object} options
 * @param {string} [options.languageId="code-language"]
 * @param {string} [options.outputId="generated-code"]
 * @param {string} [options.copyButtonId="copy-code"]
 * @returns {Object}
 */
export function initCodeGenerator({
    languageId = "code-language",
    outputId = "generated-code",
    copyButtonId = "copy-code",
} = {}) {
    elements.language =
        document.getElementById(
            languageId,
        );

    elements.output =
        document.getElementById(
            outputId,
        );

    elements.copyButton =
        document.getElementById(
            copyButtonId,
        );

    if (elements.language) {
        elements.language.addEventListener(
            "change",
            handleLanguageChange,
        );
    }

    if (elements.copyButton) {
        elements.copyButton.addEventListener(
            "click",
            handleCopyClick,
        );
    }

    return {
        render: renderGeneratedCode,
        copy: copyGeneratedCode,
        getCode: getGeneratedCode,
    };
}

/**
 * Handle language changes.
 */
function handleLanguageChange() {
    if (!currentRequest) {
        return;
    }

    renderGeneratedCode(
        currentRequest,
    );
}

/**
 * Handle copy button clicks.
 *
 * @param {Event} event
 */
async function handleCopyClick(
    event,
) {
    const button =
        event.currentTarget;

    const copied =
        await copyGeneratedCode();

    if (!copied) {
        return;
    }

    button.setAttribute(
        "data-copied",
        "true",
    );

    window.setTimeout(() => {
        button.removeAttribute(
            "data-copied",
        );
    }, 1200);
}

/**
 * Render generated code.
 *
 * @param {Object} request
 * @param {string|null} language
 * @returns {string}
 */
export function renderGeneratedCode(
    request = {},
    language = null,
) {
    currentRequest =
        normalizeRequest(request);

    const selectedLanguage =
        language ||
        elements.language?.value ||
        DEFAULT_LANGUAGE;

    const code = generateCode(
        currentRequest,
        selectedLanguage,
    );

    if (elements.output) {
        setOutputValue(
            elements.output,
            code,
        );
    }

    return code;
}

/**
 * Set generated code into the output element.
 *
 * @param {HTMLElement} output
 * @param {string} code
 */
function setOutputValue(
    output,
    code,
) {
    if (
        output instanceof
        HTMLTextAreaElement
    ) {
        output.value = code;
        return;
    }

    output.textContent = code;
}

/**
 * Get the currently displayed generated code.
 *
 * @returns {string}
 */
export function getGeneratedCode() {
    if (!elements.output) {
        return "";
    }

    if (
        elements.output instanceof
        HTMLTextAreaElement
    ) {
        return elements.output.value;
    }

    return (
        elements.output.textContent ||
        ""
    );
}

// ============================================================
// Clipboard
// ============================================================

/**
 * Copy generated code to the clipboard.
 *
 * @returns {Promise<boolean>}
 */
export async function copyGeneratedCode() {
    const code =
        getGeneratedCode();

    if (!code) {
        return false;
    }

    if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
            "function"
    ) {
        try {
            await navigator.clipboard.writeText(
                code,
            );

            return true;
        } catch {
            // Fall through to legacy copy.
        }
    }

    return copyUsingFallback(code);
}

/**
 * Copy text using the legacy document.execCommand API.
 *
 * @param {string} text
 * @returns {boolean}
 */
function copyUsingFallback(text) {
    const textarea =
        document.createElement(
            "textarea",
        );

    textarea.value = text;

    textarea.setAttribute(
        "readonly",
        "",
    );

    textarea.style.position =
        "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";

    document.body.appendChild(
        textarea,
    );

    textarea.select();

    let copied = false;

    try {
        copied =
            document.execCommand(
                "copy",
            );
    } catch {
        copied = false;
    }

    textarea.remove();

    return copied;
}

// ============================================================
// Generation Utilities
// ============================================================

/**
 * Prepare a request for code generation.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function prepareRequestForGeneration(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    return {
        ...normalized,

        url: buildRequestUrl(
            normalized,
        ),

        headers:
            getRequestHeaders(
                normalized,
            ),
    };
}

/**
 * Get information about how a request will be generated.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function getGenerationDetails(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const body =
        normalized.body;

    return {
        method:
            normalized.method,

        url:
            buildRequestUrl(
                normalized,
            ),

        headers:
            getRequestHeaders(
                normalized,
            ),

        body,

        hasBody:
            hasBody(body) &&
            methodSupportsBody(
                normalized.method,
            ),

        isJsonBody:
            isJsonBody(body),

        languageOptions:
            getSupportedLanguages(),
    };
}

// ============================================================
// Default Export
// ============================================================

export default {
    initCodeGenerator,
    generateCode,
    generateJavaScriptFetch,
    generateJavaScriptAxios,
    generateNodeFetch,
    generateCurl,
    generatePythonRequests,
    buildRequestUrl,
    getSupportedLanguages,
    isLanguageSupported,
    getLanguageLabel,
    renderGeneratedCode,
    getGeneratedCode,
    copyGeneratedCode,
    prepareRequestForGeneration,
    getGenerationDetails,
};