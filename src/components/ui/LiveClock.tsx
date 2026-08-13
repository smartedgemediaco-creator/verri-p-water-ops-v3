"use client";

import { useEffect, useState } from "react";

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
  showTime?: boolean;
  compact?: boolean;
}

export default function LiveClock({
  className = "",
  showDate = true,
  showTime = true,
  compact = false,
}: LiveClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const firstTick = setTimeout(() => {
      if (active) setNow(new Date());
    }, 0);
    const timer = setInterval(() => {
      if (active) setNow(new Date());
    }, 1000);
    return () => {
      active = false;
      clearTimeout(firstTick);
      clearInterval(timer);
    };
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showDate && (
          <span className="hidden xl:inline-block text-xs font-medium text-gray-500 dark:text-gray-400">
            {date}
          </span>
        )}
        {showDate && showTime && (
          <span className="hidden xl:inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        {showTime && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
            <svg
              className="fill-brand-500 dark:fill-brand-400"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 4.25C7.71979 4.25 4.25 7.71979 4.25 12C4.25 16.2802 7.71979 19.75 12 19.75C16.2802 19.75 19.75 16.2802 19.75 12C19.75 7.71979 16.2802 4.25 12 4.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12ZM12 7.75C12.4142 7.75 12.75 8.08579 12.75 8.5V11.75H16C16.4142 11.75 16.75 12.0858 16.75 12.5C16.75 12.9142 16.4142 13.25 16 13.25H12C11.5858 13.25 11.25 12.9142 11.25 12.5V8.5C11.25 8.08579 11.5858 7.75 12 7.75Z"
              />
            </svg>
            {time}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-brand-500/[0.08] dark:bg-brand-500/10">
        <svg
          className="fill-brand-600 dark:fill-brand-400"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 4.25C7.71979 4.25 4.25 7.71979 4.25 12C4.25 16.2802 7.71979 19.75 12 19.75C16.2802 19.75 19.75 16.2802 19.75 12C19.75 7.71979 16.2802 4.25 12 4.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12ZM12 7.75C12.4142 7.75 12.75 8.08579 12.75 8.5V11.75H16C16.4142 11.75 16.75 12.0858 16.75 12.5C16.75 12.9142 16.4142 13.25 16 13.25H12C11.5858 13.25 11.25 12.9142 11.25 12.5V8.5C11.25 8.08579 11.5858 7.75 12 7.75Z"
          />
        </svg>
      </span>
      <div>
        {showDate && (
          <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{date}</p>
        )}
        {showTime && (
          <p className="text-title-sm font-bold tabular-nums text-gray-800 dark:text-white">
            {time}
          </p>
        )}
      </div>
    </div>
  );
}
