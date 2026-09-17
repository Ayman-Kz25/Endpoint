import { state } from "./state.js";
import {
  esc,
  formatBytes,
  formatDuration,
  statusClass,
  highlightJSON,
} from "./utils.js";
export function render() {
  const r = state.response;
  if (!r)
    return `<div class="h-full flex items-center justify-center text-center text-muted"><div><div class="text-sm font-semibold text-main">No response yet</div><div class="text-xs mt-1">Configure your request and press <span class="kbd"><i class="fa-solid fa-"></i> Enter</span>.</div></div></div>`;
  return `<div class="h-full flex flex-col"><div class="px-3 py-2 border-b border-line flex flex-wrap items-center gap-3"><span class="badge ${statusClass(r.status)}">${r.status} ${esc(r.statusText || "")}</span><span class="text-xs text-muted">${formatDuration(r.duration)}</span><span class="text-xs text-muted">${formatBytes(r.size)}</span><span class="text-xs text-muted">${esc(r.type || "unknown")}</span><span class="text-xs text-muted truncate flex-1" title="${esc(r.finalUrl || "")}">${esc(r.finalUrl || "")}</span></div><div class="flex gap-1 border-b border-line px-3 overflow-x-auto">${["body", "headers", "cookies", "preview", "raw"].map((t) => `<button class="tab ${state.ui.responseTab === t ? "active" : ""}" data-res-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div><div class="flex-1 min-h-0 overflow-auto scroll p-3">${pane(r)}</div></div>`;
}
function pane(r) {
  if (state.ui.responseTab === "headers") return headers(r);
  if (state.ui.responseTab === "cookies")
    return `<div class="text-xs text-muted border border-dashed border-line rounded p-5">Cookies are not exposed consistently by browser fetch due to credential and forbidden-header policies. No cookies are fabricated here.</div>`;
  if (state.ui.responseTab === "preview")
    return r.bodyKind === "image"
      ? `<img src="${esc(r.body)}" class="max-w-full max-h-full object-contain">`
      : `<iframe sandbox class="w-full h-full border border-line rounded bg-white" srcdoc="${r.bodyKind === "html" ? esc(r.body) : ""}"></iframe>`;
  if (state.ui.responseTab === "raw")
    return `<div class="flex justify-end mb-2"><button class="btn" data-copy-response>Copy</button></div><pre id="response-pre" class="code-editor whitespace-pre-wrap text-xs">${esc(r.body)}</pre>`;
  return r.bodyKind === "json"
    ? `<div class="flex justify-end gap-2 mb-2"><input class="input px-2 py-1 rounded text-xs w-64" placeholder="Search response…" data-response-search><button class="btn" data-copy-response>Copy</button></div><pre id="response-pre" class="code-editor whitespace-pre-wrap text-xs">${highlightJSON(r.body)}</pre>`
    : `<div class="flex justify-end mb-2"><button class="btn" data-copy-response>Copy</button></div><pre id="response-pre" class="code-editor whitespace-pre-wrap text-xs">${esc(r.body)}</pre>`;
}
function headers(r) {
  return `<div class="border border-line rounded-lg overflow-hidden">${
    Object.entries(r.headers || {})
      .map(
        ([k, v]) =>
          `<div class="grid grid-cols-[180px_1fr] gap-3 px-3 py-2 border-b border-line text-xs"><span class="mono text-muted">${esc(k)}</span><span class="mono break-all">${esc(v)}</span></div>`,
      )
      .join("") ||
    '<div class="p-4 text-xs text-muted">No accessible response headers.</div>'
  }</div>`;
}
export function bind(root) {
  root.addEventListener("click", async (e) => {
    if (e.target.matches("[data-res-tab]")) {
      state.ui.responseTab = e.target.dataset.resTab;
      import("./state.js").then((m) => m.emit());
    }
    if (e.target.matches("[data-copy-response]")) {
      await navigator.clipboard.writeText(state.response?.body || "");
      window.endpointToast?.("Response copied");
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.matches("[data-response-search]")) {
      const pre = root.querySelector("#response-pre");
      if (!pre) return;
      const q = e.target.value;
      if (!q) {
        pre.innerHTML =
          state.response.bodyKind === "json"
            ? highlightJSON(state.response.body)
            : esc(state.response.body);
        return;
      }
      pre.innerHTML = esc(state.response.body).replace(
        new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        (m) => `<mark>${m}</mark>`,
      );
    }
  });
}
