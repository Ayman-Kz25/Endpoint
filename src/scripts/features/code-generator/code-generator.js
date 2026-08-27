//src/scripts/features/code-generator/code-generator.js

import { generateFetchFromRequest } from "../../api/fetch-generator.js";

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

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const elements = {
  language: null,
  output: null,
  copyButton: null,
  modal: null,
  closeButton: null,
};

let currentRequest = null;

function normalizeRequest(request = {}) {
  return {
    method: String(request.method || "GET")
      .trim()
      .toUpperCase(),

    url: String(request.url || "").trim(),

    params: Array.isArray(request.params) ? request.params : [],

    headers: Array.isArray(request.headers) ? request.headers : [],

    body: request.body || "",

    auth: {
      type: request.auth?.type || "none",
      fields: {
        ...(request.auth?.fields || {}),
      },
    },
  };
}

function supportsBody(method) {
  return BODY_METHODS.has(
    String(method || "")
      .trim()
      .toUpperCase(),
  );
}

function escape(value) {
  return JSON.stringify(String(value ?? ""));
}

function hasBody(body) {
  return String(body ?? "").trim() !== "";
}

function isJsonBody(body) {
  if (!hasBody(body)) {
    return false;
  }

  if (typeof body === "object") {
    return true;
  }

  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

function formatJsonBody(body) {
  if (typeof body === "object" && body !== null) {
    return JSON.stringify(body, null, 2);
  }

  try {
    return JSON.stringify(JSON.parse(String(body)), null, 2);
  } catch {
    return String(body ?? "");
  }
}

function normalizeHeaders(headers = []) {
  if (Array.isArray(headers)) {
    return headers
      .filter((header) => header && header.enabled !== false)
      .map((header) => ({
        name: String(header.name ?? header.key ?? "").trim(),

        value: String(header.value ?? ""),
      }))
      .filter((header) => header.name);
  }

  return Object.entries(headers || {}).map(([name, value]) => ({
    name: String(name).trim(),
    value: String(value ?? ""),
  }));
}

function hasHeader(headers, name) {
  return headers.some(
    (header) => header.name.toLowerCase() === name.toLowerCase(),
  );
}

function getRequestHeaders(request) {
  const headers = normalizeHeaders(request.headers);

  const auth = request.auth || {};
  const fields = auth.fields || {};

  if (
    auth.type === "bearer" &&
    fields.token &&
    !hasHeader(headers, "Authorization")
  ) {
    headers.push({
      name: "Authorization",
      value: `Bearer ${fields.token}`,
    });
  }

  if (auth.type === "basic" && !hasHeader(headers, "Authorization")) {
    const username = fields.username || "";
    const password = fields.password || "";

    if (username || password) {
      headers.push({
        name: "Authorization",
        value: `Basic ${btoa(`${username}:${password}`)}`,
      });
    }
  }

  if (
    auth.type === "api-key" &&
    fields.location === "header" &&
    fields.key &&
    fields.value &&
    !hasHeader(headers, fields.key)
  ) {
    headers.push({
      name: fields.key,
      value: fields.value,
    });
  }

  return headers;
}

export function buildRequestUrl(request = {}) {
  const normalized = normalizeRequest(request);

  if (!normalized.url) {
    return "";
  }

  try {
    const url = new URL(normalized.url);

    normalized.params
      .filter((param) => param && param.enabled !== false)
      .forEach((param) => {
        const key = String(param.name ?? param.key ?? "").trim();

        if (key) {
          url.searchParams.set(key, String(param.value ?? ""));
        }
      });

    const auth = normalized.auth;

    if (
      auth.type === "api-key" &&
      auth.fields.location === "query" &&
      auth.fields.key &&
      auth.fields.value
    ) {
      url.searchParams.set(auth.fields.key, auth.fields.value);
    }

    return url.href;
  } catch {
    return normalized.url;
  }
}

export function generateJavaScriptFetch(request = {}) {
  return generateFetchFromRequest(normalizeRequest(request));
}

export function generateJavaScriptAxios(request = {}) {
  const normalized = normalizeRequest(request);
  const url = buildRequestUrl(normalized);
  const headers = getRequestHeaders(normalized);

  const lines = [
    "const response = await axios({",
    `    method: ${escape(normalized.method)},`,
    `    url: ${escape(url)},`,
  ];

  if (headers.length) {
    lines.push("    headers: {");

    headers.forEach((header) => {
      lines.push(`        ${escape(header.name)}: ${escape(header.value)},`);
    });

    lines.push("    },");
  }

  if (hasBody(normalized.body) && supportsBody(normalized.method)) {
    if (isJsonBody(normalized.body)) {
      lines.push(`    data: ${formatJsonBody(normalized.body)},`);
    } else {
      lines.push(`    data: ${escape(normalized.body)},`);
    }
  }

  lines.push("});");
  lines.push("");
  lines.push("console.log(response.data);");

  return lines.join("\n");
}

export function generateNodeFetch(request = {}) {
  const normalized = normalizeRequest(request);
  const url = buildRequestUrl(normalized);
  const headers = getRequestHeaders(normalized);

  const lines = [
    `const response = await fetch(${escape(url)}, {`,
    `    method: ${escape(normalized.method)},`,
  ];

  if (headers.length) {
    lines.push("    headers: {");

    headers.forEach((header) => {
      lines.push(`        ${escape(header.name)}: ${escape(header.value)},`);
    });

    lines.push("    },");
  }

  if (hasBody(normalized.body) && supportsBody(normalized.method)) {
    lines.push(`    body: ${escape(normalized.body)},`);
  }

  lines.push("});");
  lines.push("");
  lines.push("const data = await response.text();");
  lines.push("console.log(data);");

  return lines.join("\n");
}

export function generateCurl(request = {}) {
  const normalized = normalizeRequest(request);
  const url = buildRequestUrl(normalized);
  const headers = getRequestHeaders(normalized);

  const lines = [`curl '${url.replace(/'/g, "'\\''")}'`];

  if (normalized.method !== "GET") {
    lines.push(`-X '${normalized.method}'`);
  }

  headers.forEach((header) => {
    lines.push(
      `-H '${`${header.name}: ${header.value}`.replace(/'/g, "'\\''")}'`,
    );
  });

  if (hasBody(normalized.body) && supportsBody(normalized.method)) {
    lines.push(
      `--data-raw '${String(normalized.body).replace(/'/g, "'\\''")}'`,
    );
  }

  return lines.join(" \\\n");
}

export function generatePythonRequests(request = {}) {
  const normalized = normalizeRequest(request);
  const url = buildRequestUrl(normalized);
  const headers = getRequestHeaders(normalized);

  const lines = ["import requests", "", `url = ${escape(url)}`];

  if (headers.length) {
    lines.push("headers = {");

    headers.forEach((header) => {
      lines.push(`    ${escape(header.name)}: ${escape(header.value)},`);
    });

    lines.push("}");
  }

  if (hasBody(normalized.body) && supportsBody(normalized.method)) {
    if (isJsonBody(normalized.body)) {
      lines.push(`json_data = ${formatJsonBody(normalized.body)}`);
    } else {
      lines.push(`data = ${escape(normalized.body)}`);
    }
  }

  lines.push("");

  const args = ["url"];

  if (headers.length) {
    args.push("headers=headers");
  }

  if (hasBody(normalized.body) && supportsBody(normalized.method)) {
    args.push(isJsonBody(normalized.body) ? "json=json_data" : "data=data");
  }

  lines.push(`response = requests.${normalized.method.toLowerCase()}(`);

  lines.push(`    ${args.join(",\n    ")}`);

  lines.push(")");
  lines.push("");
  lines.push("print(response.status_code)");
  lines.push("print(response.text)");

  return lines.join("\n");
}

export function generateCode(request = {}, language = DEFAULT_LANGUAGE) {
  switch (language) {
    case "javascript-fetch":
      return generateJavaScriptFetch(request);

    case "javascript-axios":
      return generateJavaScriptAxios(request);

    case "curl":
      return generateCurl(request);

    case "python-requests":
      return generatePythonRequests(request);

    case "node-fetch":
      return generateNodeFetch(request);

    default:
      return generateJavaScriptFetch(request);
  }
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map((language) => ({ ...language }));
}

export function isLanguageSupported(language) {
  return SUPPORTED_LANGUAGES.some((item) => item.id === language);
}

export function getLanguageLabel(language) {
  return (
    SUPPORTED_LANGUAGES.find((item) => item.id === language)?.label ||
    "JavaScript Fetch"
  );
}

function openModal() {
  if (!elements.modal) {
    return;
  }

  elements.modal.classList.remove("hidden");
  elements.modal.classList.add("flex");

  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  if (!elements.modal) {
    return;
  }

  elements.modal.classList.add("hidden");
  elements.modal.classList.remove("flex");

  document.body.classList.remove("overflow-hidden");
}

export function initCodeGenerator({
  languageId = "code-language",
  outputId = "generated-code",
  copyButtonId = "copy-code",
  modalId = "code-generator-modal",
  closeButtonId = "close-code-generator",
} = {}) {
  elements.language = document.getElementById(languageId);
  elements.output = document.getElementById(outputId);
  elements.copyButton = document.getElementById(copyButtonId);
  elements.modal = document.getElementById(modalId);
  elements.closeButton = document.getElementById(closeButtonId);

  elements.language?.addEventListener("change", () => {
    if (currentRequest) {
      renderGeneratedCode(currentRequest);
    }
  });

  elements.closeButton?.addEventListener("click", closeModal);

  elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });

  elements.copyButton?.addEventListener("click", async (event) => {
    const button = event.currentTarget;

    const copied = await copyGeneratedCode();

    if (!copied || !(button instanceof HTMLButtonElement)) {
      return;
    }

    const originalText = button.querySelector("span")?.textContent;

    const textElement = button.querySelector("span");

    if (textElement) {
      textElement.textContent = "Copied";
    }

    button.dataset.copied = "true";

    setTimeout(() => {
      if (textElement) {
        textElement.textContent = originalText || "Copy";
      }

      delete button.dataset.copied;
    }, 1200);
  });

  return {
    render: renderGeneratedCode,
    copy: copyGeneratedCode,
    getCode: getGeneratedCode,
    open: openModal,
    close: closeModal,
  };
}

