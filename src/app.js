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

import { initResponseViewer } from "./scripts/features/response-viewer/response-viewer.js";
import { initResponseTabs } from "./scripts/features/response-viewer/response-tabs.js";

import { initHistory } from "./scripts/features/history/history.js";
import { initHistoryRenderer } from "./scripts/features/history/history-renderer.js";

import { initCodeGenerator } from "./scripts/features/code-generator/code-generator.js";

import { initEditor } from "./scripts/features/editor/editor.js";
import { initJsonEditor } from "./scripts/features/editor/json-editor.js";

import { sendRequest } from "./scripts/api/request.js";

let initialized = false;
let responseViewer = null;

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

    initCodeGenerator();

    bindAppEvents();

    createIcons({
        icons,
    });
}

function bindAppEvents() {
    const sendButton = document.getElementById("send-request-button");

    sendButton?.addEventListener("click", handleSendRequest);
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