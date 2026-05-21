"use client";

import { useRef, useCallback, useEffect } from "react";

export default function AutoAmount({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth && size > 8) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, []);
  useEffect(() => { fit(); }, [value, fit]);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [fit]);
  return (
    <span ref={ref} className={`mt-1 font-bold text-title-sm whitespace-nowrap ${className}`} style={{ overflow: "hidden", display: "block" }}>
      {value}
    </span>
  );
}
