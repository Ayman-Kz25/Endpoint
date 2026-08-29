import { getDOM, on, queryAll } from "./dom.js";

const DEFAULT_ROOT = "#dropdown-root";
const DEFAULT_PLACEMENT = "bottom-start";
const DEFAULT_OFFSET = 6;
const VIEWPORT_MARGIN = 8;

const state = {
  root: null,
  active: null,
  cleanup: null,
  triggerCleanups: [],
};

export function initDropdown(root = DEFAULT_ROOT) {
  state.root = resolveElement(root) || getDOM("dropdownRoot");

  if (!state.root) {
    return {
      open: openDropdown,
      close: closeDropdown,
      toggle: toggleDropdown,
      isOpen: isDropdownOpen,
      getActive: getActiveDropdown,
      destroy: destroyDropdown,
    };
  }

  bindTriggers();

  return {
    open: openDropdown,
    close: closeDropdown,
    toggle: toggleDropdown,
    isOpen: isDropdownOpen,
    getActive: getActiveDropdown,
    destroy: destroyDropdown,
  };
}

function bindTriggers() {
  cleanupTriggers();

  queryAll("[data-dropdown-trigger]").forEach((trigger) => {
    const cleanup = on(trigger, "click", (event) => {
      event.preventDefault();

      const selector = trigger.dataset.dropdownContent;
      const content = getContent(selector);

      if (!content) return;

      toggleDropdown({
        trigger,
        content,
        placement:
          trigger.dataset.dropdownPlacement || DEFAULT_PLACEMENT,
        offset:
          Number(trigger.dataset.dropdownOffset) || DEFAULT_OFFSET,
        focusFirst:
          trigger.dataset.dropdownFocusFirst === "true",
      });
    });

    if (cleanup) {
      state.triggerCleanups.push(cleanup);
    }
  });
}

function cleanupTriggers() {
  state.triggerCleanups.forEach((cleanup) => cleanup?.());
  state.triggerCleanups = [];
}

function getContent(selector) {
  if (!selector) return null;

  const element = document.querySelector(selector);

  if (!element) return null;

  if (element instanceof HTMLTemplateElement) {
    return element.content.cloneNode(true);
  }

  return element.cloneNode(true);
}

export function openDropdown(options = {}) {
  const root = ensureRoot();
  const trigger = resolveElement(options.trigger);

  if (!root || !trigger) {
    return null;
  }

  closeDropdown();

  const dropdown = createDropdown(options);

  root.appendChild(dropdown);

  state.active = {
    element: dropdown,
    trigger,
    options,
  };

  trigger.setAttribute("aria-expanded", "true");
  trigger.setAttribute("aria-controls", dropdown.id);

  positionDropdown(dropdown, trigger, options);
  bindActiveEvents();

  if (options.focusFirst) {
    requestAnimationFrame(() => {
      if (state.active?.element !== dropdown) return;

      const item = getMenuItems(dropdown)[0];
      item?.focus();
    });
  }

  return dropdown;
}

export function closeDropdown() {
  const active = state.active;

  cleanupActiveEvents();

  if (!active) return;

  active.element?.remove();

  active.trigger?.setAttribute("aria-expanded", "false");
  active.trigger?.removeAttribute("aria-controls");

  state.active = null;
}

export function toggleDropdown(options = {}) {
  const trigger = resolveElement(options.trigger);

  if (!trigger) return null;

  if (state.active?.trigger === trigger) {
    closeDropdown();
    return null;
  }

  return openDropdown({
    ...options,
    trigger,
  });
}

export function isDropdownOpen() {
  return Boolean(state.active?.element?.isConnected);
}

export function getActiveDropdown() {
  return state.active;
}

