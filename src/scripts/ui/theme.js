import { createIcons, icons } from "lucide";

const THEME_KEY = "endpoint-theme";

export function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  const theme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  document.documentElement.dataset.theme = theme;

  updateThemeIcon(theme);

  document
    .getElementById("theme-toggle")
    ?.addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.dataset.theme || "light";

  const nextTheme =
    currentTheme === "light" ? "dark" : "light";

  document.documentElement.dataset.theme = nextTheme;

  localStorage.setItem(THEME_KEY, nextTheme);

  updateThemeIcon(nextTheme);
}

function updateThemeIcon(theme) {
  const button = document.getElementById("theme-toggle");

  if (!button) return;

  button.innerHTML = `
    <i
      data-lucide="${theme === "dark" ? "sun" : "moon"}"
      class="h-4 w-4">
    </i>
  `;

  createIcons({icons});
}