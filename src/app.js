import { createIcons, icons } from "lucide";

export function initializeApp() {
  console.log("Endpoint initialized");

  createIcons({
    icons
  });
  
  console.log("lucide initialized");
}