function createDropdown(options) {
  const dropdown = document.createElement("div");

  dropdown.id = options.id || createDropdownId();

  dropdown.setAttribute("role", "menu");
  dropdown.setAttribute("tabindex", "-1");

  dropdown.className =
    options.className ||
    [
      "fixed",
      "z-50",
      "min-w-40",
      "max-w-[calc(100vw-1rem)]",
      "max-h-[calc(100vh-1rem)]",
      "overflow-auto",
      "rounded-md",
      "border",
      "border-border",
      "bg-surface",
      "p-1",
      "shadow-lg",
      "outline-none",
    ].join(" ");

  appendContent(dropdown, options.content);

  if (options.closeOnSelect !== false) {
    dropdown.addEventListener("click", handleSelection);
  }

  return dropdown;
}

function appendContent(dropdown, content) {
  if (typeof content === "string") {
    dropdown.innerHTML = content;
    return;
  }

  if (
    content instanceof HTMLElement ||
    content instanceof DocumentFragment
  ) {
    dropdown.appendChild(content);
    return;
  }

  throw new TypeError(
    "Dropdown content must be a string, HTMLElement, or DocumentFragment."
  );
}

function handleSelection(event) {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const item = target.closest(
    '[role="menuitem"], [data-dropdown-item]'
  );

  if (!item) return;

  if (
    item.hasAttribute("disabled") ||
    item.getAttribute("aria-disabled") === "true" ||
    item.hasAttribute("data-dropdown-keep-open")
  ) {
    return;
  }

  closeDropdown();
}

function positionDropdown(dropdown, trigger, options = {}) {
  if (!dropdown.isConnected || !trigger.isConnected) return;

  const triggerRect = trigger.getBoundingClientRect();
  const dropdownRect = dropdown.getBoundingClientRect();

  const viewportWidth =
    document.documentElement.clientWidth || window.innerWidth;

  const viewportHeight =
    document.documentElement.clientHeight || window.innerHeight;

  const width = dropdownRect.width;
  const height = dropdownRect.height;
  const offset = Number(options.offset) || DEFAULT_OFFSET;
  const placement = options.placement || DEFAULT_PLACEMENT;

  let top = triggerRect.bottom + offset;
  let left = triggerRect.left;

  if (placement === "bottom-end") {
    left = triggerRect.right - width;
  }

  if (placement === "top-start") {
    top = triggerRect.top - height - offset;
  }

  if (placement === "top-end") {
    top = triggerRect.top - height - offset;
    left = triggerRect.right - width;
  }

  if (placement === "right-start") {
    top = triggerRect.top;
    left = triggerRect.right + offset;
  }

  if (placement === "left-start") {
    top = triggerRect.top;
    left = triggerRect.left - width - offset;
  }

  if (top + height > viewportHeight - VIEWPORT_MARGIN) {
    const above = triggerRect.top - height - offset;

    if (above >= VIEWPORT_MARGIN) {
      top = above;
    }
  }

  if (left + width > viewportWidth - VIEWPORT_MARGIN) {
    left = viewportWidth - width - VIEWPORT_MARGIN;
  }

  if (left < VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN;
  }

  if (top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN;
  }

  dropdown.style.left = `${Math.round(left)}px`;
  dropdown.style.top = `${Math.round(top)}px`;
}

function bindActiveEvents() {
  cleanupActiveEvents();

  const handlePointerDown = (event) => {
    const active = state.active;

    if (!active) return;

    const target = event.target;

    if (!(target instanceof Node)) return;

    if (
      active.element.contains(target) ||
      active.trigger.contains(target)
    ) {
      return;
    }

    closeDropdown();
  };

  const handleKeyDown = (event) => {
    const active = state.active;

    if (!active) return;

    if (event.key === "Escape") {
      event.preventDefault();

      const trigger = active.trigger;

      closeDropdown();
      trigger?.focus();

      return;
    }

    if (isInput(document.activeElement)) return;

    if (event.key === "ArrowDown") {
      moveMenu(1, event);
    }

    if (event.key === "ArrowUp") {
      moveMenu(-1, event);
    }

    if (event.key === "Home") {
      focusMenuItem(0, event);
    }

    if (event.key === "End") {
      const items = getMenuItems(active.element);
      focusMenuItem(items.length - 1, event);
    }
  };

  const handleViewportChange = () => {
    if (!state.active) return;

    positionDropdown(
      state.active.element,
      state.active.trigger,
      state.active.options
    );
  };

  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("scroll", handleViewportChange, true);

  state.cleanup = () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);

    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("scroll", handleViewportChange, true);
  };
}

