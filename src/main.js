import './style.css';
import { initializeApp } from './app.js';
import { initializeTheme } from './scripts/ui/theme.js';
import { initDOM } from './scripts/ui/dom.js';

window.document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    initializeTheme();
    initDOM();
})

