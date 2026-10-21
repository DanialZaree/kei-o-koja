import crypto from "crypto";

export function generatePublicId(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export function generateAdminKey(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function cleanDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function toEnglishDigits(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

// normalize names so variations like "علی", "علي", and "علی‌" map to the same voter
export function normalizeNameKey(name: string): string {
  let s = name.trim().replace(/\s+/g, " ");
  s = s.replace(/[\u0649\u064A]/g, "\u06CC"); // arabic yeh -> persian
  s = s.replace(/\u0643/g, "\u06A9");         // arabic kaf -> persian
  s = toEnglishDigits(s);
  s = s.replace(/\u200C/g, "");               // strip zwnj
  return s.toLowerCase();
}

export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0x06F0 - 0x0030)
  );
}
