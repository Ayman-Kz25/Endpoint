export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const uid = (p = "id") =>
  `${p}_${crypto.randomUUID?.() || Date.now() + Math.random().toString(16).slice(2)}`;
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const debounce = (fn, ms = 180) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
export const now = () => new Date().toISOString();
export function statusClass(n) {
  return n ? `status-${String(n)[0]}` : "";
}
export function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
export function formatDuration(n) {
  return n == null ? "—" : `${Math.round(n)} ms`;
}
export function safeJSON(v, fallback = null) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
export function deepClone(v) {
  return structuredClone ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}
export function parseHeaders(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0)
      out.push({
        id: uid("h"),
        key: line.slice(0, i).trim(),
        value: line.slice(i + 1).trim(),
        enabled: true,
      });
  }
  return out;
}
export function normalizeHeaderKey(k) {
  return k.trim().toLowerCase();
}
export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function resolveVars(str, vars) {
  return String(str ?? "").replace(/\{\{([\w.-]+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m,
  );
}
export function unresolvedVars(str) {
  return [...new Set(String(str ?? "").match(/\{\{([\w.-]+)\}\}/g) || [])];
}
export function parseURL(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
export function headersToObject(rows, vars = {}) {
  const o = {};
  for (const h of rows || []) {
    if (h.enabled !== false && h.key.trim())
      o[h.key.trim()] = resolveVars(h.value, vars);
  }
  return o;
}
export function paramsToURL(base, params, vars = {}) {
  let u;
  try {
    u = new URL(resolveVars(base, vars));
  } catch {
    return base;
  }
  for (const p of params || []) {
    if (p.enabled !== false && p.key.trim())
      u.searchParams.set(resolveVars(p.key, vars), resolveVars(p.value, vars));
  }
  return u.toString();
}
export function extractParams(url) {
  try {
    const u = new URL(url);
    return [...u.searchParams.entries()].map(([key, value]) => ({
      id: uid("p"),
      key,
      value,
      description: "",
      enabled: true,
    }));
  } catch {
    return [];
  }
}
export function highlightJSON(obj) {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  return esc(s)
    .replace(/(&quot;.*?&quot;)(?=\s*:)/g, '<span class="json-key">$1</span>')
    .replace(/(&quot;.*?&quot;)/g, '<span class="json-string">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="json-number">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="json-bool">$1</span>')
    .replace(/\bnull\b/g, '<span class="json-null">null</span>');
}
export function jsonPath(root, targetPath) {
  const parts = targetPath
    .replace(/^\$\.?/, "")
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let v = root;
  for (const p of parts) v = v?.[p];
  return v;
}
