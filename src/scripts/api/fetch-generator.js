// src/scripts/api/fetch-generator.js

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DEFAULT_METHOD = "GET";

function toStringValue(value) {
  return String(value ?? "");
}

function stringifyValue(value) {
  return JSON.stringify(toStringValue(value));
}

function normalizeMethod(method) {
  return toStringValue(method).trim().toUpperCase() || DEFAULT_METHOD;
}

function supportsBody(method) {
  return BODY_METHODS.has(normalizeMethod(method));
}

function normalizeParams(params = []) {
  if (Array.isArray(params)) {
    return params
      .filter(Boolean)
      .map((param) => ({
        name: toStringValue(param.name ?? param.key).trim(),
        value: toStringValue(param.value),
      }))
      .filter((param) => param.name);
  }

  if (params && typeof params === "object") {
    return Object.entries(params)
      .map(([name, value]) => ({
        name: name.trim(),
        value: toStringValue(value),
      }))
      .filter((param) => param.name);
  }

  return [];
}

function normalizeHeaders(headers = []) {
  if (Array.isArray(headers)) {
    return headers
      .filter(Boolean)
      .map((header) => ({
        name: toStringValue(header.name).trim(),
        value: toStringValue(header.value),
      }))
      .filter((header) => header.name);
  }

  if (headers && typeof headers === "object") {
    return Object.entries(headers)
      .map(([name, value]) => ({
        name: name.trim(),
        value: toStringValue(value),
      }))
      .filter((header) => header.name);
  }

  return [];
}

function hasHeader(headers, name) {
  const target = name.trim().toLowerCase();

  return headers.some((header) => header.name.toLowerCase() === target);
}

function applyAuth(headers, auth) {
  if (!auth || typeof auth !== "object") {
    return headers;
  }

  const result = [...headers];

  if (
    auth.type === "bearer" &&
    auth.fields?.token &&
    !hasHeader(result, "Authorization")
  ) {
    result.push({
      name: "Authorization",
      value: `Bearer ${auth.fields.token}`,
    });
  }

  if (auth.type === "basic" && !hasHeader(result, "Authorization")) {
    const username = toStringValue(auth.fields?.username);

    const password = toStringValue(auth.fields?.password);

    if (username || password) {
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

  if (
    auth.type === "api-key" &&
    auth.fields?.key &&
    auth.fields?.value &&
    (auth.fields?.location ?? "header") === "header" &&
    !hasHeader(result, auth.fields.key)
  ) {
    result.push({
      name: auth.fields.key,
      value: auth.fields.value,
    });
  }

  return result;
}

function addJsonContentType(body, headers) {
  if (!hasBody(body) || hasHeader(headers, "Content-Type")) {
    return headers;
  }

  const isJSON = typeof body === "object" || isJsonString(body);

  if (!isJSON) {
    return headers;
  }

  return [
    ...headers,
    {
      name: "Content-Type",
      value: "application/json",
    },
  ];
}

function isJsonString(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    JSON.parse(value);
  } catch (error) {
    return false;
  }
}

function hasBody(body) {
  if (body === undefined || body === null) {
    return false;
  }

  return typeof body === "string" ? body.trim() !== "" : true;
}

export function buildFetchUrl(url, params = []) {
  const rawUrl = toStringValue(url).trim();

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
  } catch (error) {
    const query = normalizedParams
      .map(
        ({ name, value }) =>
          `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      )
      .join("&");

    const separator = rawUrl.includes("?")
      ? rawUrl.endsWith("?") || rawUrl.endsWith("&")
        ? ""
        : "&"
      : "?";

    return `${rawUrl}${separator}${query}`;
  }
}

export function generateBodyExpression(body) {
  if (!hasBody(body)) {
    return null;
  }

  if (typeof body === "object") {
    return `JSON.stringify(${JSON.stringify(body, null, 2)})`;
  }

  if (isJsonString(body)) {
    return `JSON.stringify(${JSON.stringify(JSON.parse(body), null, 2)})`;
  }

  return stringifyValue(body);
}

function generateHeaderValue(value) {
  if (value && typeof value === "object" && value.type === "basic") {
    const credentials = `${value.username}:${value.password}`;

    return `\`Basic \${btoa(${stringifyValue(credentials)})}\``;
  }

  return stringifyValue(value);
}

function generateHeaders(headers) {
  if (!headers.length) {
    return "";
  }

  const lines = headers.map(
    ({ name, value }) =>
      `    ${stringifyValue(name)}: ${generateHeaderValue(value)}`,
  );

  return `    headers: {\n${lines.join(",\n")}\n    },`;
}

function generateOptions(method, headers, body) {
  const lines = [`    method: ${stringifyValue(method)},`];

  const headerBlock = generateHeaders(headers);

  if (headerBlock) {
    lines.push(headerBlock);
  }

  const bodyExpression = generateBodyExpression(body);

  if (bodyExpression && supportsBody(method)) {
    lines.push(`    body: ${bodyExpression},`);
  }

  return `{\n${lines.join("\n")}\n}`;
}

export function normalizeFetchRequest(request = {}) {
  const method = normalizeMethod(request.method);
  let headers = normalizeHeaders(request.headers);

  headers = applyAuth(headers, request.auth);
  headers = addJsonContentType(request.body, headers);

  return {
    url: buildFetchUrl(request.url, request.params),
    method,
    headers,
    body: request.body ?? "",
  };
}

export function generateFetchCode({
  url = "",
  method = DEFAULT_METHOD,
  params = [],
  headers = [],
  body = "",
  auth = null,
} = {}) {
  const request = normalizeFetchRequest({
    url,
    method,
    params,
    headers,
    body,
    auth,
  });

  const bodyExpression = generateBodyExpression(request.body);

  if (request.method === "GET" && !request.headers.length && !bodyExpression) {
    return `const response = await fetch(${stringifyValue(request.url)});

    const data = await response.json();

    console.log(data);
    `;
  }

  const options = generateOptions(
    request.method,
    request.headers,
    request.body,
  );

  return `const response = await fetch(
  ${stringifyValue(request.url)}, 
  ${options}
  );

  const data = await response.json();

  console.log(data);`;
}

export function generateFetchFromRequest(request = {}) {
  return generateFetchCode(request);
}

export function generateSimpleFetch(url) {
  return `fetch(${stringifyValue(url)})`;
}

export function requestHasBody(request = {}) {
  return supportsBody(request.method) && hasBody(request.body);
}

export function supportsRequestBody(method) {
  return supportsBody(method);
}

export default generateFetchCode();