import type { Envelope, SecureStorageValue } from "./types";
import type { V1Type } from "./keys";

/** True for strings produced by `String(number)`, including NaN and Infinity */
const isNumericString = (value: string) => value.trim() !== "" && (!Number.isNaN(Number(value)) || value === "NaN");

/** Encode a value with its type, so it reads back with the same type */
export const toPlaintext = (value: SecureStorageValue): string => {
  if (typeof value === "string") return JSON.stringify({ t: "s", d: value });
  if (typeof value === "number") return JSON.stringify({ t: "n", d: String(value) }); // keeps NaN and Infinity
  if (typeof value === "boolean") return JSON.stringify({ t: "b", d: value });
  return JSON.stringify({ t: "j", d: value });
};

/** @returns the value, or null when the plaintext is not a valid encoded value */
export const fromPlaintext = (plaintext: string): SecureStorageValue | null => {
  let parsed: { t?: unknown; d?: unknown };
  try {
    parsed = JSON.parse(plaintext);
  } catch (ex) {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const { t, d } = parsed;
  if (t === "s") return typeof d === "string" ? d : null;
  if (t === "n") return typeof d === "string" && isNumericString(d) ? Number(d) : null;
  if (t === "b") return typeof d === "boolean" ? d : null;
  if (t === "j") return d === undefined || d === null ? null : (d as SecureStorageValue);
  return null;
};

/** Decode a v1 plaintext according to its type marker (v1 rules) */
export const fromV1Plaintext = (type: V1Type, plaintext: string | null): SecureStorageValue | null => {
  if (plaintext === null) return null;
  switch (type) {
    case "b":
      return plaintext === "true" ? true : plaintext === "false" ? false : null;
    case "j":
      try {
        return JSON.parse(plaintext);
      } catch (ex) {
        return null;
      }
    case "n":
      return isNumericString(plaintext) ? Number(plaintext) : null;
    default:
      return plaintext;
  }
};

/** @returns the envelope, or null when the stored string is not a v2 envelope */
export const parseEnvelope = (raw: string): Envelope | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 2 && (parsed.alg === "AES-GCM" || parsed.alg === "legacy") && typeof parsed.ct === "string") return parsed;
  } catch (ex) {
    // not JSON
  }
  return null;
};
