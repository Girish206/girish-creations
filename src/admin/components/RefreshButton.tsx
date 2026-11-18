import { useRefreshData } from "../refresh/useRefreshData";
import "./RefreshButton.css";

export interface RefreshButtonProps {
  // "default" for page headers on a card; "on-dark" for the gradient heroes.
  tone?: "default" | "on-dark";
  className?: string;
}

// Reloads everything the current page is showing. The same refresh runs
// from the mobile pull-to-refresh (PullToRefresh), so both stay in step.
// Hidden on touch screens, where pulling down does it (RefreshButton.css).
export function RefreshButton({ tone = "default", className = "" }: RefreshButtonProps) {
  const { refresh, status } = useRefreshData();
  const label = status === "refreshing" ? "Refreshing…" : status === "done" ? "Up to date" : "Refresh";

  return (
    <button
      type="button"
      className={`admin-refresh-btn is-${tone} is-${status} ${className}`.trim()}
      onClick={() => void refresh("button")}
      disabled={status === "refreshing"}
      title={label}
      aria-label={label}
    >
      <i
        className={`fa-solid ${status === "done" ? "fa-check" : "fa-rotate-right"}`}
        aria-hidden="true"
      ></i>
      <span className="visually-hidden" aria-live="polite">
        {status === "done" ? "Up to date" : ""}
      </span>
    </button>
  );
}
