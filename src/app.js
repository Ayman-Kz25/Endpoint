import { createIcons, icons } from "lucide";

import { initializeTheme } from "./scripts/ui/theme.js";
import { initDOM } from "./scripts/ui/dom.js";
import { initTabs } from "./scripts/ui/tabs.js";
import { initDropdown } from "./scripts/ui/dropdown.js";
import { initSidebar } from "./scripts/ui/sidebar.js";
import { initLoader } from "./scripts/ui/loader.js";
import { initEmptyState } from "./scripts/ui/empty-state.js";

import {
  getRequest,
  initRequestBuilder,
  getFinalRequestUrl,
  validateRequest,
} from "./scripts/features/request-builder/request-builder.js";

import { initQueryParams } from "./scripts/features/request-builder/query-params.js";
import { initHeaders } from "./scripts/features/request-builder/headers.js";
import { initRequestBody } from "./scripts/features/request-builder/body.js";

import { initResponseViewer, getResponse } from "./scripts/features/response-viewer/response-viewer.js";
import { initResponseTabs } from "./scripts/features/response-viewer/response-tabs.js";

import { initHistory } from "./scripts/features/history/history.js";
import { initHistoryRenderer } from "./scripts/features/history/history-renderer.js";

import { initCodeGenerator } from "./scripts/features/code-generator/code-generator.js";

import { initEditor } from "./scripts/features/editor/editor.js";
import { initJsonEditor } from "./scripts/features/editor/json-editor.js";

import { sendRequest } from "./scripts/api/request.js";

let initialized = false;
let responseViewer = null;
let codeGenerator = null;

export function initializeApp() {
  if (initialized) {
    return;
  }

  initialized = true;

  initDOM(document);
  initializeTheme();

  initTabs();
  initDropdown();
  initSidebar();
  initLoader();
  initEmptyState();

  initRequestBuilder();
  initQueryParams();
  initHeaders();
  initRequestBody();

  initEditor();
  initJsonEditor();

  responseViewer = initResponseViewer();
  initResponseTabs();

  initHistoryRenderer();
  initHistory();

  codeGenerator = initCodeGenerator();

  bindAppEvents();

  createIcons({
    icons,
  });
}

function bindAppEvents() {
  const sendButton = document.getElementById("send-request-button");
  const generateCodeButton = document.getElementById("generate-code-button");
  const copyResponseButton = document.getElementById("copy-response-button");
  const downloadResponseButton = document.getElementById(
    "download-response-button",
  );

  sendButton?.addEventListener("click", handleSendRequest);
  generateCodeButton?.addEventListener("click", handleGenerateCode);
  copyResponseButton?.addEventListener("click", handleCopyResponse);
  downloadResponseButton?.addEventListener("click", handleDownloadResponse);
}

async function handleSendRequest() {
  const validation = validateRequest();

  if (!validation.valid) {
    console.error(validation.errors);
    return;
  }

  const request = getRequest();
  const url = getFinalRequestUrl();

  try {
    const response = await sendRequest({
      url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      auth: request.auth,
    });

    responseViewer?.renderResponse(response);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

function handleGenerateCode() {
  const request = getRequest();

  console.log("Generate Code button clicked");
  console.log("Request:", request);
  console.log("Code generator:", codeGenerator);

  codeGenerator?.render(request);
  codeGenerator?.open();
}

async function handleCopyResponse(event) {
    const button = event.currentTarget;
    const response = getResponse();

    if (!response) {
        return;
    }

    const text = getResponseText(response);

    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        if (button) {
            button.dataset.copied = "true";

            setTimeout(() => {
                delete button.dataset.copied;
            }, 1200);
        }
    } catch (error) {
        console.error("Failed to copy response:", error);
    }
}

function handleDownloadResponse() {
    const response = getResponse();

    if (!response) {
        return;
    }

    const text = getResponseText(response);

    if (!text) {
        return;
    }

    const blob = new Blob([text], {
        type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "response.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function getResponseText(response) {
  if (response == null) {
    return "";
  }

  if (typeof response === "string") {
    return response;
  }

  if (typeof response.body === "string") {
    return response.body;
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  if (response.data !== undefined) {
    if (typeof response.data === "string") {
      return response.data;
    }

    try {
      return JSON.stringify(response.data, null, 2);
    } catch {
      return String(response.data);
    }
  }

  try {
    return JSON.stringify(response, null, 2);
  } catch {
    return String(response);
  }
}

function bootstrap() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp, {
      once: true,
    });
  } else {
    initializeApp();
  }
}

bootstrap();

export default {
  initializeApp,
};
