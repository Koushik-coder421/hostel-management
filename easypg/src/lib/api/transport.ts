import { ApiError } from "./errors";
const dateFields = /(?:At|From|Until)$/;
/** Convert transport primitives into presentation values, never recompute backend decisions. */
export function decodeView(value: unknown, key = ""): unknown {
  if (value === null) return null;
  if (key.endsWith("Paise")) {
    if (typeof value !== "string" || !/^-?\d+$/.test(value))
      throw new ApiError(
        `Invalid paise value: ${key}`,
        502,
        "INVALID_RESPONSE",
      );
    const integer = BigInt(value);
    if (
      integer > BigInt(Number.MAX_SAFE_INTEGER) ||
      integer < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      throw new ApiError(
        `Amount exceeds supported display range: ${key}`,
        502,
        "UNSUPPORTED_AMOUNT",
      );
    }
    return Number(integer);
  }
  if (Array.isArray(value)) return value.map((item) => decodeView(item));
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, decodeView(v, k)]),
    );
  if (
    typeof value === "string" &&
    dateFields.test(key) &&
    /^\d{4}-\d{2}-\d{2}T/.test(value)
  ) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()))
      throw new ApiError(`Invalid timestamp: ${key}`, 502, "INVALID_RESPONSE");
    return date;
  }
  return value;
}
export function encodeView(value: unknown, key = ""): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === null) return null;
  if (
    key.endsWith("Paise") &&
    (typeof value === "number" || typeof value === "bigint")
  )
    return String(value);
  if (Array.isArray(value)) return value.map((item) => encodeView(item));
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, encodeView(v, k)]),
    );
  return value;
}
export function rupeesToWire(input: string): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match)
    throw new ApiError(
      "Enter a non-negative amount with at most two decimal places",
      422,
      "VALIDATION_ERROR",
    );
  return (
    BigInt(match[1]) * 100n +
    BigInt((match[2] ?? "").padEnd(2, "0") || "0")
  ).toString();
}
