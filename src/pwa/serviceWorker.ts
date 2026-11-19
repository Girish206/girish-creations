/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from "virtual:pwa-register";

const HOUR = 60 * 60_000;

// Someone typing would lose what they typed if the page reloaded under them.
function isTyping(): boolean {
  return Boolean(document.activeElement?.matches("input, textarea, select, [contenteditable='true']"));
}

// Reload into the new build now, or, while someone is typing, as soon as the
// app goes to the background.
function reloadIntoNewBuild() {
  if (!isTyping()) {
    window.location.reload();
    return;
  }
  const onHidden = () => {
    if (document.visibilityState === "hidden") window.location.reload();
  };
  document.addEventListener("visibilitychange", onHidden);
}

// The service worker serves the cached app shell, so a new deploy only shows
// once a new worker is installed and the page reloads into it. The browser
// checks for one only on navigation, which an installed app resumed from the
// background never does, so check on launch, whenever the app comes back
// into view or online, and hourly while it stays open. The new worker takes
// over straight away (registerType: "autoUpdate"); then reload into it.
export function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  registerSW({
    immediate: true,
    onNeedReload: reloadIntoNewBuild,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const checkForUpdate = () => {
        if (document.visibilityState !== "visible" || !navigator.onLine) return;
        registration.update().catch(() => {
          // Offline or a server hiccup; the next check tries again.
        });
      };
      document.addEventListener("visibilitychange", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      setInterval(checkForUpdate, HOUR);
    },
  });
}
