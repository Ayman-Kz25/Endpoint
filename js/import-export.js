import { state, emit, persist, newTab } from "./state.js";
import { uid } from "./utils.js";
export function exportWorkspace() {
  const payload = {
    schema: "endpoint.workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: state.collections,
    environments: state.environments,
    history: state.history,
    settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `endpoint-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
export function importWorkspace(file) {
  return file.text().then((text) => {
    let x;
    try {
      x = JSON.parse(text);
    } catch {
      throw new Error("Malformed JSON file.");
    }
    if (x.schema !== "endpoint.workspace" || x.version !== 1)
      throw new Error("Unsupported Endpoint workspace schema.");
    if (!Array.isArray(x.collections) || !Array.isArray(x.environments))
      throw new Error(
        "Workspace is missing required collections or environments.",
      );
    state.collections = x.collections.map((c) => ({
      ...c,
      id: c.id || uid("col"),
      requests: Array.isArray(c.requests) ? c.requests : [],
      folders: Array.isArray(c.folders) ? c.folders : [],
    }));
    state.environments = x.environments;
    state.history = Array.isArray(x.history) ? x.history : [];
    state.settings = { ...state.settings, ...(x.settings || {}) };
    persist();
    emit();
  });
}
export function importCurl(curl) {
  let s = curl.trim();
  if (!/^curl\b/i.test(s))
    throw new Error("Paste a cURL command beginning with curl.");
  s = s
    .replace(/\\\s*\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = [];
  const re = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
  let m;
  while ((m = re.exec(s.slice(4))))
    tokens.push(m[0].replace(/^["']|["']$/g, ""));
  let method = "GET",
    url = "",
    headers = [],
    body = "",
    warnings = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "-X" || t === "--request") {
      method = (tokens[++i] || "GET").toUpperCase();
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] || "";
      const j = h.indexOf(":");
      if (j > 0)
        headers.push({
          id: uid("h"),
          key: h.slice(0, j).trim(),
          value: h.slice(j + 1).trim(),
          enabled: true,
        });
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(t)) {
      body = tokens[++i] || "";
      if (method === "GET") method = "POST";
    } else if (t === "-G" || t === "--get") method = "GET";
    else if (t.startsWith("-")) {
      if (
        ![
          "-i",
          "--include",
          "-L",
          "--location",
          "--compressed",
          "-s",
          "--silent",
          "-k",
          "--insecure",
          "--globoff",
        ].includes(t)
      )
        warnings.push(`Unsupported cURL flag: ${t}`);
    } else if (!url) url = t;
  }
  if (!url) throw new Error("No URL found in cURL command.");
  const ct =
    headers.find((h) => h.key.toLowerCase() === "content-type")?.value || "";
  const type = ct.includes("json") ? "json" : body ? "text" : "none";
  return {
    request: {
      method,
      url,
      params: [],
      headers,
      auth: { type: "none" },
      body: { type, content: body },
    },
    warnings,
  };
}
