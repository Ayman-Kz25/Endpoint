import { state, persist, emit } from "./state.js";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getResolvedTheme() {
  if (state.settings.theme === "system") {
    return getSystemTheme();
  }

  return state.settings.theme === "dark" ? "dark" : "light";
}

export function apply() {
  const theme = getResolvedTheme();

  const html = document.documentElement;
  const body = document.body;

  // Single source of truth for CSS
  html.dataset.theme = theme;
  body.dataset.theme = theme;

  // Keep classes for Tailwind / existing selectors
  html.classList.toggle("dark", theme === "dark");
  html.classList.toggle("light", theme === "light");

  body.classList.toggle("dark", theme === "dark");
  body.classList.toggle("light", theme === "light");

  // Native browser controls
  html.style.colorScheme = theme;
  body.style.colorScheme = theme;
}

export function setTheme(value) {
  if (!["light", "dark", "system"].includes(value)) {
    return;
  }

  state.settings.theme = value;

  persist();
  apply();
  emit();
}

// React to OS theme changes when "system" is selected
const media = window.matchMedia("(prefers-color-scheme: dark)");

media.addEventListener("change", () => {
  if (state.settings.theme === "system") {
    apply();
    emit();
  }
});