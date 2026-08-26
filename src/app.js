import { createIcons, icons } from "lucide";

import { initializeTheme } from "./scripts/ui/theme.js";
import { initDOM } from "./scripts/ui/dom.js";

// UI
import { initTabs } from "./scripts/ui/tabs.js";
import { initDropdown } from "./scripts/ui/dropdown.js";
import { initSidebar } from "./scripts/ui/sidebar.js";
import { initLoader } from "./scripts/ui/loader.js";
import { initEmptyState } from "./scripts/ui/empty-state.js";

// Request builder
import { initRequestBuilder } from "./scripts/features/request-builder/request-builder.js";
import { initQueryParams } from "./scripts/features/request-builder/query-params.js";
import { initHeaders } from "./scripts/features/request-builder/headers.js";
import { initRequestBody } from "./scripts/features/request-builder/body.js";

// Response viewer
import { initResponseViewer } from "./scripts/features/response-viewer/response-viewer.js";
import { initResponseTabs } from "./scripts/features/response-viewer/response-tabs.js";

// History
import { initHistory } from "./scripts/features/history/history.js";
import { initHistoryRenderer } from "./scripts/features/history/history-renderer.js";

// Code generator
import { initCodeGenerator } from "./scripts/features/code-generator/code-generator.js";

// Editor
import { initEditor } from "./scripts/features/editor/editor.js";
import { initJsonEditor } from "./scripts/features/editor/json-editor.js";

let initialized = false;

/**
 * Initialize the Endpoint application.
 */
export function initializeApp() {
    if (initialized) {
        return;
    }

    initialized = true;

    // Core
    initDOM(document);
    initializeTheme();

    // General UI
    initTabs();
    initDropdown();
    initSidebar();
    initLoader();
    initEmptyState();

    // Request builder
    initRequestBuilder();
    initQueryParams();
    initHeaders();
    initRequestBody();

    // Editor
    initEditor();
    initJsonEditor();

    // Response viewer
    initResponseViewer();
    initResponseTabs();

    // History
    initHistoryRenderer();
    initHistory();

    // Code generator
    initCodeGenerator();

    // Icons
    createIcons({
        icons,
    });
}

/**
 * Automatically initialize when the DOM is ready.
 */
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