"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { JalaliDateTimePicker } from "./JalaliDateTimePicker";
import { createEventAction } from "@/app/actions";
import { getCurrentTehranJalali, jalaaliToUtcDate } from "@/lib/dates";

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
    // If it's already past 18:00 today, add 24 hours
    if (date.getTime() <= Date.now()) {
      return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    return date.toISOString();
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [dates, setDates] = useState<string[]>([defaultInitialIso()]);
  const [places, setPlaces] = useState<PlaceInputItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await createEventAction({
        title,
        description,
        organizerName,
        dates,
        places: places.map((p) => ({
          name: p.name,
          url: p.url,
          note: p.note,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          role="alert"
        >
          {errors.form}
        </div>
      )}

      <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
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
              <span className="text-xs text-accent-100">بین ۳ تا ۸۰ کاراکتر</span>
            )}
            <span className="text-xs text-accent-100">{title.length}/80</span>
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
            <span className="text-xs text-accent-100">{description.length}/500</span>
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
                فقط برای نمایش در بالای صفحه دورهمی (۲ تا ۳۰ کاراکتر)
              </span>
            )}
            <span className="text-xs text-accent-100">{organizerName.length}/30</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-accent-400">
            تاریخ‌ها و ساعت‌های پیشنهادی <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-accent-200 mt-0.5">
            حداقل ۱ و حداکثر ۱۰ زمان پیشنهاد بده تا دوستانت اعلام کنند کی می‌توانند بیایند.
          </p>
          {errors.dates && (
            <p className="text-xs text-red-600 mt-1" role="alert">
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
                  زمان پیشنهادی شماره {index + 1}
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
      </div>

      <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-accent-400">
              مکان‌های پیشنهادی{" "}
              <span className="text-xs text-accent-200 font-normal">(اختیاری)</span>
            </h2>
            <p className="text-xs text-accent-200 mt-0.5">
              اگر مکان هنوز مشخص نیست خالی بگذارید؛ یا تا ۱۰ مکان را برای نظرسنجی اضافه کنید.
            </p>
          </div>
        </div>

        {errors.places && (
          <p className="text-xs text-red-600" role="alert">
            {errors.places}
          </p>
        )}

        {places.length === 0 ? (
          <div className="text-center py-5 border border-dashed border-secondary-300 rounded-xl text-accent-200 text-sm">
            مکانی اضافه نشده است.
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
                    مکان پیشنهادی شماره {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlace(place.id)}
                    className="text-xs text-red-600 hover:text-red-700 focus:ring-2 focus:ring-brand-600 rounded px-1.5 py-1 focus:outline-none"
                    aria-label={`حذف مکان پیشنهادی ${index + 1}`}
                  >
                    حذف
                  </button>
                </div>

                {/* Place Name */}
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
                    placeholder="مثلاً: کافه راه‌رو، سالن یادگار، بوستان آب و آتش..."
                    className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                  {errors[`place_${index}_name`] && (
                    <p className="text-xs text-red-600 mt-1" role="alert">
                      {errors[`place_${index}_name`]}
                    </p>
                  )}
                </div>

                {/* Place URL */}
                <div>
                  <label
                    htmlFor={`place-${place.id}-url`}
                    className="block text-xs font-medium text-accent-300 mb-1"
                  >
                    لینک نشان یا بلد یا وبسایت{" "}
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
                  {errors[`place_${index}_url`] && (
                    <p className="text-xs text-red-600 mt-1" role="alert">
                      {errors[`place_${index}_url`]}
                    </p>
                  )}
                </div>

                {/* Place Note */}
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
                    placeholder="مثلاً: نزدیک مترو هفت تیر، پارکینگ دارد..."
                    className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                  {errors[`place_${index}_note`] && (
                    <p className="text-xs text-red-600 mt-1" role="alert">
                      {errors[`place_${index}_note`]}
                    </p>
                  )}
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-full font-medium text-base transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center justify-center gap-2"
      >
        {isSubmitting ? "در حال ثبت…" : "ساخت دورهمی"}
      </button>
    </form>
  );
}
