// src/scripts/features/code-generator/fetch-template.js

import { AUTH_TYPES } from "../../core/constants.js";

function normalizeRequest(request = {}) {
    return {
        method: String(request.method || "GET").toUpperCase(),
        url: String(request.url || "").trim(),
        params: Array.isArray(request.params) ? request.params : [],
        headers: Array.isArray(request.headers) ? request.headers : [],
        body: request.body ?? "",
        auth: {
            type: request.auth?.type || AUTH_TYPES.NONE,
            fields: { ...(request.auth?.fields || {}) },
        },
    };
}

function stringify(value) {
    return JSON.stringify(String(value ?? ""));
}

function isObject(value) {
    return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);
}

function formatValue(value, indent = 0) {
    if (value === null) return "null";

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
        if (!value.length) return "[]";

        const padding = " ".repeat(indent);
        const childPadding = " ".repeat(indent + 4);

        return `[
${value
    .map(
        item =>
            `${childPadding}${formatValue(item, indent + 4)}`
    )
    .join(",\n")}
${padding}]`;
    }

    if (isObject(value)) {
        const entries = Object.entries(value);

        if (!entries.length) return "{}";

        const padding = " ".repeat(indent);
        const childPadding = " ".repeat(indent + 4);

        return `{
${entries
    .map(([key, value]) => {
        const property = /^[A-Za-z_$][\w$]*$/.test(key)
            ? key
            : JSON.stringify(key);

        return `${childPadding}${property}: ${formatValue(
            value,
            indent + 4
        )}`;
    })
    .join(",\n")}
${padding}}`;
    }

    return JSON.stringify(String(value));
}

function getEnabledParams(params = []) {
    if (!Array.isArray(params)) return [];

    return params
        .filter(
            param =>
                param &&
                typeof param === "object" &&
                param.enabled !== false
        )
        .map(param => ({
            key: String(param.key ?? "").trim(),
            value: String(param.value ?? ""),
        }))
        .filter(param => param.key);
}

function buildRequestUrl(request) {
    if (!request.url) return "";

    let url;

    try {
        url = new URL(request.url);
    } catch {
        return request.url;
    }

    getEnabledParams(request.params).forEach(({ key, value }) => {
        url.searchParams.set(key, value);
    });

    const auth = request.auth;

    if (
        auth?.type === AUTH_TYPES.API_KEY &&
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

function getEnabledHeaders(headers = []) {
    if (!Array.isArray(headers)) return [];

    return headers
        .filter(
            header =>
                header &&
                typeof header === "object" &&
                header.enabled !== false
        )
        .map(header => ({
            name: String(header.name ?? "").trim(),
            value: String(header.value ?? ""),
        }))
        .filter(header => header.name);
}

function setHeader(headers, name, value) {
    const target = name.toLowerCase();

    for (const existingName of headers.keys()) {
        if (existingName.toLowerCase() === target) {
            headers.delete(existingName);
            break;
        }
    }

    headers.set(name, { name, value });
}

function applyAuthentication(request, headers) {
    const auth = request.auth;

    if (!auth || auth.type === AUTH_TYPES.NONE) return;

    const fields = auth.fields || {};

    if (auth.type === AUTH_TYPES.BEARER) {
        const token = String(fields.token ?? "").trim();

        if (token) {
            setHeader(headers, "Authorization", `Bearer ${token}`);
        }

        return;
    }

    if (auth.type === AUTH_TYPES.BASIC) {
        const username = String(fields.username ?? "");
        const password = String(fields.password ?? "");

        if (username || password) {
            const credentials = `${username}:${password}`;
            const encoded = encodeBase64(credentials);

            setHeader(headers, "Authorization", `Basic ${encoded}`);
        }

        return;
    }

    if (auth.type === AUTH_TYPES.API_KEY) {
        const key = String(fields.key ?? "").trim();
        const value = String(fields.value ?? "");
        const location = fields.location || "header";

        if (key && value && location === "header") {
            setHeader(headers, key, value);
        }
    }
}

function encodeBase64(value) {
    try {
        if (typeof btoa === "function") {
            return btoa(value);
        }
    } catch {}

    return value;
}

function hasRequestBody(request) {
    if (["GET", "HEAD"].includes(request.method)) {
        return false;
    }

    if (request.body === null || request.body === undefined) {
        return false;
    }

    return typeof request.body !== "string" || Boolean(request.body.trim());
}

function parseJsonBody(body) {
    if (typeof body !== "string") {
        return {
            parsed: isObject(body) || Array.isArray(body),
            value: body,
        };
    }

    const text = body.trim();

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

function generateBody(request) {
    if (!hasRequestBody(request)) return "";

    const body = parseJsonBody(request.body);

    if (body.parsed) {
        return `    body: JSON.stringify(${formatValue(
            body.value,
            4
        )}),`;
    }

    return `    body: ${stringify(request.body)},`;
}

function generateHeaders(headers) {
    if (!headers.length) return "";

    const values = {};

    headers.forEach(header => {
        values[header.name] = header.value;
    });

    return `    headers: ${formatValue(values, 4)},`;
}

function buildHeaders(request) {
    const headers = new Map();

    getEnabledHeaders(request.headers).forEach(header => {
        setHeader(headers, header.name, header.value);
    });

    applyAuthentication(request, headers);

    return Array.from(headers.values());
}

function generateRequestOptions(request) {
    const headers = buildHeaders(request);

    const lines = [
        `    method: ${JSON.stringify(request.method)},`,
    ];

    const headerCode = generateHeaders(headers);
    const bodyCode = generateBody(request);

    if (headerCode) lines.push(headerCode);
    if (bodyCode) lines.push(bodyCode);

    return `{\n${lines.join("\n")}\n}`;
}

function generateUrlExpression(url) {
    return url ? stringify(url) : '""';
}

export function generateFetchTemplate(request = {}) {
    const normalized = normalizeRequest(request);
    const url = buildRequestUrl(normalized);
    const options = generateRequestOptions(normalized);

    return `const response = await fetch(
    ${generateUrlExpression(url)},
    ${options},
);

const data = await response.text();

console.log(data);`;
}

export function generateFetchTemplateWithResponseHandling(request = {}) {
    const normalized = normalizeRequest(request);
    const url = buildRequestUrl(normalized);
    const options = generateRequestOptions(normalized);

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

export function generateFetchFunction(request = {}) {
    const normalized = normalizeRequest(request);
    const url = buildRequestUrl(normalized);
    const options = generateRequestOptions(normalized);

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
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error);
    });`;
}

export function normalizeFetchRequest(request = {}) {
    const normalized = normalizeRequest(request);

    return {
        ...normalized,
        url: buildRequestUrl(normalized),
        headers: buildHeaders(normalized),
    };
}

export function getFetchRequestUrl(request = {}) {
    const normalized = normalizeRequest(request);
    return buildRequestUrl(normalized);
}

export function getFetchRequestHeaders(request = {}) {
    const normalized = normalizeRequest(request);
    return buildHeaders(normalized);
}

export default {
    generateFetchTemplate,
    generateFetchTemplateWithResponseHandling,
    generateFetchFunction,
    normalizeFetchRequest,
    getFetchRequestUrl,
    getFetchRequestHeaders,
};