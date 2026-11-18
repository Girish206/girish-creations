import { useRouteError } from "react-router-dom";
import { isChunkLoadError, reloadForNewBuild } from "../utils/staleBuild";

// Shown when a route fails to load or render. A stale build (old chunk files
// after a deploy) reloads straight into the new one instead.
export function RouteError() {
  const error = useRouteError();
  const stale = isChunkLoadError(error);
  if (stale && reloadForNewBuild()) return null;

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}>
      <div style={{ maxWidth: 360 }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 6px" }}>
          {stale ? "A new version is available" : "Something went wrong"}
        </h2>
        <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0 0 12px" }}>
          {stale ? "Reload to get the latest version." : "Try reloading the page."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--primary, #4f46e5)",
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
