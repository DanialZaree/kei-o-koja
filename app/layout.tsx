import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "کی و کجا | بالاخره یه قرار درست‌وحسابی!",
  description:
    "«کی و کجا» به چند دوست کمک می‌کند برای یک دورهمی زمان و مکان انتخاب کنند. بدون نیاز به ثبت‌نام و ورود.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-secondary-100 text-accent-300 min-h-screen antialiased">
        <div className="max-w-[680px] mx-auto px-4 py-8 sm:py-12">
          {children}
        </div>
      </body>
    </html>
  );
}
