"use client";

import React, { useState } from "react";
import { JalaliDateTimePicker } from "./JalaliDateTimePicker";
import { formatJalaliDateTime, getCurrentTehranJalali, jalaaliToUtcDate } from "@/lib/dates";
import {
  updateEventInfoAction,
  addDateOptionAction,
  updateDateOptionAction,
  deleteDateOptionAction,
  addPlaceOptionAction,
  updatePlaceOptionAction,
  deletePlaceOptionAction,
  finalizeEventAction,
  reopenEventAction,
} from "@/app/actions";

interface DateOptionItem {
  id: string;
  startsAt: Date | string;
  createdAt: Date | string;
  changedAt: Date | string;
}

interface PlaceOptionItem {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  createdAt: Date | string;
  changedAt: Date | string;
}

interface ParticipantItem {
  id: string;
  name: string;
  dateVotes: { dateOptionId: string }[];
}

interface OrganizerPanelProps {
  publicId: string;
  adminKey: string;
  status: "OPEN" | "FINALIZED";
  initialTitle: string;
  initialDescription: string | null;
  dateOptions: DateOptionItem[];
  placeOptions: PlaceOptionItem[];
  participants: ParticipantItem[];
}

export function OrganizerPanel({
  publicId,
  adminKey,
  status,
  initialTitle,
  initialDescription,
  dateOptions,
  placeOptions,
  participants,
}: OrganizerPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [showAddDate, setShowAddDate] = useState(false);
  const [newDateIso, setNewDateIso] = useState<string>(() => {
    const { jy, jm, jd } = getCurrentTehranJalali();
    const d = jalaaliToUtcDate(jy, jm, jd, "19:00");
    if (d.getTime() <= Date.now()) {
      return new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    return d.toISOString();
  });
  const [dateSaving, setDateSaving] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateIso, setEditDateIso] = useState<string>("");

  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceUrl, setNewPlaceUrl] = useState("");
  const [newPlaceNote, setNewPlaceNote] = useState("");
  const [placeSaving, setPlaceSaving] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");
  const [editPlaceUrl, setEditPlaceUrl] = useState("");
  const [editPlaceNote, setEditPlaceNote] = useState("");

  const [selectedFinalDateId, setSelectedFinalDateId] = useState<string>(
    dateOptions[0]?.id || ""
  );
  const [selectedFinalPlaceId, setSelectedFinalPlaceId] = useState<string>(
    placeOptions[0]?.id || ""
  );
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);

  // participants who voted for other dates but cannot make this one
  const incompatibleParticipants = participants.filter((p) => {
    const hasAnyVote = p.dateVotes.length > 0;
    const votedThis = p.dateVotes.some((v) => v.dateOptionId === selectedFinalDateId);
    return hasAnyVote && !votedThis;
  });

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoMessage(null);
    setInfoError(null);
    try {
      const res = await updateEventInfoAction(publicId, adminKey, {
        title,
        description,
      });
      if (res.ok) {
        setInfoMessage("مشخصات دورهمی با موفقیت به‌روزرسانی شد.");
        setTimeout(() => setInfoMessage(null), 3000);
      } else {
        setInfoError(res.errors?.title || res.errors?.description || "خطا در ذخیره اطلاعات.");
      }
    } catch {
      setInfoError("خطایی رخ داد.");
    } finally {
      setInfoSaving(false);
    }
  };

  const handleAddDate = async () => {
    setDateSaving(true);
    try {
      const res = await addDateOptionAction(publicId, adminKey, newDateIso);
      if (res.ok) {
        setShowAddDate(false);
      } else {
        alert(res.errors?.startsAt || "خطا در افزودن تاریخ.");
      }
    } catch {
      alert("خطایی رخ داد.");
    } finally {
      setDateSaving(false);
    }
  };

  const handleUpdateDate = async (dateId: string) => {
    setDateSaving(true);
    try {
      const res = await updateDateOptionAction(publicId, adminKey, dateId, editDateIso);
      if (res.ok) {
        setEditingDateId(null);
      } else {
        alert(res.errors?.startsAt || "خطا در ویرایش تاریخ.");
      }
    } catch {
      alert("خطایی رخ داد.");
    } finally {
      setDateSaving(false);
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    if (dateOptions.length <= 1) {
      alert("حذف آخرین تاریخ ممکن نیست.");
      return;
    }
    const confirmed = window.confirm("آیا از حذف این تاریخ اطمینان دارید؟");
    if (!confirmed) return;

    try {
      const res = await deleteDateOptionAction(publicId, adminKey, dateId);
      if (!res.ok) {
        alert(res.errors?.general || "خطا در حذف تاریخ.");
      }
    } catch {
      alert("خطایی رخ داد.");
    }
  };

  const handleAddPlace = async () => {
    setPlaceSaving(true);
    try {
      const res = await addPlaceOptionAction(publicId, adminKey, {
        name: newPlaceName,
        url: newPlaceUrl || null,
        note: newPlaceNote || null,
      });
      if (res.ok) {
        setShowAddPlace(false);
        setNewPlaceName("");
        setNewPlaceUrl("");
        setNewPlaceNote("");
      } else {
        alert(res.errors?.name || res.errors?.url || "خطا در افزودن مکان.");
      }
    } catch {
      alert("خطایی رخ داد.");
    } finally {
      setPlaceSaving(false);
    }
  };

  const handleUpdatePlace = async (placeId: string) => {
    setPlaceSaving(true);
    try {
      const res = await updatePlaceOptionAction(publicId, adminKey, placeId, {
        name: editPlaceName,
        url: editPlaceUrl || null,
        note: editPlaceNote || null,
      });
      if (res.ok) {
        setEditingPlaceId(null);
      } else {
        alert(res.errors?.name || res.errors?.url || "خطا در ویرایش مکان.");
      }
    } catch {
      alert("خطایی رخ داد.");
    } finally {
      setPlaceSaving(false);
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    const confirmed = window.confirm("آیا از حذف این مکان اطمینان دارید؟");
    if (!confirmed) return;

    try {
      const res = await deletePlaceOptionAction(publicId, adminKey, placeId);
      if (!res.ok) {
        alert(res.errors?.general || "خطا در حذف مکان.");
      }
    } catch {
      alert("خطایی رخ داد.");
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const res = await finalizeEventAction(
        publicId,
        adminKey,
        selectedFinalDateId,
        placeOptions.length > 0 ? selectedFinalPlaceId : undefined
      );
      if (!res.ok) {
        setFinalizeError(res.errors?.general || res.errors?.dateId || "خطا در تأیید نهایی.");
      }
    } catch {
      setFinalizeError("خطایی رخ داد.");
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    const confirmed = window.confirm(
      "آیا از بازگشایی رأی‌گیری اطمینان دارید؟ تصمیم نهایی پاک می‌شود و رأی‌گیری مجدداً باز خواهد شد."
    );
    if (!confirmed) return;

    setReopening(true);
    try {
      await reopenEventAction(publicId, adminKey);
    } catch {
      alert("خطا در بازگشایی رأی‌گیری.");
    } finally {
      setReopening(false);
    }
  };

  const isOpen = status === "OPEN";

  return (
    <div className="bg-white border-2 border-brand-600/30 rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="border-b border-secondary-200 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-accent-400">
            پنل مدیریت دورهمی
          </h2>
          <p className="text-xs text-accent-200 mt-0.5">
            این بخش فقط برای شما (برگزارکننده) قابل مشاهده است.
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            isOpen ? "bg-green-50 text-green-700 border border-green-200" : "bg-brand-50 text-brand-600"
          }`}
        >
          {isOpen ? "وضعیت: باز" : "وضعیت: نهایی‌شده"}
        </span>
      </div>

      <form onSubmit={handleUpdateInfo} className="space-y-4">
        <h3 className="text-sm font-semibold text-accent-400">
          ویرایش مشخصات دورهمی
        </h3>

        {infoMessage && (
          <p className="text-xs text-green-700 font-medium">{infoMessage}</p>
        )}
        {infoError && (
          <p className="text-xs text-red-600 font-medium">{infoError}</p>
        )}

        <div>
          <label htmlFor="admin-edit-title" className="block text-xs text-accent-200 mb-1">
            عنوان دورهمی
          </label>
          <input
            id="admin-edit-title"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="admin-edit-desc" className="block text-xs text-accent-200 mb-1">
            توضیحات
          </label>
          <textarea
            id="admin-edit-desc"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={infoSaving}
          className="min-h-[44px] px-5 py-2 bg-white border border-secondary-300 hover:bg-secondary-100 text-accent-300 rounded-full text-xs font-semibold transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
        >
          {infoSaving ? "در حال ذخیره…" : "ذخیره تغییرات مشخصات"}
        </button>
      </form>

      {isOpen && (
        <div className="border-t border-secondary-200 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-accent-400">
              مدیریت گزینه‌های زمان
            </h3>
            {dateOptions.length < 10 && !showAddDate && (
              <button
                type="button"
                onClick={() => setShowAddDate(true)}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                + افزودن زمان جدید
              </button>
            )}
          </div>

          {showAddDate && (
            <div className="p-3.5 bg-secondary-100 border border-secondary-200 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-accent-400 block">
                افزودن تاریخ و ساعت پیشنهادی جدید
              </span>
              <JalaliDateTimePicker
                value={newDateIso}
                onChange={setNewDateIso}
                idPrefix="admin-add-date"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={dateSaving}
                  onClick={handleAddDate}
                  className="min-h-[44px] px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-full text-xs font-medium focus:ring-2 focus:ring-brand-600"
                >
                  {dateSaving ? "در حال ثبت…" : "افزودن این تاریخ"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDate(false)}
                  className="min-h-[44px] px-4 py-2 bg-white border border-secondary-200 text-accent-300 rounded-full text-xs font-medium"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {dateOptions.map((opt) => (
              <div
                key={opt.id}
                className="p-3 bg-secondary-100 rounded-xl border border-secondary-200 space-y-2"
              >
                {editingDateId === opt.id ? (
                  <div className="space-y-3">
                    <p className="text-xs text-secondary-700 font-medium">
                      توجه: با ویرایش این زمان، آرای ثبت‌شده برای آن پاک شده و برچسب «ویرایش‌شده» خواهد گرفت.
                    </p>
                    <JalaliDateTimePicker
                      value={editDateIso}
                      onChange={setEditDateIso}
                      idPrefix={`edit-date-${opt.id}`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={dateSaving}
                        onClick={() => handleUpdateDate(opt.id)}
                        className="min-h-[44px] px-4 py-2 bg-brand-600 text-white rounded-full text-xs font-medium focus:ring-2 focus:ring-brand-600"
                      >
                        {dateSaving ? "در حال ذخیره…" : "ذخیره تغییر زمان"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDateId(null)}
                        className="min-h-[44px] px-4 py-2 bg-white border border-secondary-200 text-accent-300 rounded-full text-xs font-medium"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-accent-300">
                      {formatJalaliDateTime(opt.startsAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDateId(opt.id);
                          setEditDateIso(new Date(opt.startsAt).toISOString());
                        }}
                        className="text-xs text-brand-600 hover:underline px-2 py-1 rounded focus:ring-2 focus:ring-brand-600"
                      >
                        ویرایش
                      </button>
                      {dateOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDate(opt.id)}
                          className="text-xs text-red-600 hover:underline px-2 py-1 rounded focus:ring-2 focus:ring-brand-600"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-secondary-200 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-accent-400">
              مدیریت گزینه‌های مکان
            </h3>
            {placeOptions.length < 10 && !showAddPlace && (
              <button
                type="button"
                onClick={() => setShowAddPlace(true)}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                + افزودن مکان جدید
              </button>
            )}
          </div>

          {showAddPlace && (
            <div className="p-3.5 bg-secondary-100 border border-secondary-200 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-accent-400 block">
                افزودن مکان پیشنهادی جدید
              </span>
              <div>
                <label className="block text-xs text-accent-200 mb-1">
                  نام مکان *
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  placeholder="نام مکان"
                />
              </div>
              <div>
                <label className="block text-xs text-accent-200 mb-1">
                  لینک (اختیاری)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  maxLength={300}
                  value={newPlaceUrl}
                  onChange={(e) => setNewPlaceUrl(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm text-left focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs text-accent-200 mb-1">
                  یادداشت (اختیاری)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={newPlaceNote}
                  onChange={(e) => setNewPlaceNote(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  placeholder="یادداشت کوتاه"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={placeSaving || !newPlaceName.trim()}
                  onClick={handleAddPlace}
                  className="min-h-[44px] px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-full text-xs font-medium focus:ring-2 focus:ring-brand-600"
                >
                  {placeSaving ? "در حال ثبت…" : "افزودن این مکان"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlace(false)}
                  className="min-h-[44px] px-4 py-2 bg-white border border-secondary-200 text-accent-300 rounded-full text-xs font-medium"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {placeOptions.map((opt) => (
              <div
                key={opt.id}
                className="p-3 bg-secondary-100 rounded-xl border border-secondary-200 space-y-2"
              >
                {editingPlaceId === opt.id ? (
                  <div className="space-y-3">
                    <p className="text-xs text-secondary-700 font-medium">
                      توجه: با ویرایش این مکان، آرای ثبت‌شده برای آن پاک شده و برچسب «ویرایش‌شده» خواهد گرفت.
                    </p>
                    <input
                      type="text"
                      maxLength={60}
                      value={editPlaceName}
                      onChange={(e) => setEditPlaceName(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm"
                      placeholder="نام مکان"
                    />
                    <input
                      type="url"
                      dir="ltr"
                      maxLength={300}
                      value={editPlaceUrl}
                      onChange={(e) => setEditPlaceUrl(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm text-left"
                      placeholder="لینک"
                    />
                    <input
                      type="text"
                      maxLength={120}
                      value={editPlaceNote}
                      onChange={(e) => setEditPlaceNote(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm"
                      placeholder="یادداشت"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={placeSaving || !editPlaceName.trim()}
                        onClick={() => handleUpdatePlace(opt.id)}
                        className="min-h-[44px] px-4 py-2 bg-brand-600 text-white rounded-full text-xs font-medium focus:ring-2 focus:ring-brand-600"
                      >
                        {placeSaving ? "در حال ذخیره…" : "ذخیره تغییر مکان"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlaceId(null)}
                        className="min-h-[44px] px-4 py-2 bg-white border border-secondary-200 text-accent-300 rounded-full text-xs font-medium"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-accent-300 block">
                        {opt.name}
                      </span>
                      {opt.note && (
                        <span className="text-[11px] text-accent-200 block">
                          {opt.note}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlaceId(opt.id);
                          setEditPlaceName(opt.name);
                          setEditPlaceUrl(opt.url || "");
                          setEditPlaceNote(opt.note || "");
                        }}
                        className="text-xs text-brand-600 hover:underline px-2 py-1 rounded focus:ring-2 focus:ring-brand-600"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlace(opt.id)}
                        className="text-xs text-red-600 hover:underline px-2 py-1 rounded focus:ring-2 focus:ring-brand-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-secondary-200 pt-5 space-y-4">
        {isOpen ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-accent-400">
                تأیید تصمیم نهایی
              </h3>
              <p className="text-xs text-accent-200 mt-0.5">
                وقتی درباره زمان و مکان به توافق رسیدید، آن را انتخاب و نهایی کنید تا رأی‌گیری بسته شود.
              </p>
            </div>

            {finalizeError && (
              <p className="text-xs text-red-600 font-medium">{finalizeError}</p>
            )}

            <div>
              <label
                htmlFor="final-date-select"
                className="block text-xs font-semibold text-accent-300 mb-1"
              >
                انتخاب تاریخ و ساعت نهایی *
              </label>
              <select
                id="final-date-select"
                value={selectedFinalDateId}
                onChange={(e) => setSelectedFinalDateId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                {dateOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatJalaliDateTime(d.startsAt)}
                  </option>
                ))}
              </select>
            </div>

            {placeOptions.length > 0 && (
              <div>
                <label
                  htmlFor="final-place-select"
                  className="block text-xs font-semibold text-accent-300 mb-1"
                >
                  انتخاب مکان نهایی *
                </label>
                <select
                  id="final-place-select"
                  value={selectedFinalPlaceId}
                  onChange={(e) => setSelectedFinalPlaceId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-secondary-400 rounded-xl text-accent-300 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                >
                  {placeOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {incompatibleParticipants.length > 0 ? (
              <div className="p-4 rounded-xl bg-brand-50 border border-secondary-300 space-y-3">
                <p className="text-xs text-accent-300 leading-relaxed font-medium">
                  این افراد برای این زمان رأی نداده‌اند:{" "}
                  <span className="font-bold text-accent-400">
                    {incompatibleParticipants.map((p) => p.name).join("، ")}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalize}
                  className="min-h-[44px] px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-xs font-semibold transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
                >
                  {finalizing ? "در حال ثبت…" : "با این حال تأیید کن"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={finalizing || !selectedFinalDateId}
                onClick={handleFinalize}
                className="w-full min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-semibold transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                {finalizing ? "در حال ثبت…" : "تأیید و ثبت تصمیم نهایی"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-accent-400">
              دورهمی نهایی شده است
            </h3>
            <p className="text-xs text-accent-200">
              می‌توانید در صورت لزوم رأی‌گیری را مجدداً بازگشایی کنید. تصمیم نهایی فعلی پاک می‌شود و رأی‌ها حفظ خواهند شد.
            </p>
            <button
              type="button"
              disabled={reopening}
              onClick={handleReopen}
              className="min-h-[44px] px-5 py-2 bg-white border border-secondary-400 text-accent-300 hover:bg-secondary-100 rounded-full text-xs font-semibold transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
            >
              {reopening ? "در حال بازگشایی…" : "بازگشایی رأی‌گیری"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
