// src/app.js

import { createIcons, icons } from "lucide";

import { initializeTheme } from "./scripts/ui/theme.js";
import { initDOM } from "./scripts/ui/dom.js";

// UI
import { initializeTabs } from "./scripts/ui/tabs.js";
import { initializeDropdowns } from "./scripts/ui/dropdown.js";
import { initializeSidebar } from "./scripts/ui/sidebar.js";
import { initializeLoader } from "./scripts/ui/loader.js";

// Request builder
import { initializeQueryParams } from "./scripts/features/request-builder/query-params.js";
import { initializeHeaders } from "./scripts/features/request-builder/headers.js";
import { initializeBody } from "./scripts/features/request-builder/body.js";

// Response viewer
import { initializeResponseViewer } from "./scripts/features/response-viewer/response-viewer.js";
import { initializeResponseFormat } from "./scripts/features/response-viewer/response-format.js";
import { initializeResponseTabs } from "./scripts/features/response-viewer/response-tabs.js";

// History
import { initializeHistory } from "./scripts/features/history/history.js";
import { initializeHistoryStorage } from "./scripts/features/history/history-storage.js";
import { initializeHistoryRenderer } from "./scripts/features/history/history-renderer.js";

// Code generator
import { initializeCodeGenerator } from "./scripts/features/code-generator/code-generator.js";

// Editor
import { initializeEditor } from "./scripts/features/editor/editor.js";
import { initializeEditorConfig } from "./scripts/features/editor/editor-config.js";
import { initializeJsonEditor } from "./scripts/features/editor/json-editor.js";
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

    initializeTabs();
    initializeDropdowns();
    initializeSidebar();
    initializeLoader();
    initEmptyState();

    // ---------------------------------------------------------------
    // Request builder
    // ---------------------------------------------------------------

    initializeQueryParams();
    initializeHeaders();
    initializeBody();

    // ---------------------------------------------------------------
    // Editor
    // ---------------------------------------------------------------

    initializeEditorConfig();
    initializeEditor();
    initializeJsonEditor();

    // ---------------------------------------------------------------
    // Response viewer
    // ---------------------------------------------------------------

    initializeResponseViewer();
    initializeResponseFormat();
    initializeResponseTabs();

    // ---------------------------------------------------------------
    // History
    // ---------------------------------------------------------------

    initializeHistoryStorage();
    initializeHistoryRenderer();
    initializeHistory();

    // ---------------------------------------------------------------
    // Code generator
    // ---------------------------------------------------------------

    initializeCodeGenerator();

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