function cleanupActiveEvents() {
  state.cleanup?.();
  state.cleanup = null;
}

function moveMenu(direction, event) {
  const items = getMenuItems(state.active?.element);

  if (!items.length) return;

  event.preventDefault();

  const current = items.indexOf(document.activeElement);

  const next =
    current === -1
      ? direction > 0
        ? 0
        : items.length - 1
      : (current + direction + items.length) % items.length;

  items[next].focus();
}

function focusMenuItem(index, event) {
  const items = getMenuItems(state.active?.element);

  if (!items.length) return;

  event.preventDefault();

  const safeIndex = Math.max(
    0,
    Math.min(index, items.length - 1)
  );

  items[safeIndex].focus();
}

function getMenuItems(dropdown) {
  if (!dropdown) return [];

  return Array.from(
    dropdown.querySelectorAll(
      '[role="menuitem"], [data-dropdown-item]'
    )
  ).filter(isFocusable);
}

function isFocusable(element) {
  if (!(element instanceof HTMLElement)) return false;

  if (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"
  ) {
    return false;
  }

  const style = getComputedStyle(element);

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

function ensureRoot() {
  if (
    state.root &&
    document.documentElement.contains(state.root)
  ) {
    return state.root;
  }

  state.root = resolveElement(DEFAULT_ROOT);

  return state.root;
}

export function getDropdownRoot() {
  return ensureRoot();
}

export function destroyDropdown() {
  closeDropdown();
  cleanupTriggers();

  state.root?.replaceChildren();
  state.root = null;
}

export function createDropdownItem({
  label = "",
  icon = "",
  value = "",
  className = "",
  disabled = false,
} = {}) {
  const button = document.createElement("button");

  button.type = "button";
  button.role = "menuitem";
  button.dataset.dropdownItem = "";

  if (value) {
    button.dataset.value = value;
  }

  if (disabled) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }

  button.className = [
    "flex",
    "w-full",
    "items-center",
    "gap-2",
    "rounded-sm",
    "px-2.5",
    "py-2",
    "text-left",
    "text-xs",
    "text-foreground",
    "transition",
    "hover:bg-surface-raised",
    "focus:bg-surface-raised",
    "focus:outline-none",
    disabled ? "pointer-events-none opacity-50" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (icon) {
    const iconElement = document.createElement("i");

    iconElement.dataset.lucide = icon;
    iconElement.className = "h-4 w-4 shrink-0";
    iconElement.setAttribute("aria-hidden", "true");

    button.appendChild(iconElement);
  }

  const labelElement = document.createElement("span");

  labelElement.className = "min-w-0 flex-1 truncate";
  labelElement.textContent = label;

  button.appendChild(labelElement);

  return button.outerHTML;
}

function resolveElement(value) {
  if (!value) return null;

  if (value instanceof HTMLElement) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    const element = document.querySelector(value);

    return element instanceof HTMLElement ? element : null;
  } catch {
    return null;
  }
}

function createDropdownId() {
  return `dropdown-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isInput(element) {
  if (!(element instanceof HTMLElement)) return false;

  const tag = element.tagName.toLowerCase();

  if (tag === "textarea" || tag === "select") {
    return true;
  }

  if (tag !== "input") {
    return false;
  }

  return ![
    "button",
    "checkbox",
    "radio",
    "range",
    "submit",
    "reset",
    "file",
    "color",
    "hidden",
  ].includes(element.type);
}

export default {
  initDropdown,
  openDropdown,
  closeDropdown,
  toggleDropdown,
  isDropdownOpen,
  getActiveDropdown,
  getDropdownRoot,
  destroyDropdown,
  createDropdownItem,
};