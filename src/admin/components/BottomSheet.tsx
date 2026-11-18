import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ModalContext } from "../dms/components/modalContext";

export type SheetSize = "sm" | "md" | "lg" | "xl";

export interface BottomSheetProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Max width on wider screens; on phones the sheet is always full width. */
  size?: SheetSize;
  /** Fixed footer content. When omitted, the footer is a slot that forms
   *  portal their Cancel/Save buttons into (hidden while empty). */
  footer?: ReactNode;
  className?: string;
}

const CLOSE_MS = 240;
// Dragging the handle down further than this (or flicking it) dismisses.
const DISMISS_PX = 110;

// Number of sheets currently open, so a sheet opened from another sheet
// doesn't unlock the page when the inner one closes.
let openSheetCount = 0;

// Hides the page's scrollbar while a sheet is open, padding <body> by the
// scrollbar's width so the content behind doesn't shift sideways.
function lockBodyScroll() {
  const body = document.body;
  if (openSheetCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.classList.add("modal-open");
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }
  openSheetCount += 1;
  return () => {
    openSheetCount -= 1;
    if (openSheetCount === 0) {
      body.classList.remove("modal-open");
      body.style.overflow = "";
      body.style.paddingRight = "";
    }
  };
}

// A panel that slides up from the bottom of the screen. It provides
// ModalContext, so forms inside it portal their Cancel/Save buttons
// (SubmitButton / ModalActions) into the sheet's sticky footer.
export function BottomSheet({
  title,
  subtitle,
  icon,
  onClose,
  children,
  size = "md",
  footer,
  className = "",
}: BottomSheetProps) {
  const [closing, setClosing] = useState(false);
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ startY: number; startT: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setDragY(0);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => lockBodyScroll(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most sheet reacts to Escape.
      if (e.key !== "Escape") return;
      const sheets = document.querySelectorAll(".admin-sheet");
      if (sheets[sheets.length - 1] === sheetRef.current) close();
    };
    document.addEventListener("keydown", onKey);
    // Focus the sheet so keyboard users land inside it.
    sheetRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { startY: e.clientY, startT: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setDragY(Math.max(0, e.clientY - drag.current.startY));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    const velocity = dy / Math.max(1, performance.now() - drag.current.startT);
    drag.current = null;
    if (dy > DISMISS_PX || velocity > 0.6) close();
    else setDragY(0);
  }

  return createPortal(
    <div className={`admin-sheet-backdrop${closing ? " is-closing" : ""}`} onClick={close}>
      <div
        ref={sheetRef}
        className={`admin-sheet admin-sheet-${size}${closing ? " is-closing" : ""}${dragY ? " is-dragging" : ""}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="admin-sheet-header"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="admin-sheet-grabber" aria-hidden="true"></span>
          <div className="admin-sheet-title-row">
            {icon && <span className="admin-sheet-icon">{icon}</span>}
            <div className="admin-sheet-titles">
              <h5>{title}</h5>
              {subtitle && <small>{subtitle}</small>}
            </div>
            <button type="button" className="admin-sheet-close" onClick={close} aria-label="Close">
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <ModalContext.Provider value={{ footer: footerSlot, close }}>
          <div className="admin-sheet-body">{children}</div>
        </ModalContext.Provider>
        {footer ? (
          <div className="admin-sheet-footer">{footer}</div>
        ) : (
          <div className="admin-sheet-footer" ref={setFooterSlot} />
        )}
      </div>
    </div>,
    document.body,
  );
}
