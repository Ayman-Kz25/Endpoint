// src/scripts/features/code-generator/code-generator.js

/**
 * Code Generator
 *
 * Converts the current request configuration into executable
 * client-side code.
 *
 * Responsibilities:
 * - Generate code for supported languages
 * - Build request URLs with query parameters
 * - Generate headers, authentication, and request bodies
 * - Expose a small API for the code-generator UI
 *
 * This module does not:
 * - execute requests
 * - modify the DOM unless explicitly initialized
 * - update application state
 * - show notifications
 */

// ============================================================
// Constants
// ============================================================

const DEFAULT_LANGUAGE = "javascript-fetch";

const SUPPORTED_LANGUAGES = [
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
];

// ============================================================
// Helpers
// ============================================================

/**
 * Safely clone a request.
 *
 * @param {Object} request
 * @returns {Object}
 */
function normalizeRequest(request = {}) {
    return {
        method: String(request.method || "GET").toUpperCase(),
        url: String(request.url || ""),
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
                : String(request.body),
        auth: {
            type: String(request.auth?.type || "none"),
            fields: {
                ...(request.auth?.fields || {}),
            },
        },
    };
}

/**
 * Escape a string for JavaScript source code.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeJavaScript(value) {
    return JSON.stringify(String(value ?? ""));
}

/**
 * Escape a string for Python source code.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapePython(value) {
    return JSON.stringify(String(value ?? ""));
}

/**
 * Escape a string for shell source.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeShell(value) {
    const string = String(value ?? "");

    return `'${string.replace(/'/g, `'\\''`)}'`;
}

/**
 * Check whether a value is a usable HTTP header.
 *
 * @param {Object} header
 * @returns {boolean}
 */
function isValidHeader(header) {
    if (!header || typeof header !== "object") {
        return false;
    }

    const name = String(header.name ?? "").trim();

    return Boolean(name);
}

/**
 * Get enabled headers.
 *
 * @param {Array} headers
 * @returns {Array<{name: string, value: string}>}
 */
function getEnabledHeaders(headers = []) {
    if (!Array.isArray(headers)) {
        return [];
    }

    return headers
        .filter(isValidHeader)
        .filter(
            (header) =>
                header.enabled !== false,
        )
        .map((header) => ({
            name: String(header.name).trim(),
            value: String(header.value ?? ""),
        }));
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
                param.enabled !== false &&
                String(param.key ?? "").trim(),
        )
        .map((param) => ({
            key: String(param.key).trim(),
            value: String(param.value ?? ""),
        }));
}

/**
 * Build the final request URL.
 *
 * @param {Object} request
 * @returns {string}
 */
