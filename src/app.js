// src/app.js

import { createIcons, icons } from "lucide";

import { initializeTheme } from "./scripts/ui/theme.js";
import { initDOM } from "./scripts/ui/dom.js";

// UI
import { initTabs } from "./scripts/ui/tabs.js";
import { initDropdown } from "./scripts/ui/dropdown.js";
import { initSidebar } from "./scripts/ui/sidebar.js";
import { initLoader } from "./scripts/ui/loader.js";

// Request builder
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
import { initEmptyState } from "./scripts/ui/empty-state.js";

/**
 * Initialize the Endpoint application.
 *
 * Application startup is kept here so main.js remains a small
 * entry point and all modules have a predictable initialization order.
 */
export function initializeApp() {
  console.log("Endpoint initialized");

  try {
    // ---------------------------------------------------------------
    // Core UI
    // ---------------------------------------------------------------

    initializeTheme();
    initDOM();

    // ---------------------------------------------------------------
    // UI components
    // ---------------------------------------------------------------

    initTabs();
    initDropdown();
    initSidebar();
    initLoader();
    initEmptyState();

    // ---------------------------------------------------------------
    // Request builder
    // ---------------------------------------------------------------

    initQueryParams();
    initHeaders();
    initRequestBody();

    // ---------------------------------------------------------------
    // Editor
    // ---------------------------------------------------------------
    initEditor();
    initJsonEditor();

    // ---------------------------------------------------------------
    // Response viewer
    // ---------------------------------------------------------------

    initResponseViewer();
    initResponseTabs();

    // ---------------------------------------------------------------
    // History
    // ---------------------------------------------------------------
    initHistoryRenderer();
    initHistory();

    // ---------------------------------------------------------------
    // Code generator
    // ---------------------------------------------------------------

    initCodeGenerator();

    // ---------------------------------------------------------------
    // Icons
    // ---------------------------------------------------------------

    initializeLucide();

    console.log("Endpoint UI initialized");
  } catch (error) {
    console.error("Endpoint failed to initialize:", error);
  }
}

/**
 * Initialize Lucide icons after the application DOM has been prepared.
 */
function initializeLucide() {
  createIcons({
    icons,
  });

  console.log("Lucide initialized");
}