import { parseURL, resolveVars, extractParams, paramsToURL } from "./utils.js";
import { importCurl } from "./import-export.js";

export function runSmokeTests() {
  console.assert(parseURL("https://example.com") instanceof URL, "URL parsing");
  console.assert(
    resolveVars("{{baseUrl}}/x", { baseUrl: "https://a.test" }) ===
      "https://a.test/x",
    "variable resolution",
  );
  console.assert(
    extractParams("https://a.test/?x=1").length === 1,
    "param extraction",
  );
  console.assert(
    paramsToURL("https://a.test/", [
      { key: "x", value: "1", enabled: true },
    ]).includes("x=1"),
    "param serialization",
  );
  console.assert(
    importCurl(
      'curl -X POST https://a.test -H "Content-Type: application/json" -d \'{"x":1}\'',
    ).request.method === "POST",
    "curl parsing",
  );
  return "Endpoint smoke tests passed";
}
