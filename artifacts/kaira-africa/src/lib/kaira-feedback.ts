export type KairaFeedbackVariant = "success" | "error" | "info";

export type KairaFeedbackDetail = {
  variant: KairaFeedbackVariant;
  title: string;
  message: string;
};

function readMessage(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;

  if (value instanceof Error) {
    const message = readMessage(value.message, depth + 1);
    if (message) return message;
    return readMessage((value as Error & { cause?: unknown }).cause, depth + 1);
  }

  if (typeof value === "string") {
    const message = value.trim();
    if (
      !message ||
      /^\[object (?:Object|Error)\]$/i.test(message) ||
      message === "undefined" ||
      message === "null" ||
      message.startsWith("<!DOCTYPE") ||
      message.startsWith("<html")
    ) return null;

    // Some API clients expose a JSON error payload as Error.message. Unwrap it
    // so users see its useful message instead of a JSON blob.
    if ((message.startsWith("{") && message.endsWith("}")) ||
        (message.startsWith("[") && message.endsWith("]"))) {
      try {
        const parsedMessage = readMessage(JSON.parse(message) as unknown, depth + 1);
        if (parsedMessage) return parsedMessage;
      } catch {
        // It's an ordinary string, not JSON. Keep the string below.
      }
    }
    return message.slice(0, 500);
  }

  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => readMessage(item, depth + 1))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join(" · ").slice(0, 500) : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of [
      "message", "error_description", "detail", "details", "error",
      "title", "description", "reason", "code", "response", "data", "body", "cause",
    ]) {
      const message = readMessage(record[key], depth + 1);
      if (message) return message;
    }
  }

  return null;
}

export function normalizeKairaMessage(value: unknown, fallback = "Please try again."): string {
  return readMessage(value) || fallback;
}

export function reportKairaFeedback(detail: {
  variant: KairaFeedbackVariant;
  title: unknown;
  message: unknown;
}) {
  if (typeof window === "undefined") return;
  const defaultTitle = detail.variant === "success"
    ? "Kaira Africa · Completed"
    : detail.variant === "error"
      ? "Kaira Africa · Something went wrong"
      : "Kaira Africa · Update";
  const defaultMessage = detail.variant === "error"
    ? "Kaira Africa couldn't complete that request. Please try again."
    : "Kaira Africa has processed your request.";
  const safeDetail: KairaFeedbackDetail = {
    variant: detail.variant,
    title: normalizeKairaMessage(detail.title, defaultTitle),
    message: normalizeKairaMessage(detail.message, defaultMessage),
  };
  window.dispatchEvent(new CustomEvent<KairaFeedbackDetail>("kaira:feedback", { detail: safeDetail }));
}
