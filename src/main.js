import './style.css';
import { initializeApp } from './app.js';
import { initializeTheme } from './scripts/ui/theme.js';

window.document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    initializeTheme();
})