export function renderGeneratedCode(request = {}, language = null) {
  currentRequest = normalizeRequest(request);

  const selectedLanguage =
    language || elements.language?.value || DEFAULT_LANGUAGE;

  const code = generateCode(currentRequest, selectedLanguage);

  if (elements.output) {
    if (elements.output instanceof HTMLTextAreaElement) {
      elements.output.value = code;
    } else {
      elements.output.textContent = code;
    }
  }

  return code;
}

export function getGeneratedCode() {
  if (!elements.output) {
    return "";
  }

  if (elements.output instanceof HTMLTextAreaElement) {
    return elements.output.value;
  }

  return elements.output.textContent || "";
}

export async function copyGeneratedCode() {
  const code = getGeneratedCode();

  if (!code) {
    return false;
  }

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      // Use fallback below.
    }
  }

  const textarea = document.createElement("textarea");

  textarea.value = code;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();

  return copied;
}

export function prepareRequestForGeneration(request = {}) {
  const normalized = normalizeRequest(request);

  return {
    ...normalized,
    url: buildRequestUrl(normalized),
    headers: getRequestHeaders(normalized),
  };
}

export function getGenerationDetails(request = {}) {
  const normalized = normalizeRequest(request);
  const body = normalized.body;

  return {
    method: normalized.method,
    url: buildRequestUrl(normalized),
    headers: getRequestHeaders(normalized),
    body,
    hasBody: hasBody(body) && supportsBody(normalized.method),
    isJsonBody: isJsonBody(body),
    languageOptions: getSupportedLanguages(),
  };
}

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
