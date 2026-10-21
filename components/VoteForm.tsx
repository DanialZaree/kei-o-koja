"use client";

import React, { useEffect, useState } from "react";
import { formatJalaliDateTime } from "@/lib/dates";
import { saveVotesAction } from "@/app/actions";

interface DateOptionData {
  id: string;
  startsAt: Date | string;
  createdAt: Date | string;
  changedAt: Date | string;
}

interface PlaceOptionData {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  createdAt: Date | string;
  changedAt: Date | string;
}

interface VoteFormProps {
  publicId: string;
  dateOptions: DateOptionData[];
  placeOptions: PlaceOptionData[];
}

export function VoteForm({ publicId, dateOptions, placeOptions }: VoteFormProps) {
  const [name, setName] = useState("");
  const [selectedDateIds, setSelectedDateIds] = useState<string[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const savedName = localStorage.getItem("keio_koja_voter_name");
      if (savedName) {
        setName(savedName);
      }
    } catch {
      // localStorage may not be accessible in private browsing
    }
  }, []);

  const toggleDate = (id: string) => {
    setSelectedDateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const togglePlace = (id: string) => {
    setSelectedPlaceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const res = await saveVotesAction(publicId, {
        name,
        dateIds: selectedDateIds,
        placeIds: selectedPlaceIds,
      });

      if (!res.ok) {
        setErrors(res.errors || {});
      } else {
        try {
          localStorage.setItem("keio_koja_voter_name", name.trim());
        } catch {
          // ignore
        }
        setSuccessMessage(res.message || "رأی‌ات با موفقیت ثبت شد!");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      setErrors({ form: "خطایی در ثبت رأی رخ داد. لطفاً دوباره امتحان کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-accent-400">ثبت رأی شما</h2>
        <p className="text-xs text-accent-200 mt-1">
          نظرت را درباره زمان‌ها و مکان‌های پیشنهادی مشخص کن.
        </p>
      </div>

      {successMessage && (
        <div
          className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2"
          role="status"
        >
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {errors.form && (
        <div
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          role="alert"
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="voter-name"
            className="block text-sm font-semibold text-accent-400 mb-1"
          >
            نام تو <span className="text-red-500">*</span>
          </label>
          <input
            id="voter-name"
            type="text"
            required
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: علی، نیلوفر..."
            className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm placeholder:text-accent-100 focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
          <p className="text-xs text-accent-100 mt-1.5">
            اگر قبلاً با همین نام رأی داده‌ای، رأی قبلی‌ات به‌روز می‌شود.
          </p>
          {errors.name && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-accent-400">
              کی می‌تونی بیای؟
            </h3>
            <p className="text-xs text-accent-200 mt-0.5">
              هر تاریخی که می‌توانی حضور داشته باشی را تیک بزن.
            </p>
          </div>

          <div className="space-y-2">
            {dateOptions.map((opt) => {
              const isChecked = selectedDateIds.includes(opt.id);
              const isEdited =
                new Date(opt.changedAt).getTime() > new Date(opt.createdAt).getTime();

              return (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                    isChecked
                      ? "bg-brand-50 border-brand-600"
                      : "bg-white border-secondary-200 hover:bg-secondary-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDate(opt.id)}
                      className="w-5 h-5 rounded border-secondary-400 text-brand-600 focus:ring-brand-600"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-accent-300">
                        {formatJalaliDateTime(opt.startsAt)}
                      </span>
                      {isEdited && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] bg-secondary-300 text-accent-300 px-2 py-0.5 rounded-full">
                            ویرایش‌شده
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isChecked
                        ? "bg-brand-600 text-white"
                        : "text-accent-200 border border-secondary-200"
                    }`}
                  >
                    می‌تونم
                  </span>
                </label>
              );
            })}
          </div>

          {selectedDateIds.length === 0 && (
            <p className="text-xs text-secondary-700 bg-brand-50 border border-secondary-200 rounded-lg p-2.5 font-medium">
              توجه: هیچ تاریخی انتخاب نشده است؛ یعنی اعلام می‌کنی در هیچ‌کدام از زمان‌های پیشنهادی نمی‌توانی شرکت کنی.
            </p>
          )}
        </div>

        {placeOptions.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-accent-400">
                کجا رو بیشتر دوست داری؟
              </h3>
              <p className="text-xs text-accent-200 mt-0.5">
                مکان‌هایی که می‌پسندی را انتخاب کن (بدون محدودیت).
              </p>
            </div>

            <div className="space-y-2">
              {placeOptions.map((opt) => {
                const isChecked = selectedPlaceIds.includes(opt.id);
                const isEdited =
                  new Date(opt.changedAt).getTime() > new Date(opt.createdAt).getTime();

                return (
                  <label
                    key={opt.id}
                    className={`flex items-start justify-between p-3.5 rounded-xl border transition-colors cursor-pointer select-none ${
                      isChecked
                        ? "bg-brand-50 border-brand-600"
                        : "bg-white border-secondary-200 hover:bg-secondary-100"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePlace(opt.id)}
                        className="w-5 h-5 mt-0.5 rounded border-secondary-400 text-brand-600 focus:ring-brand-600"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-accent-300">
                            {opt.name}
                          </span>
                          {isEdited && (
                            <span className="text-[11px] bg-secondary-300 text-accent-300 px-2 py-0.5 rounded-full">
                              ویرایش‌شده
                            </span>
                          )}
                        </div>
                        {opt.note && (
                          <p className="text-xs text-accent-200">{opt.note}</p>
                        )}
                        {opt.url && (
                          <a
                            href={opt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block text-xs text-brand-600 hover:underline break-all"
                          >
                            مشاهده روی نقشه یا وبسایت
                          </a>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ms-2 ${
                        isChecked
                          ? "bg-brand-600 text-white"
                          : "text-accent-200 border border-secondary-200"
                      }`}
                    >
                      می‌پسندم
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-full font-medium text-base transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none flex items-center justify-center gap-2"
        >
          {isSubmitting ? "در حال ثبت…" : "ثبت رأی"}
        </button>
      </form>
    </div>
  );
}
