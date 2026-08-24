// src/app.js

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
import {
    initQueryParams,
} from "./scripts/features/request-builder/query-params.js";

import {
    initHeaders,
} from "./scripts/features/request-builder/headers.js";

import {
    initRequestBody,
} from "./scripts/features/request-builder/body.js";

// Response viewer
import {
    initResponseViewer,
} from "./scripts/features/response-viewer/response-viewer.js";

import {
    initResponseTabs,
} from "./scripts/features/response-viewer/response-tabs.js";

// History
import {
    initHistory,
} from "./scripts/features/history/history.js";

import {
    initHistoryRenderer,
} from "./scripts/features/history/history-renderer.js";

// Code generator
import {
    initCodeGenerator,
} from "./scripts/features/code-generator/code-generator.js";

// Editor
import {
    initEditor,
} from "./scripts/features/editor/editor.js";

import {
    initJsonEditor,
} from "./scripts/features/editor/json-editor.js";

let initialized = false;

/**
 * Initialize the Endpoint application.
 *
 * The application waits until the DOM exists before
 * initializing feature modules.
 */
export function initializeApp() {
    if (initialized) {
        console.warn("[Endpoint] Application is already initialized.");
        return;
    }

    initialized = true;

    console.log("[Endpoint] Starting application...");

    /*
     * ----------------------------------------------------------
     * Core
     * ----------------------------------------------------------
     *
     * DOM must be cached before any feature attempts to
     * access application elements.
     */

    runModule("DOM", () => {
        initDOM(document);
    });

    runModule("Theme", initializeTheme);

    /*
     * ----------------------------------------------------------
     * General UI
     * ----------------------------------------------------------
     */

    runModule("Tabs", initTabs);
    runModule("Dropdown", initDropdown);
    runModule("Sidebar", initSidebar);
    runModule("Loader", initLoader);
    runModule("Empty State", initEmptyState);

    /*
     * ----------------------------------------------------------
     * Request builder
     * ----------------------------------------------------------
     */

    runModule("Query Params", initQueryParams);
    runModule("Headers", initHeaders);
    runModule("Request Body", initRequestBody);

    /*
     * ----------------------------------------------------------
     * Editor
     * ----------------------------------------------------------
     */

    runModule("Editor", initEditor);
    runModule("JSON Editor", initJsonEditor);

    /*
     * ----------------------------------------------------------
     * Response viewer
     * ----------------------------------------------------------
     */

    runModule("Response Viewer", initResponseViewer);
    runModule("Response Tabs", initResponseTabs);

    /*
     * ----------------------------------------------------------
     * History
     * ----------------------------------------------------------
     */

    runModule("History Renderer", initHistoryRenderer);
    runModule("History", initHistory);

    /*
     * ----------------------------------------------------------
     * Code generator
     * ----------------------------------------------------------
     */

    runModule("Code Generator", initCodeGenerator);

    /*
     * ----------------------------------------------------------
     * Icons
     * ----------------------------------------------------------
     *
     * Run this after feature initialization because some
     * modules may add data-lucide elements dynamically.
     */

    runModule("Lucide", initializeLucide);

    console.log("[Endpoint] Application initialization complete.");
}

/**
 * Run a module safely.
 *
 * One broken feature should not prevent the rest of
 * the application from initializing.
 *
 * @param {string} name
 * @param {Function} initializer
 */
function runModule(name, initializer) {
    try {
        if (typeof initializer !== "function") {
            throw new TypeError(
                `Initializer for "${name}" is not a function.`
            );
        }

        initializer();

        console.log(`[Endpoint] ${name} initialized.`);
    } catch (error) {
        console.error(
            `[Endpoint] ${name} failed to initialize:`,
            error
        );
    }
}

/**
 * Initialize Lucide icons.
 */
function initializeLucide() {
    createIcons({
        icons,
    });

    console.log("[Endpoint] Lucide initialized.");
}

/**
 * Automatically initialize when the DOM is ready.
 *
 * This is important if app.js is loaded from the
 * <head> or with a normal module script.
 */
function bootstrap() {
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeApp,
            {
                once: true,
            }
        );
    } else {
        initializeApp();
    }
}

bootstrap();

export default {
    initializeApp,
};