import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-white border border-secondary-200 rounded-2xl p-8 text-center space-y-4 my-12">
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary-200 flex items-center justify-center text-accent-200 text-2xl font-bold">
        ۴۰۴
      </div>
      <h1 className="text-xl font-bold text-accent-400">
        دورهمی پیدا نشد!
      </h1>
      <p className="text-sm text-accent-200 max-w-sm mx-auto">
        ممکن است آدرس دورهمی اشتباه باشد یا توسط برگزارکننده حذف شده باشد.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
        >
          ساخت دورهمی جدید
        </Link>
      </div>
    </div>
  );
}
