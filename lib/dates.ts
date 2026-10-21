import * as jalaali from "jalaali-js";

export const PERSIAN_MONTHS = [
  { value: 1, name: "فروردین" },
  { value: 2, name: "اردیبهشت" },
  { value: 3, name: "خرداد" },
  { value: 4, name: "تیر" },
  { value: 5, name: "مرداد" },
  { value: 6, name: "شهریور" },
  { value: 7, name: "مهر" },
  { value: 8, name: "آبان" },
  { value: 9, name: "آذر" },
  { value: 10, name: "دی" },
  { value: 11, name: "بهمن" },
  { value: 12, name: "اسفند" },
] as const;

export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

// iran abolished dst, so tehran is always fixed at utc+03:30
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;

export function getCurrentTehranJalali() {
  const tehranNow = new Date(Date.now() + TEHRAN_OFFSET_MS);
  const { jy, jm, jd } = jalaali.toJalaali(
    tehranNow.getUTCFullYear(),
    tehranNow.getUTCMonth() + 1,
    tehranNow.getUTCDate()
  );
  const hour = tehranNow.getUTCHours();
  const minute = tehranNow.getUTCMinutes();
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { jy, jm, jd, time };
}

export function getJalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export function toGregorianDate(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  const utcMillis = Date.UTC(gy, gm - 1, gd, 12, 0, 0) - TEHRAN_OFFSET_MS;
  return new Date(utcMillis);
}

export function getJalaliWeekdayIndex(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
  return (d.getUTCDay() + 1) % 7;
}

export function jalaaliToUtcDate(jy: number, jm: number, jd: number, timeStr: string): Date {
  const [hourStr, minuteStr] = (timeStr || "18:00").split(":");
  const hour = parseInt(hourStr || "0", 10);
  const minute = parseInt(minuteStr || "0", 10);

  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  // Gregorian in Tehran time: subtract 03:30 to get UTC
  const utcMillis = Date.UTC(gy, gm - 1, gd, hour, minute, 0) - TEHRAN_OFFSET_MS;
  return new Date(utcMillis);
}

export function utcDateToJalaaliParts(dateInput: Date | string) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const tehranMillis = date.getTime() + TEHRAN_OFFSET_MS;
  const tehranDate = new Date(tehranMillis);
  const { jy, jm, jd } = jalaali.toJalaali(
    tehranDate.getUTCFullYear(),
    tehranDate.getUTCMonth() + 1,
    tehranDate.getUTCDate()
  );
  const hour = String(tehranDate.getUTCHours()).padStart(2, "0");
  const minute = String(tehranDate.getUTCMinutes()).padStart(2, "0");
  return {
    jy,
    jm,
    jd,
    time: `${hour}:${minute}`,
  };
}

export function formatJalaliDateOnly(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  try {
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    if (p.weekday && p.day && p.month && p.year) {
      return `${p.weekday}، ${p.day} ${p.month} ${p.year}`;
    }
    return formatter.format(date);
  } catch {
    return date.toLocaleDateString("fa-IR");
  }
}

export function formatJalaliDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  try {
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    if (p.weekday && p.day && p.month && p.year && p.hour && p.minute) {
      return `${p.weekday} ${p.day} ${p.month} ${p.year}، ساعت ${p.hour}:${p.minute}`;
    }
    return formatter.format(date);
  } catch {
    return date.toLocaleString("fa-IR");
  }
}
