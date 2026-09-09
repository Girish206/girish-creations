import { useEffect, useState, type ReactNode } from "react";
import ReactDOM from "react-dom";

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

const DefaultModal = ({
    title,
    component,
    onClose,
    modalClass = "",
    size = "xl",
    showFooter = true,
    footer,
}: DefaultModalProps) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        // Trigger show animation after mount
        setTimeout(() => setVisible(true), 10);
    }, []);
    const closeModal = () => {
        setVisible(false);
        setTimeout(() => {
            onClose(); // Remove modal after animation
        }, 300); // Match Bootstrap animation duration
    };

    const getSizeClass = (modalSize?: string) => {
        if (!modalSize) return "modal-xl";
        if (modalSize === "sm") return "modal-sm";
        if (modalSize === "md") return "";
        if (modalSize === "lg") return "modal-lg";
        if (modalSize === "xl") return "modal-xl";
        return modalSize.startsWith("modal-") ? modalSize : `modal-${modalSize}`;
    };

    const modalContent = (
        <div
            className={`modal fade ${
                visible ? "show d-block" : "d-block"
            } ${modalClass}`}
            style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                transition: "opacity 0.3s ease",
            }}
            tabIndex={-1}
            role="dialog"
        >
            <div
                className={`modal-dialog modal-dialog-centered ${getSizeClass(size)}`}
                style={{ zIndex: 1105 }}
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={closeModal}
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">{component}</div>
                    {(showFooter || footer) && (
                        <div className="modal-footer">
                            {footer || (
                                <button
                                    type="button"
                                    className="btn btn-custom-secondary"
                                    onClick={closeModal}
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default DefaultModal;
