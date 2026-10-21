import { CreateForm } from "@/components/CreateForm";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <header className="text-center space-y-2 py-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-accent-400">
          کی و کجا
        </h1>
        <p className="text-base sm:text-lg text-accent-200 font-medium">
          بالاخره یه قرار درست‌وحسابی!
        </p>
        <p className="text-xs sm:text-sm text-accent-100 max-w-md mx-auto pt-1 leading-relaxed">
          تاریخ‌ها و مکان‌های مد نظرت رو ثبت کن، لینک رو برای دوستانت بفرست تا بدون نیاز به ثبت‌نام رأی بدن و زمان نهایی مشخص بشه.
        </p>
      </header>

      <CreateForm />
    </main>
  );
}
