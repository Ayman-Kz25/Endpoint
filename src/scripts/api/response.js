// src/scripts/api/response.js

export function normalizeHeaders(headers) {
  if (!headers) {
    return [];
  }

  if (headers instanceof Headers) {
    return Array.from(headers.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  return [];
}

export function calculateResponseSize(text = "") {
  const value = String(text ?? "");

  if (!value) {
    return 0;
  }

  return new TextEncoder().encode(value).length;
}

export function formatResponseSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${((bytes / 1024) * 1024).toFixed(1)} MB`;
}

export function parseResponseData(text) {
  if (!text?.trim()) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

export function normalizeResponse(response, raw = "", duration = 0) {
  const size = calculateResponseSize(raw);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText || "",
    duration,
    size,
    sizeFormatted: formatResponseSize(size),
    data: parseResponseData(raw),
    raw,
    headers: normalizeHeaders(response.headers),
    url: response.url || "",
    redirected: response.redirected,
    contentType: response.headers.get("content-type") || "",
    error: null,
  };
}

export function createErrorResponse(error, duration=0){
  const message = 
  error instanceof Error 
  ? error.message
  : String(error || "Request failed.");

  const data = {
    error: message,
  };

  const raw =  JSON.stringify(data, null, 2);

  const size = calculateResponseSize(raw);

  return {
    ok: false,
    status: 0,
    statusText: "Network Error",
    duration,
    size,
    sizeFormatted: formatResponseSize(size),
    data,
    raw,
    headers: [],
    url: "",
    redirected: false,
    contentType: "application/json",
    error: message,
  };
}

export default {
  normalizeHeaders,
  calculateResponseSize,
  formatResponseSize,
  parseResponseData,
  normalizeHeaders,
  createErrorResponse,
};