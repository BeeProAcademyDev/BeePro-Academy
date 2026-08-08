import { toastError, toastSuccess } from "./toast";

export function notifyError(message) {
  try {
    if (!message) return;
    toastError(typeof message === "string" ? message : String(message));
  } catch (e) {
    // silent fallback
    try {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn("notifyError fallback:", e);
    } catch {}
  }
}

export function notifySuccess(message) {
  try {
    if (!message) return;
    toastSuccess(typeof message === "string" ? message : String(message));
  } catch {}
}

export default { notifyError, notifySuccess };
