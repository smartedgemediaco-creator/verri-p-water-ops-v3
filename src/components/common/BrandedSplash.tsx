"use client";

export default function BrandedSplash() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      {/* Water ripple rings behind logo */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-2 border-sky-200 dark:border-sky-500/20 animate-[ripple_2.5s_ease-out_infinite]" />
          <div className="absolute w-28 h-28 rounded-full border-2 border-sky-300 dark:border-sky-500/30 animate-[ripple_2.5s_ease-out_infinite_0.4s]" />
          <div className="absolute w-28 h-28 rounded-full border-2 border-sky-400 dark:border-sky-500/40 animate-[ripple_2.5s_ease-out_infinite_0.8s]" />
        </div>
        <div className="relative animate-[splashFadeIn_0.8s_ease-out]">
          <img
            src="/images/logo/auth-logo.svg"
            alt="Verri P Water"
            className="w-20 h-20"
          />
        </div>
      </div>

      {/* Company name */}
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white animate-[splashFadeIn_0.8s_ease-out_0.15s_both]">
        Verri P Water Inc
      </h1>

      {/* Subtitle */}
      <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 animate-[splashFadeIn_0.8s_ease-out_0.3s_both]">
        Operations Dashboard
      </p>

      {/* Loading bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800">
        <div className="h-full w-full origin-left animate-[splashBar_2.2s_ease-in-out_infinite] bg-gradient-to-r from-sky-400 via-brand-500 to-sky-300" />
      </div>
    </div>
  );
}