export function buildRequestUrl(request = {}) {
    const normalized = normalizeRequest(request);

    if (!normalized.url) {
        return "";
    }

    let url;

    try {
        url = new URL(normalized.url);
    } catch {
        return normalized.url;
    }

    for (const param of getEnabledParams(
        normalized.params,
    )) {
        url.searchParams.set(
            param.key,
            param.value,
        );
    }

    if (
        normalized.auth.type === "api-key" &&
        normalized.auth.fields?.location ===
            "query"
    ) {
        const key = String(
            normalized.auth.fields.key ?? "",
        ).trim();

        const value = String(
            normalized.auth.fields.value ?? "",
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
 * Return the body if it is usable.
 *
 * @param {Object} request
 * @returns {string}
 */
function getRequestBody(request) {
    const body = request.body;

    if (
        body === undefined ||
        body === null
    ) {
        return "";
    }

    return String(body);
}

/**
 * Add authentication headers.
 *
 * @param {Object} request
 * @param {Array} headers
 * @returns {Array}
 */
function addAuthenticationHeaders(
    request,
    headers,
) {
    const auth = request.auth || {};
    const type = auth.type || "none";
    const fields = auth.fields || {};

    const result = [...headers];

    if (type === "bearer") {
        const token =
            String(fields.token ?? "").trim();

        if (token) {
            result.push({
                name: "Authorization",
                value: `Bearer ${token}`,
            });
        }
    }

    if (type === "basic") {
        const username =
            String(fields.username ?? "");

        const password =
            String(fields.password ?? "");

        if (username || password) {
            result.push({
                name: "Authorization",
                value: `Basic ${encodeBasicAuth(
                    username,
                    password,
                )}`,
            });
        }
    }

    if (type === "api-key") {
        const key =
            String(fields.key ?? "").trim();

        const value =
            String(fields.value ?? "");

        const location =
            fields.location || "header";

        if (
            key &&
            value &&
            location === "header"
        ) {
            result.push({
                name: key,
                value,
            });
        }
    }

    return removeDuplicateHeaders(result);
}

/**
 * Encode Basic authentication credentials.
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

    try {
        if (
            typeof btoa === "function"
        ) {
            return btoa(value);
        }
    } catch {
        // Fall through to plain value.
    }

    return value;
}

/**
 * Remove duplicate headers.
 *
 * @param {Array} headers
 * @returns {Array}
 */
function removeDuplicateHeaders(headers) {
    const result = [];
    const names = new Set();

    for (const header of headers) {
        const normalizedName =
            header.name.toLowerCase();

        if (names.has(normalizedName)) {
            continue;
        }

        names.add(normalizedName);
        result.push(header);
    }

    return result;
}

/**
 * Get all headers including generated auth headers.
 *
 * @param {Object} request
 * @returns {Array}
 */
function getRequestHeaders(request) {
    const headers =
        getEnabledHeaders(request.headers);

    return addAuthenticationHeaders(
        request,
        headers,
    );
}

/**
 * Detect whether the body looks like JSON.
 *
 * @param {string} body
 * @returns {boolean}
 */
function isJsonBody(body) {
    if (!body.trim()) {
        return false;
    }

    try {
        JSON.parse(body);
        return true;
    } catch {
        return false;
    }
}

/**
 * Format JSON body for generated source code.
 *
 * @param {string} body
 * @returns {string}
 */
function formatJsonBody(body) {
    if (!isJsonBody(body)) {
        return body;
    }

    try {
        return JSON.stringify(
            JSON.parse(body),
            null,
            2,
        );
    } catch {
        return body;
    }
}

/**
 * Find a header by name.
 *
 * @param {Array} headers
 * @param {string} name
 * @returns {Object|null}
 */
function findHeader(headers, name) {
    const target = name.toLowerCase();

    return (
        headers.find(
            (header) =>
                header.name.toLowerCase() ===
                target,
        ) || null
    );
}

// ============================================================
// JavaScript Fetch
// ============================================================

/**
 * Generate JavaScript Fetch code.
 *
 * @param {Object} request
 * @returns {string}
 */
export function generateJavaScriptFetch(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const url =
        buildRequestUrl(normalized);

    const headers =
        getRequestHeaders(normalized);

    const body =
        getRequestBody(normalized);

    const lines = [
        `const response = await fetch(${escapeJavaScript(
            url,
        )}, {`,
        `  method: ${escapeJavaScript(
            normalized.method,
        )},`,
    ];

    if (headers.length) {
        lines.push("  headers: {");

        headers.forEach((header) => {
            lines.push(
                `    ${escapeJavaScript(
                    header.name,
                )}: ${escapeJavaScript(
                    header.value,
                )},`,
            );
        });

        lines.push("  },");
    }

    if (
        body &&
        !["GET", "HEAD"].includes(
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
    lines.push("console.log(data);");

    return lines.join("\n");
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
        getRequestBody(normalized);

    const lines = [
        `const response = await axios({`,
        `  method: ${escapeJavaScript(
            normalized.method,
        )},`,
        `  url: ${escapeJavaScript(url)},`,
    ];

    if (headers.length) {
        lines.push("  headers: {");

        headers.forEach((header) => {
            lines.push(
                `    ${escapeJavaScript(
                    header.name,
                )}: ${escapeJavaScript(
                    header.value,
                )},`,
            );
        });

        lines.push("  },");
    }

    if (
        body &&
        !["GET", "HEAD"].includes(
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
    lines.push("console.log(response.data);");

    return lines.join("\n");
}

// ============================================================
// Node.js Fetch
// ============================================================

/**
 * Generate Node.js Fetch code.
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
        getRequestBody(normalized);

    const lines = [
        `const response = await fetch(${escapeJavaScript(
            url,
        )}, {`,
        `  method: ${escapeJavaScript(
            normalized.method,
        )},`,
    ];

    if (headers.length) {
        lines.push("  headers: {");

        headers.forEach((header) => {
            lines.push(
                `    ${escapeJavaScript(
                    header.name,
                )}: ${escapeJavaScript(
                    header.value,
                )},`,
            );
        });

        lines.push("  },");
    }

    if (
        body &&
        !["GET", "HEAD"].includes(
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
    lines.push("console.log(data);");

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
        getRequestBody(normalized);

    const lines = [
        `curl ${escapeShell(url)}`,
    ];

    if (normalized.method !== "GET") {
        lines.push(
            `  -X ${escapeShell(
                normalized.method,
            )}`,
        );
    }

    headers.forEach((header) => {
        lines.push(
            `  -H ${escapeShell(
                `${header.name}: ${header.value}`,
            )}`,
        );
    });

    if (
        body &&
        !["GET", "HEAD"].includes(
            normalized.method,
        )
    ) {
        lines.push(
            `  --data-raw ${escapeShell(
                body,
            )}`,
        );
    }

    return lines.join(" \\\n");
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
        getRequestBody(normalized);

    const lines = [
        "import requests",
        "",
        `url = ${escapePython(url)}`,
    ];

    if (headers.length) {
        lines.push(
            "headers = {",
        );

        headers.forEach((header) => {
            lines.push(
                `    ${escapePython(
                    header.name,
                )}: ${escapePython(
                    header.value,
                )},`,
            );
        });

        lines.push("}");
    }

    if (
        body &&
        !["GET", "HEAD"].includes(
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
        `url`,
    ];

    if (headers.length) {
        argumentsList.push(
            "headers=headers",
        );
    }

    if (
        body &&
        !["GET", "HEAD"].includes(
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

    lines.push(
        `response = requests.${normalized.method.toLowerCase()}(`,
    );

    lines.push(
        `    ${argumentsList.join(",\n    ")}`,
    );

    lines.push(")");
    lines.push("");
    lines.push("print(response.status_code)");
    lines.push("print(response.text)");

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

        case "node-fetch":
            return generateNodeFetch(
                request,
            );

        case "curl":
            return generateCurl(request);

        case "python-requests":
            return generatePythonRequests(
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
 * Get supported languages.
 *
 * @returns {Array}
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
export function isLanguageSupported(language) {
    return SUPPORTED_LANGUAGES.some(
        (item) => item.id === language,
    );
}

/**
 * Get a language label.
 *
 * @param {string} language
 * @returns {string}
 */
export function getLanguageLabel(language) {
    return (
        SUPPORTED_LANGUAGES.find(
            (item) => item.id === language,
        )?.label ||
        "JavaScript Fetch"
    );
}

// ============================================================
// DOM Integration
// ============================================================

const elements = {
    language: null,
    output: null,
    copyButton: null,
};

/**
 * Initialize the code generator UI.
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
            () => {
                if (elements._request) {
                    renderGeneratedCode(
                        elements._request,
                    );
                }
            },
        );
    }

    if (elements.copyButton) {
        elements.copyButton.addEventListener(
            "click",
            copyGeneratedCode,
        );
    }

    return {
        render: renderGeneratedCode,
        copy: copyGeneratedCode,
        getCode: getGeneratedCode,
    };
}

/**
 * Render generated code for a request.
 *
 * @param {Object} request
 * @param {string} [language]
 * @returns {string}
 */
export function renderGeneratedCode(
    request = {},
    language = null,
) {
    elements._request =
        normalizeRequest(request);

    const selectedLanguage =
        language ||
        elements.language?.value ||
        DEFAULT_LANGUAGE;

    const code = generateCode(
        elements._request,
        selectedLanguage,
    );

    if (elements.output) {
        if (
            elements.output instanceof
            HTMLTextAreaElement
        ) {
            elements.output.value = code;
        } else {
            elements.output.textContent = code;
        }
    }

    return code;
}

/**
 * Get the currently generated code.
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

    return elements.output.textContent || "";
}

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

    try {
        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText ===
                "function"
        ) {
            await navigator.clipboard.writeText(
                code,
            );

            return true;
        }
    } catch {
        // Fall through to the legacy copy method.
    }

    return copyUsingFallback(code);
}

/**
 * Copy text using a temporary textarea.
 *
 * @param {string} text
 * @returns {boolean}
 */
function copyUsingFallback(text) {
    const textarea =
        document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute(
        "readonly",
        "",
    );

    textarea.style.position =
        "fixed";
    textarea.style.opacity =
        "0";
    textarea.style.pointerEvents =
        "none";

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
// Utility Exports
// ============================================================

/**
 * Create a plain request object suitable for generation.
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
 * Get the generated request body representation.
 *
 * @param {Object} request
 * @returns {Object}
 */
export function getGenerationDetails(
    request = {},
) {
    const normalized =
        normalizeRequest(request);

    const headers =
        getRequestHeaders(normalized);

    const body =
        getRequestBody(normalized);

    return {
        method: normalized.method,
        url: buildRequestUrl(normalized),
        headers,
        body,
        hasBody:
            Boolean(body) &&
            !["GET", "HEAD"].includes(
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