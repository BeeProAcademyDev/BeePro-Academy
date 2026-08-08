export function getFriendlyErrorMessage(
  error,
  fallback = "Something went wrong",
) {
  if (!error) return fallback;

  const raw =
    typeof error === "string"
      ? error
      : error?.message || error?.error || error?.details || error?.hint || "";

  const message = String(raw || "").trim();
  if (!message) return fallback;

  const normalized = message.toLowerCase();

  if (/404|not found|resource could not be found/i.test(normalized)) {
    return "Resource not found.";
  }

  if (/401|unauthorized|expired|session|login again/i.test(normalized)) {
    return "Please login again.";
  }

  if (/403|forbidden|permission denied/i.test(normalized)) {
    return "Permission denied.";
  }

  if (/timeout|timed out|etimedout|aborted/i.test(normalized)) {
    return "The server is unavailable. Please try again shortly.";
  }

  if (
    /network|fetch failed|failed to fetch|connection refused|internet/i.test(
      normalized,
    )
  ) {
    return "Please check your internet connection and try again.";
  }

  if (/5\d\d|server|internal error/i.test(normalized)) {
    return "Something went wrong. Please try again shortly.";
  }

  if (/validation|required|invalid/i.test(normalized)) {
    return "Please review the information you entered and try again.";
  }

  return fallback;
}

export function isSafeToRetry(error) {
  const text = String(
    error?.message || error?.details || error?.hint || "",
  ).toLowerCase();
  return !/permission denied|forbidden|not found|invalid/i.test(text);
}
