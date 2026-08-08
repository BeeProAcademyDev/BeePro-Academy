import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm?.();
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmVariant = tone === "danger" ? "danger" : "primary";

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-lg border border-secondary-200 bg-white p-6 shadow-2xl dark:border-dark-border dark:bg-dark-card"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              tone === "danger"
                ? "bg-red-100 text-red-600"
                : "bg-primary-100 text-primary-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-secondary-900 dark:text-white"
            >
              {title}
            </h2>
            {message && (
              <p className="mt-2 text-sm leading-6 text-secondary-600 dark:text-secondary-300">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
