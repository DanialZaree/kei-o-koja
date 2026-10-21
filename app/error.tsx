"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="bg-white border border-secondary-200 rounded-2xl p-8 text-center space-y-4 my-12">
      <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl font-bold">
        !
      </div>
      <h1 className="text-xl font-bold text-accent-400">
        مشکلی پیش آمده است
      </h1>
      <p className="text-sm text-accent-200 max-w-sm mx-auto">
        در برقراری ارتباط یا بارگذاری اطلاعات خطایی رخ داد. لطفاً دوباره تلاش کنید.
      </p>
      <div className="pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-[44px] items-center justify-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none"
        >
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
