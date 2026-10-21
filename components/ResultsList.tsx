import React from "react";
import { GatheringsResults } from "@/lib/results";
import { formatJalaliDateTime } from "@/lib/dates";
import { toPersianDigits } from "@/lib/text";

interface ResultsListProps {
  results: GatheringsResults;
}

export function ResultsList({ results }: ResultsListProps) {
  const { totalParticipants, dates, places, bestDates, bestPlaces } = results;

  const hasVotes = totalParticipants > 0;

  return (
    <div className="space-y-6">
      {hasVotes ? (
        <div className="bg-brand-50 border border-brand-600/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">
              پیشنهاد فعلی بر اساس آرا
            </span>
            <span className="text-xs text-accent-200">
              مجموع آرا: {toPersianDigits(totalParticipants)} شرکت‌کننده
            </span>
          </div>

          <div className="space-y-2 text-sm">
            {bestDates.length > 0 ? (
              <div>
                <span className="font-semibold text-accent-400">بهترین زمان: </span>
                {bestDates.length === 1 ? (
                  <span className="text-accent-300">
                    {formatJalaliDateTime(bestDates[0].startsAt)} (
                    {toPersianDigits(bestDates[0].count)} رأی)
                  </span>
                ) : (
                  <span className="text-accent-300">
                    {bestDates
                      .map((d) => `${formatJalaliDateTime(d.startsAt)} (${toPersianDigits(d.count)} رأی)`)
                      .join(" — ")}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-accent-200 text-xs">
                هنوز برای هیچ تاریخی رأی ثبت نشده است.
              </div>
            )}

            {places.length > 0 && (
              <div>
                <span className="font-semibold text-accent-400">بهترین مکان: </span>
                {bestPlaces.length > 0 ? (
                  bestPlaces.length === 1 ? (
                    <span className="text-accent-300">
                      {bestPlaces[0].name} ({toPersianDigits(bestPlaces[0].count)} رأی)
                    </span>
                  ) : (
                    <span className="text-accent-300">
                      {bestPlaces
                        .map((p) => `${p.name} (${toPersianDigits(p.count)} رأی)`)
                        .join(" — ")}
                    </span>
                  )
                ) : (
                  <span className="text-accent-200 text-xs">
                    هنوز برای مکانی رأی ثبت نشده است.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-secondary-200 rounded-2xl p-6 text-center text-accent-200 text-sm">
          هنوز کسی رأی نداده. اولین نفر باش!
        </div>
      )}

      <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-accent-400">
            نتایج زمان‌ها
          </h2>
          <p className="text-xs text-accent-200 mt-0.5">
            مرتب‌شده بر اساس بیشترین موافقت
          </p>
        </div>

        <div className="space-y-4">
          {dates.map((d) => (
            <div
              key={d.id}
              className={`p-4 rounded-xl border transition-colors ${
                d.isTop && d.count > 0
                  ? "border-brand-600/40 bg-brand-50/40"
                  : "border-secondary-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-accent-300 block">
                    {formatJalaliDateTime(d.startsAt)}
                  </span>
                  {d.isEdited && (
                    <span className="inline-block text-[11px] bg-secondary-300 text-accent-300 px-2 py-0.5 rounded-full font-medium">
                      ویرایش‌شده
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {d.isAllFree && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-600/30">
                      همه آزادند
                    </span>
                  )}
                  {d.isTop && !d.isTie && d.count > 0 && !d.isAllFree && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-600/30">
                      بیشترین رأی
                    </span>
                  )}
                  {d.isTop && d.isTie && d.count > 0 && !d.isAllFree && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary-300 text-accent-300">
                      مساوی
                    </span>
                  )}
                  <span className="text-xs font-medium text-accent-200">
                    {toPersianDigits(d.count)} از {toPersianDigits(totalParticipants)} نفر
                  </span>
                </div>
              </div>

              <div
                className="w-full bg-secondary-200 h-2 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={d.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    d.isTop && d.count > 0 ? "bg-brand-600" : "bg-secondary-400"
                  }`}
                  style={{ width: `${d.percentage}%` }}
                />
              </div>

              {d.voterNames.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {d.voterNames.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="px-2.5 py-0.5 text-xs rounded-full bg-secondary-300 text-accent-300 font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {places.length > 0 && (
        <div className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-accent-400">
              نتایج مکان‌ها
            </h2>
            <p className="text-xs text-accent-200 mt-0.5">
              مرتب‌شده بر اساس بیشترین پسند
            </p>
          </div>

          <div className="space-y-4">
            {places.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-colors ${
                  p.isTop && p.count > 0
                    ? "border-brand-600/40 bg-brand-50/40"
                    : "border-secondary-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-accent-300">
                        {p.name}
                      </span>
                      {p.isEdited && (
                        <span className="text-[11px] bg-secondary-300 text-accent-300 px-2 py-0.5 rounded-full font-medium">
                          ویرایش‌شده
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <p className="text-xs text-accent-200">{p.note}</p>
                    )}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-brand-600 hover:underline break-all"
                      >
                        مشاهده روی نقشه یا وبسایت
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.isTop && !p.isTie && p.count > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-600/30">
                        بیشترین رأی
                      </span>
                    )}
                    {p.isTop && p.isTie && p.count > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary-300 text-accent-300">
                        مساوی
                      </span>
                    )}
                    <span className="text-xs font-medium text-accent-200">
                      {toPersianDigits(p.count)} از {toPersianDigits(totalParticipants)} نفر
                    </span>
                  </div>
                </div>

                <div
                  className="w-full bg-secondary-200 h-2 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={p.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      p.isTop && p.count > 0 ? "bg-brand-600" : "bg-secondary-400"
                    }`}
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>

                {p.voterNames.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {p.voterNames.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        className="px-2.5 py-0.5 text-xs rounded-full bg-secondary-300 text-accent-300 font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
