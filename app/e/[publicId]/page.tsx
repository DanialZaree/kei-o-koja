import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateResults } from "@/lib/results";
import { formatJalaliDateTime } from "@/lib/dates";
import { CopyButton } from "@/components/CopyButton";
import { VoteForm } from "@/components/VoteForm";
import { ResultsList } from "@/components/ResultsList";
import { OrganizerPanel } from "@/components/OrganizerPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: {
    publicId: string;
  };
  searchParams?: {
    admin?: string;
    created?: string;
  };
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { publicId } = params;
  const adminParam = searchParams?.admin;
  const createdParam = searchParams?.created;

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      dateOptions: {
        include: {
          votes: {
            include: {
              participant: true,
            },
          },
        },
      },
      placeOptions: {
        include: {
          votes: {
            include: {
              participant: true,
            },
          },
        },
      },
      participants: {
        include: {
          dateVotes: true,
          placeVotes: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isAdmin = typeof adminParam === "string" && adminParam === event.adminKey;
  const isCreatedAndAdmin = createdParam === "1" && isAdmin;
  const isFinalized = event.status === "FINALIZED";

  const results = calculateResults(
    event.dateOptions,
    event.placeOptions,
    event.participants
  );

  const finalDate = event.finalDateOptionId
    ? event.dateOptions.find((d) => d.id === event.finalDateOptionId)
    : null;
  const finalPlace = event.finalPlaceOptionId
    ? event.placeOptions.find((p) => p.id === event.finalPlaceOptionId)
    : null;

  const finalMessageText = `قرار دورهمی: ${event.title}
زمان: ${finalDate ? formatJalaliDateTime(finalDate.startsAt) : ""}
${finalPlace ? `مکان: ${finalPlace.name}${finalPlace.url ? ` (${finalPlace.url})` : ""}` : ""}
مشاهده دورهمی: /e/${event.publicId}`;

  return (
    <main className="space-y-6">
      <header className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-brand-600 hover:underline font-semibold"
              >
                ← کی و کجا
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-accent-400">
              {event.title}
            </h1>
          </div>

          <div>
            {isFinalized ? (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-600/30">
                وضعیت: نهایی‌شده
              </span>
            ) : (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                وضعیت: باز (در حال رأی‌گیری)
              </span>
            )}
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-accent-200 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        )}

        <div className="pt-2 border-t border-secondary-200/60 flex items-center justify-between text-xs text-accent-100">
          <span>
            برگزارکننده:{" "}
            <span className="font-semibold text-accent-300">
              {event.organizerName}
            </span>
          </span>
          {isAdmin && (
            <span className="text-brand-600 font-medium">
              شما در حال مشاهده به عنوان مدیر هستید
            </span>
          )}
        </div>
      </header>

      {isFinalized && (
        <section className="bg-brand-50 border-2 border-brand-600 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">
              تصمیم نهایی دورهمی
            </span>
            <span className="text-xs bg-brand-600 text-white px-2.5 py-0.5 rounded-full font-medium">
              تأیید شده
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="text-xs text-accent-200 block">زمان قطعی:</span>
              <span className="text-base sm:text-lg font-bold text-accent-400">
                {finalDate ? formatJalaliDateTime(finalDate.startsAt) : "تعیین‌نشده"}
              </span>
            </div>

            {finalPlace && (
              <div>
                <span className="text-xs text-accent-200 block">مکان قطعی:</span>
                <span className="text-base font-semibold text-accent-400">
                  {finalPlace.name}
                </span>
                {finalPlace.note && (
                  <p className="text-xs text-accent-200 mt-0.5">
                    {finalPlace.note}
                  </p>
                )}
                {finalPlace.url && (
                  <div className="mt-1">
                    <a
                      href={finalPlace.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 underline font-medium"
                    >
                      مسیریابی و مشاهده روی نقشه
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <CopyButton
              textToCopy={finalMessageText}
              label="کپی پیام تصمیم نهایی"
              variant="primary"
            />
          </div>
        </section>
      )}

      {isCreatedAndAdmin && (
        <section className="bg-white border border-secondary-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-accent-400">
              دورهمی ساخته شد! لینک‌ها را به اشتراک بگذارید
            </h2>
            <p className="text-xs text-accent-200 mt-1">
              لینک عمومی را برای دوستانتان بفرستید و لینک مدیریت را فقط برای خودتان نگه دارید.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-secondary-100 rounded-xl space-y-2 border border-secondary-200">
              <span className="text-xs font-semibold text-accent-400 block">
                لینک دورهمی (برای دوستان)
              </span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <code
                  dir="ltr"
                  className="text-xs bg-white px-2.5 py-1.5 rounded-lg border border-secondary-300 text-accent-300 break-all"
                >
                  {`/e/${event.publicId}`}
                </code>
                <CopyButton
                  textToCopy={typeof window !== "undefined" ? window.location.origin + `/e/${event.publicId}` : `/e/${event.publicId}`}
                  label="کپی لینک عمومی"
                  showShare={true}
                  shareTitle={event.title}
                />
              </div>
            </div>

            <div className="p-3.5 bg-secondary-100 rounded-xl space-y-2 border border-secondary-200">
              <span className="text-xs font-semibold text-accent-400 block">
                لینک مدیریت (فقط برای خودت)
              </span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <code
                  dir="ltr"
                  className="text-xs bg-white px-2.5 py-1.5 rounded-lg border border-secondary-300 text-accent-300 break-all"
                >
                  {`/e/${event.publicId}?admin=${event.adminKey}`}
                </code>
                <CopyButton
                  textToCopy={typeof window !== "undefined" ? window.location.origin + `/e/${event.publicId}?admin=${event.adminKey}` : `/e/${event.publicId}?admin=${event.adminKey}`}
                  label="کپی لینک مدیریت"
                />
              </div>
              <p className="text-xs text-secondary-700 bg-brand-50 border border-secondary-200 rounded-lg p-2.5 mt-2 font-medium">
                هشدار: این لینک را ذخیره کن. اگر گمش کنی، دیگر نمی‌توانی دورهمی را مدیریت کنی.
              </p>
            </div>
          </div>
        </section>
      )}

      {!isFinalized && (
        <VoteForm
          publicId={event.publicId}
          dateOptions={event.dateOptions.map((d) => ({
            id: d.id,
            startsAt: d.startsAt,
            createdAt: d.createdAt,
            changedAt: d.changedAt,
          }))}
          placeOptions={event.placeOptions.map((p) => ({
            id: p.id,
            name: p.name,
            url: p.url,
            note: p.note,
            createdAt: p.createdAt,
            changedAt: p.changedAt,
          }))}
        />
      )}

      <ResultsList results={results} />

      {isAdmin && (
        <OrganizerPanel
          publicId={event.publicId}
          adminKey={event.adminKey}
          status={event.status}
          initialTitle={event.title}
          initialDescription={event.description}
          dateOptions={event.dateOptions.map((d) => ({
            id: d.id,
            startsAt: d.startsAt,
            createdAt: d.createdAt,
            changedAt: d.changedAt,
          }))}
          placeOptions={event.placeOptions.map((p) => ({
            id: p.id,
            name: p.name,
            url: p.url,
            note: p.note,
            createdAt: p.createdAt,
            changedAt: p.changedAt,
          }))}
          participants={event.participants.map((p) => ({
            id: p.id,
            name: p.name,
            dateVotes: p.dateVotes.map((v) => ({ dateOptionId: v.dateOptionId })),
          }))}
        />
      )}
    </main>
  );
}
