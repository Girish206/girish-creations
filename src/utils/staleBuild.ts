// After a new deploy, a page loaded from the old build (or the PWA's cached
// shell) still points at the old build's chunk files, which are gone from
// the server: lazy routes then fail with "Failed to fetch dynamically
// imported module". A reload picks up the new build.

const KEY = "stale-build-reloaded-at";

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message,
  );
}

// Reloads the page, at most once every 10 seconds so a real outage can't
// loop forever. Returns whether it reloaded.
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // No storage: still reload once; a loop is unlikely without it.
  }
  window.location.reload();
  return true;
}
