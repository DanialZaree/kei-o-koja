"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { JalaliDateTimePicker } from "./JalaliDateTimePicker";
import { createEventAction } from "@/app/actions";
import { getCurrentTehranJalali, jalaaliToUtcDate, formatJalaliDateTime } from "@/lib/dates";
import { toPersianDigits } from "@/lib/text";

interface PlaceInputItem {
  id: string;
  name: string;
  url: string;
  note: string;
}

export function CreateForm() {
  const router = useRouter();

  const defaultInitialIso = () => {
    const { jy, jm, jd } = getCurrentTehranJalali();
    const date = jalaaliToUtcDate(jy, jm, jd, "18:00");
    if (date.getTime() <= Date.now()) {
      return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    return date.toISOString();
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [dates, setDates] = useState<string[]>([defaultInitialIso()]);
  const [places, setPlaces] = useState<PlaceInputItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    const t = title.trim();
    if (!t || t.length < 2 || t.length > 80) {
      newErrors.title = "عنوان دورهمی باید بین ۲ تا ۸۰ کاراکتر باشد.";
    }
    const o = organizerName.trim();
    if (!o || o.length < 2 || o.length > 30) {
      newErrors.organizerName = "نام شما باید بین ۲ تا ۳۰ کاراکتر باشد.";
    }
    if (description.trim().length > 500) {
      newErrors.description = "توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (dates.length === 0) {
      newErrors.dates = "حداقل انتخاب یک تاریخ پیشنهادی الزامی است.";
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      if (p.name && p.name.trim().length > 60) {
        newErrors[`place_${i}_name`] = "نام مکان حداکثر ۶۰ کاراکتر است.";
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setErrors({});
      setStep(3);
    }
  };

  const handleNextFromStep3 = () => {
    if (validateStep3()) {
      setErrors({});
      setStep(4);
    }
  };

  const handleAddDate = () => {
    if (dates.length >= 10) return;
    const lastDateIso = dates[dates.length - 1] || defaultInitialIso();
    const nextDate = new Date(new Date(lastDateIso).getTime() + 24 * 60 * 60 * 1000);
    setDates([...dates, nextDate.toISOString()]);
  };

  const handleRemoveDate = (index: number) => {
    if (dates.length <= 1) return;
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleDateChange = (index: number, newIso: string) => {
    const updated = [...dates];
    updated[index] = newIso;
    setDates(updated);
  };

  const handleAddPlace = () => {
    if (places.length >= 10) return;
    setPlaces([
      ...places,
      { id: Math.random().toString(36).substring(2, 9), name: "", url: "", note: "" },
    ]);
  };

  const handleRemovePlace = (id: string) => {
    setPlaces(places.filter((p) => p.id !== id));
  };

  const handlePlaceChange = (
    id: string,
    field: "name" | "url" | "note",
    value: string
  ) => {
    setPlaces(
      places.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await createEventAction({
        title,
        description,
        organizerName,
        dates,
        places: places
          .filter((p) => p.name.trim().length > 0)
          .map((p) => ({
            name: p.name.trim(),
            url: p.url.trim() || null,
            note: p.note.trim() || null,
          })),
      });

      if (!res.ok) {
        setErrors(res.errors || {});
        setIsSubmitting(false);
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
      }
    } catch {
      setErrors({ form: "خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید." });
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "مشخصات" },
    { num: 2, label: "زمان‌ها" },
    { num: 3, label: "مکان‌ها" },
    { num: 4, label: "مرور و ساخت" },
  ];

  return (
    <div className="space-y-6">
      {/* Sleek Segmented Stepper */}
      <div className="bg-white border border-secondary-200 rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {steps.map((s) => {
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isCompleted) setStep(s.num as 1 | 2 | 3 | 4);
                }}
                disabled={!isCompleted}
                className={`text-start group transition-all focus:outline-none ${
                  isCompleted ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Top Segment Bar */}
                <div
                  className={`h-1.5 rounded-full mb-2.5 transition-colors ${
                    isCurrent
                      ? "bg-brand-600"
                      : isCompleted
                      ? "bg-accent-300 group-hover:bg-brand-600"
                      : "bg-secondary-300"
                  }`}
                />

                {/* Step Label */}
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs tabular-nums font-semibold transition-colors ${
                      isCurrent
                        ? "text-brand-600"
                        : isCompleted
                        ? "text-accent-300"
                        : "text-accent-100"
                    }`}
                  >
                    {toPersianDigits(s.num)}.
                  </span>
                  <span
                    className={`text-xs truncate transition-colors ${
                      isCurrent
                        ? "font-bold text-accent-400"
                        : isCompleted
                        ? "font-medium text-accent-300 group-hover:text-brand-600"
                        : "text-accent-100"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {errors.form && (
        <div
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          role="alert"
        >
          {errors.form}
        </div>
      )}

      {/* STEP 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="border-b border-secondary-200 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-accent-400">
              مشخصات دورهمی
            </h2>
            <p className="text-xs sm:text-sm text-accent-200 mt-1">
              عنوان قرار و نام خودت رو بنویس تا دوستانت بدونن این دورهمی برای چیه.
            </p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="event-title"
                className="block text-sm font-semibold text-accent-400 mb-1"
              >
                عنوان دورهمی <span className="text-red-500">*</span>
              </label>
              <input
                id="event-title"
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: فوتسال هفتگی، کافه‌گردی پنجشنبه..."
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm placeholder:text-accent-100 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-1">
                {errors.title ? (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.title}
                  </p>
                ) : (
                  <span className="text-xs text-accent-100">بین ۲ تا ۸۰ کاراکتر</span>
                )}
                <span className="text-xs text-accent-100 tabular-nums">
                  {toPersianDigits(title.length)}/۸۰
                </span>
              </div>
            </div>

            {/* Organizer Name */}
            <div>
              <label
                htmlFor="organizer-name"
                className="block text-sm font-semibold text-accent-400 mb-1"
              >
                نام شما (برگزارکننده) <span className="text-red-500">*</span>
              </label>
              <input
                id="organizer-name"
                type="text"
                required
                maxLength={30}
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="مثلاً: علی، سارا..."
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm placeholder:text-accent-100 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-1">
                {errors.organizerName ? (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.organizerName}
                  </p>
                ) : (
                  <span className="text-xs text-accent-100">
                    برای نمایش در بالای صفحه به دوستانت (۲ تا ۳۰ کاراکتر)
                  </span>
                )}
                <span className="text-xs text-accent-100 tabular-nums">
                  {toPersianDigits(organizerName.length)}/۳۰
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="event-description"
                className="block text-sm font-semibold text-accent-400 mb-1"
              >
                توضیحات <span className="text-xs text-accent-200 font-normal">(اختیاری)</span>
              </label>
              <textarea
                id="event-description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اگر نکته‌ای هست بنویس؛ مثلاً همراه داشتن کفش سالنی یا هزینه تخمینی..."
                className="w-full px-3.5 py-2.5 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm placeholder:text-accent-100 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.description}
                  </p>
                ) : (
                  <span className="text-xs text-accent-100">حداکثر ۵۰۰ کاراکتر</span>
                )}
                <span className="text-xs text-accent-100 tabular-nums">
                  {toPersianDigits(description.length)}/۵۰۰
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="w-full sm:w-auto min-h-[44px] px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center justify-center gap-2"
            >
              <span>مرحله بعد</span>
              <span>←</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Dates */}
      {step === 2 && (
        <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="border-b border-secondary-200 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-accent-400">
              تاریخ‌ها و ساعت‌های پیشنهادی
            </h2>
            <p className="text-xs sm:text-sm text-accent-200 mt-1">
              حداقل ۱ و حداکثر ۱۰ زمان پیشنهاد بده تا دوستانت اعلام کنند کی می‌توانند بیایند.
            </p>
            {errors.dates && (
              <p className="text-xs text-red-600 mt-2" role="alert">
                {errors.dates}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {dates.map((dateIso, index) => (
              <div
                key={index}
                className="p-3.5 bg-secondary-100 border border-secondary-200 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent-300">
                    زمان پیشنهادی {toPersianDigits(index + 1)}
                  </span>
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(index)}
                      className="text-xs text-red-600 hover:text-red-700 focus:ring-2 focus:ring-brand-600 rounded px-1.5 py-1 focus:outline-none"
                      aria-label={`حذف زمان پیشنهادی ${index + 1}`}
                    >
                      حذف
                    </button>
                  )}
                </div>
                <JalaliDateTimePicker
                  value={dateIso}
                  onChange={(newIso) => handleDateChange(index, newIso)}
                  error={errors[`date_${index}`]}
                  idPrefix={`create-date-${index}`}
                />
              </div>
            ))}
          </div>

          {dates.length < 10 && (
            <button
              type="button"
              onClick={handleAddDate}
              className="w-full min-h-[44px] border border-secondary-200 bg-white text-accent-300 hover:bg-secondary-100 rounded-xl text-sm font-medium transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              + افزودن تاریخ دیگر
            </button>
          )}

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 min-h-[44px] border border-secondary-300 text-accent-300 hover:bg-secondary-100 rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              → مرحله قبل
            </button>
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="px-6 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center gap-2"
            >
              <span>مرحله بعد</span>
              <span>←</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Places (Optional) */}
      {step === 3 && (
        <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="border-b border-secondary-200 pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-accent-400">
                مکان‌های پیشنهادی
              </h2>
              <span className="text-xs text-accent-100 bg-secondary-100 px-2 py-0.5 rounded-md border border-secondary-200">
                اختیاری
              </span>
            </div>
            <p className="text-xs sm:text-sm text-accent-200 mt-1">
              اگر کافه، سالن یا بوستان مد نظرت هست اضافه کن؛ یا می‌تونی این مرحله رو خالی بذاری.
            </p>
          </div>

          {places.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-secondary-300 rounded-xl text-accent-200 space-y-1">
              <p className="text-sm">مکانی اضافه نشده است.</p>
              <p className="text-xs text-accent-100">
                می‌تونی بدون تعیین مکان ادامه بدی یا دکمه زیر رو برای پیشنهاد مکان بزنی.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {places.map((place, index) => (
                <div
                  key={place.id}
                  className="p-3.5 bg-secondary-100 border border-secondary-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-300">
                      مکان پیشنهادی {toPersianDigits(index + 1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlace(place.id)}
                      className="text-xs text-red-600 hover:text-red-700 focus:ring-2 focus:ring-brand-600 rounded px-1.5 py-1 focus:outline-none"
                    >
                      حذف
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      htmlFor={`place-${place.id}-name`}
                      className="block text-xs font-medium text-accent-300 mb-1"
                    >
                      نام مکان <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`place-${place.id}-name`}
                      type="text"
                      required
                      maxLength={60}
                      value={place.name}
                      onChange={(e) =>
                        handlePlaceChange(place.id, "name", e.target.value)
                      }
                      placeholder="مثلاً: کافه نادری، سالن یادگار..."
                      className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label
                      htmlFor={`place-${place.id}-url`}
                      className="block text-xs font-medium text-accent-300 mb-1"
                    >
                      لینک نقشه نشان/بلد یا وبسایت{" "}
                      <span className="text-xs text-accent-200">(اختیاری)</span>
                    </label>
                    <input
                      id={`place-${place.id}-url`}
                      type="url"
                      dir="ltr"
                      maxLength={300}
                      value={place.url}
                      onChange={(e) =>
                        handlePlaceChange(place.id, "url", e.target.value)
                      }
                      placeholder="https://neshan.org/..."
                      className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none text-left"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label
                      htmlFor={`place-${place.id}-note`}
                      className="block text-xs font-medium text-accent-300 mb-1"
                    >
                      یادداشت <span className="text-xs text-accent-200">(اختیاری)</span>
                    </label>
                    <input
                      id={`place-${place.id}-note`}
                      type="text"
                      maxLength={120}
                      value={place.note}
                      onChange={(e) =>
                        handlePlaceChange(place.id, "note", e.target.value)
                      }
                      placeholder="مثلاً: نزدیک مترو، فضای باز دارد..."
                      className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {places.length < 10 && (
            <button
              type="button"
              onClick={handleAddPlace}
              className="w-full min-h-[44px] border border-secondary-200 bg-white text-accent-300 hover:bg-secondary-100 rounded-xl text-sm font-medium transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              + افزودن مکان پیشنهادی
            </button>
          )}

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 min-h-[44px] border border-secondary-300 text-accent-300 hover:bg-secondary-100 rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              → مرحله قبل
            </button>
            <button
              type="button"
              onClick={handleNextFromStep3}
              className="px-6 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center gap-2"
            >
              <span>مرحله بعد</span>
              <span>←</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Final Confirmation */}
      {step === 4 && (
        <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="border-b border-secondary-200 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-accent-400">
              مرور و ساخت دورهمی
            </h2>
            <p className="text-xs sm:text-sm text-accent-200 mt-1">
              اطلاعات زیر رو بررسی کن و در صورت تأیید، دکمه ساخت دورهمی رو بزن تا لینک اختصاصی برات تولید بشه.
            </p>
          </div>

          {/* Clean Bento Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Info */}
            <div className="p-4 bg-secondary-100 border border-secondary-200 rounded-xl space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent-200">مشخصات</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  ویرایش
                </button>
              </div>
              <h3 className="text-base font-bold text-accent-400">{title}</h3>
              <p className="text-xs text-accent-200">
                برگزارکننده: <span className="font-semibold text-accent-300">{organizerName}</span>
              </p>
              {description && (
                <p className="text-xs text-accent-200 mt-2 p-2.5 bg-white rounded-lg border border-secondary-200">
                  {description}
                </p>
              )}
            </div>

            {/* Card 2: Dates */}
            <div className="p-4 bg-secondary-100 border border-secondary-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent-200">
                  زمان‌های پیشنهادی ({toPersianDigits(dates.length)} مورد)
                </span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  ویرایش
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {dates.map((d, i) => (
                  <div
                    key={i}
                    className="text-xs bg-white p-2 rounded-lg border border-secondary-200 text-accent-300 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-secondary-200 text-accent-300 text-[10px] flex items-center justify-center font-bold tabular-nums">
                      {toPersianDigits(i + 1)}
                    </span>
                    <span>{formatJalaliDateTime(d)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Places */}
            <div className="p-4 bg-secondary-100 border border-secondary-200 rounded-xl space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent-200">
                  مکان‌های پیشنهادی ({toPersianDigits(places.filter((p) => p.name.trim()).length)} مورد)
                </span>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  ویرایش
                </button>
              </div>
              {places.filter((p) => p.name.trim()).length === 0 ? (
                <p className="text-xs text-accent-100 py-1">
                  مکانی اضافه نشده است.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {places
                    .filter((p) => p.name.trim())
                    .map((p, i) => (
                      <div
                        key={i}
                        className="text-xs bg-white p-2.5 rounded-lg border border-secondary-200 space-y-1"
                      >
                        <div className="font-semibold text-accent-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-secondary-200 text-accent-300 text-[10px] flex items-center justify-center tabular-nums">
                            {toPersianDigits(i + 1)}
                          </span>
                          <span>{p.name}</span>
                        </div>
                        {p.note && <p className="text-[11px] text-accent-100">{p.note}</p>}
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-brand-600 hover:underline inline-block"
                          >
                            مشاهده روی نقشه ↗
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 min-h-[44px] border border-secondary-300 text-accent-300 hover:bg-secondary-100 rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              → مرحله قبل
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="px-8 min-h-[44px] bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center gap-2"
            >
              {isSubmitting ? "در حال ساخت دورهمی…" : "تأیید و ساخت دورهمی"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
