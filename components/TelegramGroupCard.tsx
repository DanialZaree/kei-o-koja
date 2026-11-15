"use client";

import React, { useState } from "react";

interface TelegramGroupCardProps {
  publicId: string;
  eventTitle: string;
  isLinked?: boolean;
}

export function TelegramGroupCard({
  publicId,
  eventTitle,
  isLinked = false,
}: TelegramGroupCardProps) {
  const [copied, setCopied] = useState(false);
  const botUsername = "keiokojabot";
  const deepLink = `https://t.me/${botUsername}?startgroup=event_${publicId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border border-sky-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
            ✈️
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-sky-950">
              اتصال به گروه تلگرام و اطلاع‌رسانی خودکار
            </h3>
            <p className="text-xs text-sky-700 mt-0.5">
              ربات را به گروه دوستانتان اضافه کنید تا رأی‌گیری و تغییرات زمان و مکان در گروه هماهنگ شود.
            </p>
          </div>
        </div>

        {isLinked && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            متصل به گروه
          </span>
        )}
      </div>

      <div className="bg-white/90 border border-sky-100 rounded-xl p-3.5 space-y-2 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center gap-2 text-sky-800 font-semibold">
          <span>💡 مزایای اتصال به تلگرام:</span>
        </div>
        <ul className="space-y-1 list-disc list-inside text-slate-600 pr-1">
          <li>اعلام خودکار به گروه هنگام ویرایش یا اضافه شدن زمان و مکان جدید</li>
          <li>اعلام فوری نتیجه نهایی و زمان قطعی دورهمی در گروه</li>
          <li>امکان رأی‌گیری ۱-کلیکه برای اعضای گروه بدون نیاز به باز کردن سایت</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-sky-500 focus:outline-none"
        >
          <span>افزودن ربات به گروه تلگرام</span>
          <span dir="ltr">↗</span>
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 bg-white hover:bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-medium rounded-xl transition-all"
        >
          <span>{copied ? "✓ لینک کپی شد!" : "کپی لینک فعال‌سازی در گروه"}</span>
        </button>
      </div>
    </div>
  );
}

