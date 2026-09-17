let root;
export function init() {
  root = document.createElement("div");
  root.className = "fixed right-4 bottom-4 z-[100] space-y-2 w-80";
  document.body.appendChild(root);
}
export function toast(message, type = "info") {
  if (!root) return;
  const el = document.createElement("div");
  el.className =
    "toast border border-line bg-panel px-3 py-2.5 rounded-lg shadow-xl text-xs flex gap-2";
  el.innerHTML = `<span class="${type === "error" ? "text-red-400" : "text-[#63e6be]"}">${type === "error" ? "!" : "✓"}</span><span>${String(message).replace(/[<>]/g, "")}</span>`;
  root.appendChild(el);
  setTimeout(() => el.remove(), type === "error" ? 5200 : 2600);
}
