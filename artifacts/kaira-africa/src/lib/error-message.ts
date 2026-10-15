const MESSAGE_KEYS = [
  "message",
  "error_description",
  "error",
  "detail",
  "details",
  "description",
  "reason",
  "hint",
  "title",
] as const;

function cleanText(value: string): string | undefined {
  const text = value.trim();
  if (
    !text ||
    text === "[object Object]" ||
    text === "{}" ||
    text === "null" ||
    text === "undefined" ||
    /^<!doctype html/i.test(text) ||
    /^<html[\s>]/i.test(text)
  ) return undefined;

  // Some proxies return a JSON object encoded as a string. Decode it rather
  // than displaying its JavaScript object representation to the user.
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) return extractMessage(parsed);
    } catch {
      // It is ordinary text, not JSON; continue below.
    }
  }

  return text.length > 360 ? text.slice(0, 357) + "…" : text;
}

function extractMessage(value: unknown, seen = new Set<object>(), depth = 0): string | undefined {
  if (depth > 6 || value === null || value === undefined) return undefined;
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Error) return cleanText(value.message);
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => extractMessage(item, seen, depth + 1))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.slice(0, 3).join(" · ") : undefined;
  }
  if (typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of MESSAGE_KEYS) {
    if (!(key in record)) continue;
    const message = extractMessage(record[key], seen, depth + 1);
    if (message) return message;
  }

  // Avoid dumping a raw object or JSON blob into a toast, form, or React tree.
  const code = typeof record.code === "string" ? cleanText(record.code) : undefined;
  return code ? "The request could not be completed (" + code + ")." : undefined;
}

/**
 * Convert API, network, and structured validation errors into a safe readable
 * message. In particular, APIs often return { error: { code, message } };
 * String(error) for that shape becomes "[object Object]" and is not useful.
 */
export function getReadableErrorMessage(value: unknown, fallback = "Kaira Africa could not complete that action. Please try again."): string {
  return extractMessage(value) ?? fallback;
}
