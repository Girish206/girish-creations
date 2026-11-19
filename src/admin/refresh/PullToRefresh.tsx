import { useEffect, useState } from "react";
import { useRefreshData } from "./useRefreshData";
import { doneMessage, loadingMessage } from "./refreshMessages";
import "./pullToRefresh.css";

// Finger travel is halved, then capped, so the pull feels like it has weight.
const RESISTANCE = 0.5;
const MAX_PULL = 110;
// How far (after resistance) the pull must go before letting go refreshes.
const TRIGGER = 70;
// Where the spinner rests while the refresh runs.
const HOLD = 56;
// The indicator's resting top edge (tucked under the 64px navbar) and the
// circle's size, for placing the message pill just below it.
const INDICATOR_TOP = 24;
const CIRCLE = 38;
// Where the pill sits when there's no pull: just under the navbar.
const PILL_TOP = 76;

// Nothing to pull when a modal, the mobile sidebar or a text field is in play,
// or when the touch starts inside something that is itself scrolled down
// (e.g. a list's own scroll area).
function canStartPull(target: EventTarget | null): boolean {
  if (window.scrollY > 0) return false;
  if (document.body.classList.contains("modal-open")) return false;
  if (document.querySelector(".sidebar-mobile-overlay, .swal2-container")) return false;
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (el.matches("input, textarea, select, [contenteditable='true'], [data-no-pull]")) return false;
    if (el.scrollTop > 0) return false;
    el = el.parentElement;
  }
  return true;
}

// The admin shell's refresh overlay. On touch screens: pull down from the top
// of any page to run the same refresh as the RefreshButton (hidden there). And a
// Slack-style message pill under the navbar while a pull's refresh runs.
export function PullToRefresh() {
  const { refresh, status, seed, source } = useRefreshData();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    // The browser's own pull-to-reload would fire too and reload the whole app.
    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    let startX = 0;
    let startY = 0;
    let tracking = false; // the touch began where a pull is allowed
    let pulling = false; // it has turned into a downward pull
    let distance = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !canStartPull(e.target)) {
        tracking = false;
        return;
      }
      tracking = true;
      pulling = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (!pulling) {
        // An upward or sideways swipe is a scroll / carousel swipe, not a pull.
        if (dy < 0 || Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dy) > 8 || Math.abs(dx) > 8) tracking = false;
          return;
        }
        if (dy < 8 || window.scrollY > 0) return;
        pulling = true;
        setDragging(true);
      }
      if (e.cancelable) e.preventDefault();
      distance = Math.min(MAX_PULL, Math.max(0, dy * RESISTANCE));
      setPull(distance);
    };

    const onEnd = () => {
      if (!pulling) {
        tracking = false;
        return;
      }
      tracking = false;
      pulling = false;
      setDragging(false);
      if (distance >= TRIGGER) {
        setPull(HOLD);
        void refresh("pull").finally(() => setPull(0));
      } else {
        setPull(0);
      }
      distance = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: an active pull has to stop the page from scrolling.
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      root.style.overscrollBehaviorY = previous;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [refresh]);

  const refreshing = status === "refreshing";
  const ready = pull >= TRIGGER;
  // Only a pull shows the circle; a RefreshButton has its own spinner.
  const visible = pull > 0;
  const progress = Math.min(1, pull / TRIGGER);

  // The button has its own spinner/check, so only a pull shows a message.
  const message = dragging
    ? ready
      ? "Release to refresh"
      : "Pull to refresh"
    : source !== "pull"
      ? null
      : refreshing
      ? loadingMessage(seed)
      : status === "done"
        ? doneMessage(seed)
        : null;
  const pillTop = visible ? INDICATOR_TOP + pull + CIRCLE + 8 : PILL_TOP;

  return (
    <>
      <div
        className={`admin-ptr ${visible ? "is-visible" : ""} ${dragging ? "is-dragging" : ""} ${
          ready ? "is-ready" : ""
        } ${refreshing && visible ? "is-refreshing" : ""}`}
        style={{ transform: `translate(-50%, ${pull}px)` }}
        aria-hidden="true"
      >
        <span className="admin-ptr-circle" style={{ opacity: visible ? Math.max(0.35, progress) : 0 }}>
          <i
            className="fa-solid fa-arrow-rotate-right"
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          ></i>
        </span>
      </div>

      <div
        className={`admin-refresh-pill ${message ? "is-shown" : ""} ${dragging ? "is-dragging" : ""} ${
          status === "done" && !dragging ? "is-done" : ""
        }`}
        style={{ transform: `translate(-50%, ${pillTop}px)` }}
        role="status"
        aria-live="polite"
      >
        {message && (
          <>
            {status === "done" && !dragging ? (
              <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
            ) : refreshing && !dragging ? (
              <span className="admin-refresh-pill-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ) : null}
            <span>{message}</span>
          </>
        )}
      </div>
    </>
  );
}
