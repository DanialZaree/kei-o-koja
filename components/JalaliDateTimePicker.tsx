"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  JALALI_WEEKDAYS_SHORT,
  PERSIAN_MONTHS,
  formatJalaliDateOnly,
  getCurrentTehranJalali,
  getJalaliMonthLength,
  getJalaliWeekdayIndex,
  jalaaliToUtcDate,
  toGregorianDate,
  utcDateToJalaaliParts,
} from "@/lib/dates";
import { toPersianDigits } from "@/lib/text";



function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}



export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  placeholder?: string;
  minDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  minDate,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial Jalali year and month
  const initialParts = value
    ? utcDateToJalaaliParts(value)
    : getCurrentTehranJalali();

  const [viewJy, setViewJy] = useState(initialParts.jy);
  const [viewJm, setViewJm] = useState(initialParts.jm);

  // Keep view aligned when value changes externally
  useEffect(() => {
    if (value) {
      const parts = utcDateToJalaaliParts(value);
      setViewJy(parts.jy);
      setViewJm(parts.jm);
    }
  }, [value]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const moveMonth = (delta: number) => {
    let nextJm = viewJm + delta;
    let nextJy = viewJy;
    if (nextJm < 1) {
      nextJm = 12;
      nextJy -= 1;
    } else if (nextJm > 12) {
      nextJm = 1;
      nextJy += 1;
    }
    setViewJm(nextJm);
    setViewJy(nextJy);
  };

  const handleSelectDay = (jd: number) => {
    const selectedDate = toGregorianDate(viewJy, viewJm, jd);
    onChange?.(selectedDate);
    setOpen(false);
  };

  // Calendar calculations
  const monthLength = getJalaliMonthLength(viewJy, viewJm);
  const firstDayOffset = getJalaliWeekdayIndex(viewJy, viewJm, 1);
  const currentParts = value ? utcDateToJalaaliParts(value) : null;
  const todayParts = getCurrentTehranJalali();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm flex items-center justify-between gap-2 transition-colors hover:border-secondary-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-accent-100 shrink-0" />
          <span className={value ? "text-accent-400 font-medium truncate" : "text-accent-100"}>
            {value ? formatJalaliDateOnly(value) : placeholder}
          </span>
        </span>
      </button>

      {/* Floating Popover Calendar */}
      {open && (
        <div
          role="dialog"
          aria-label="تقویم شمسی"
          className="absolute top-full mt-2 start-0 z-50 w-[290px] sm:w-[310px] p-4 bg-white border border-secondary-200 shadow-xl rounded-2xl select-none"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-accent-400">
              {PERSIAN_MONTHS[viewJm - 1]?.name} {toPersianDigits(viewJy)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-200 hover:bg-secondary-100 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                aria-label="ماه قبل"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-200 hover:bg-secondary-100 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                aria-label="ماه بعد"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {JALALI_WEEKDAYS_SHORT.map((wd, i) => (
              <span
                key={wd}
                className={`text-xs py-1 font-medium ${
                  i === 6 ? "text-accent-100" : "text-accent-200"
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <span key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {Array.from({ length: monthLength }, (_, i) => i + 1).map((jd) => {
              const dateObj = toGregorianDate(viewJy, viewJm, jd);
              const isSelected =
                currentParts &&
                currentParts.jy === viewJy &&
                currentParts.jm === viewJm &&
                currentParts.jd === jd;
              const isToday =
                todayParts.jy === viewJy &&
                todayParts.jm === viewJm &&
                todayParts.jd === jd;
              const isFriday = (firstDayOffset + jd - 1) % 7 === 6;

              const isPast = minDate ? dateObj.getTime() < minDate.getTime() : false;

              return (
                <button
                  key={jd}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(jd)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-lg text-xs transition-colors flex items-center justify-center ${
                    isSelected
                      ? "bg-brand-600 text-white font-bold"
                      : isToday
                      ? "ring-1 ring-brand-600 font-semibold text-brand-600 hover:bg-brand-50"
                      : isPast
                      ? "opacity-30 cursor-not-allowed text-accent-100"
                      : isFriday
                      ? "text-accent-100 hover:bg-secondary-100"
                      : "text-accent-300 hover:bg-secondary-100"
                  }`}
                >
                  {toPersianDigits(jd)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



export interface TimePickerProps {
  value?: string; // "HH:mm" in Latin digits
  onChange?: (time: string) => void;
  step?: 5 | 10 | 15 | 30;
  className?: string;
}

export function TimePicker({
  value = "18:00",
  onChange,
  step = 5,
  className = "",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [h, m] = (value || "18:00").split(":");
  const currentHour = h ? h.padStart(2, "0") : "18";
  const currentMinute = m ? m.padStart(2, "0") : "00";

  // Outside click and escape handling
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const updateTime = (newH: string, newM: string) => {
    const validH = String(Math.min(23, Math.max(0, parseInt(newH || "0", 10)))).padStart(2, "0");
    const validM = String(Math.min(59, Math.max(0, parseInt(newM || "0", 10)))).padStart(2, "0");
    onChange?.(`${validH}:${validM}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) =>
    String(i * step).padStart(2, "0")
  );

  const setNow = () => {
    const now = new Date();
    const nearestMin = Math.round(now.getMinutes() / step) * step;
    const finalH = String((now.getHours() + Math.floor(nearestMin / 60)) % 24).padStart(2, "0");
    const finalM = String(nearestMin % 60).padStart(2, "0");
    updateTime(finalH, finalM);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Time Display Button - Centered and purely Persian */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm flex items-center justify-center gap-2 transition-colors hover:border-secondary-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
      >
        <ClockIcon className="w-4 h-4 text-accent-100 shrink-0" />
        <span className="font-bold text-accent-400 text-sm tracking-wide">
          {toPersianDigits(currentHour)}:{toPersianDigits(currentMinute)}
        </span>
      </button>

      {/* Floating Popover Time Picker */}
      {open && (
        <div
          dir="ltr"
          role="dialog"
          aria-label="انتخاب ساعت"
          className="absolute top-full mt-2 end-0 z-50 w-48 p-3 bg-white border border-secondary-200 shadow-xl rounded-2xl select-none"
        >
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Hours Column */}
            <div>
              <span className="text-xs font-semibold text-accent-200 block mb-1">
                ساعت
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1 pe-1 border-e border-secondary-200">
                {hours.map((hVal) => (
                  <button
                    key={hVal}
                    type="button"
                    onClick={() => updateTime(hVal, currentMinute)}
                    className={`w-full py-1 rounded-md text-xs font-medium transition-colors ${
                      hVal === currentHour
                        ? "bg-brand-600 text-white font-bold"
                        : "text-accent-300 hover:bg-secondary-100"
                    }`}
                  >
                    {toPersianDigits(hVal)}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <span className="text-xs font-semibold text-accent-200 block mb-1">
                دقیقه
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1 pe-1">
                {minutes.map((mVal) => (
                  <button
                    key={mVal}
                    type="button"
                    onClick={() => {
                      updateTime(currentHour, mVal);
                      setOpen(false);
                    }}
                    className={`w-full py-1 rounded-md text-xs font-medium transition-colors ${
                      mVal === currentMinute
                        ? "bg-brand-600 text-white font-bold"
                        : "text-accent-300 hover:bg-secondary-100"
                    }`}
                  >
                    {toPersianDigits(mVal)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-secondary-200 flex items-center justify-between" dir="rtl">
            <button
              type="button"
              onClick={setNow}
              className="text-xs text-brand-600 hover:underline font-medium px-2 py-1"
            >
              الان
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 bg-secondary-100 hover:bg-secondary-200 text-accent-400 rounded-lg text-xs font-medium"
            >
              تأیید
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



interface JalaliDateTimePickerProps {
  value?: string; // ISO UTC string
  onChange: (isoString: string) => void;
  error?: string;
  label?: string;
  idPrefix?: string;
}

export function JalaliDateTimePicker({
  value,
  onChange,
  error,
  label,
  idPrefix,
}: JalaliDateTimePickerProps) {
  const generatedId = useId();
  const baseId = idPrefix || generatedId;

  // Extract date and time
  const parts = value ? utcDateToJalaaliParts(value) : getCurrentTehranJalali();
  const [jy, setJy] = useState(parts.jy);
  const [jm, setJm] = useState(parts.jm);
  const [jd, setJd] = useState(parts.jd);
  const [time, setTime] = useState(parts.time || "18:00");
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      try {
        const p = utcDateToJalaaliParts(value);
        setJy(p.jy);
        setJm(p.jm);
        setJd(p.jd);
        setTime(p.time);
      } catch {
        // ignore
      }
    }
  }, [value]);

  const handleDateChange = (newDate: Date) => {
    const p = utcDateToJalaaliParts(newDate);
    setJy(p.jy);
    setJm(p.jm);
    setJd(p.jd);

    const utcDate = jalaaliToUtcDate(p.jy, p.jm, p.jd, time);
    if (utcDate.getTime() <= Date.now()) {
      setInternalError("تاریخ و ساعت انتخابی گذشته است. لطفاً زمانی در آینده انتخاب کنید.");
    } else {
      setInternalError(null);
    }
    onChange(utcDate.toISOString());
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    const utcDate = jalaaliToUtcDate(jy, jm, jd, newTime);
    if (utcDate.getTime() <= Date.now()) {
      setInternalError("تاریخ و ساعت انتخابی گذشته است. لطفاً زمانی در آینده انتخاب کنید.");
    } else {
      setInternalError(null);
    }
    onChange(utcDate.toISOString());
  };

  const displayedError = error || internalError;
  const currentDateObj = toGregorianDate(jy, jm, jd);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <div className="w-full space-y-1.5" id={baseId}>
      {label && (
        <label className="block text-sm font-semibold text-accent-300">
          {label}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* VibeFarsi Date Picker (takes 2 cols) */}
        <div className="sm:col-span-2">
          <DatePicker
            value={currentDateObj}
            onChange={handleDateChange}
            minDate={todayStart}
            placeholder="انتخاب تاریخ شمسی"
          />
        </div>

        {/* VibeFarsi Time Picker (takes 1 col) */}
        <div>
          <TimePicker
            value={time}
            onChange={handleTimeChange}
            step={5}
          />
        </div>
      </div>

      {displayedError && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {displayedError}
        </p>
      )}
    </div>
  );
}
