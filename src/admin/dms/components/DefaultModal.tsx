import type { ReactNode } from "react";
import { BottomSheet, type SheetSize } from "../../components/BottomSheet";

export type ModalSize = "sm" | "md" | "lg" | "xl" | string;

interface DefaultModalProps {
    title: string;
    component: ReactNode;
    onClose: () => void;
    modalClass?: string;
    size?: ModalSize;
    showFooter?: boolean;
    footer?: ReactNode;
}

function toSheetSize(size?: string): SheetSize {
    const s = (size ?? "xl").replace(/^modal-/, "");
    return s === "sm" || s === "md" || s === "lg" || s === "xl" ? s : "xl";
}

// Every admin modal opens as a bottom sheet. Kept as a thin wrapper so the
// existing call sites (title / component / size / showFooter) work as-is.
const DefaultModal = ({
    title,
    component,
    onClose,
    modalClass = "",
    size = "xl",
    showFooter = true,
    footer,
}: DefaultModalProps) => (
    <BottomSheet
        title={title}
        onClose={onClose}
        size={toSheetSize(size)}
        className={modalClass}
        footer={
            footer ??
            (showFooter ? (
                <button type="button" className="btn btn-custom-secondary" onClick={onClose}>
                    Close
                </button>
            ) : undefined)
        }
    >
        {component}
    </BottomSheet>
);

export default DefaultModal;
