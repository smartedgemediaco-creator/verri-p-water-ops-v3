"use client";
import React from "react";

export const FactoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V11l4 2V9l4 2V7l4 2V3l4 2v16H3z" />
    <path d="M7 21v-4" />
    <path d="M11 21v-4" />
    <path d="M15 21v-4" />
    <path d="M19 21v-4" />
    <path d="M3 21h18" />
    <rect x="8" y="15" width="2" height="2" rx="0.3" />
    <rect x="14" y="15" width="2" height="2" rx="0.3" />
  </svg>
);

export const DepotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V8l9-5 9 5v13H3z" />
    <path d="M9 21V12h6v9" />
    <path d="M12 3v3" />
  </svg>
);

export const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16h2a2 2 0 002-2V9l-4-4H5a2 2 0 00-2 2v9a2 2 0 002 2h1" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
    <path d="M16 5v4h4" />
    <path d="M9 5v8" />
  </svg>
);

export const WaterDropIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8 8 5 12 5 15.5a7 7 0 0014 0C19 12 16 8 12 2z" />
    <path d="M10 16a3 3 0 004 0" strokeWidth="1" />
  </svg>
);

export const BottleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2h8v3a4 4 0 01-1.5 3.1L13 9.5V21a1 1 0 01-1 1h0a1 1 0 01-1-1V9.5L9.5 8.1A4 4 0 018 5V2z" />
    <path d="M8.5 5.5h7" />
    <path d="M10 13h4" />
    <path d="M10 16h4" />
  </svg>
);

export const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" />
    <path d="M6 4h12" />
    <path d="M4 8l4-4" />
    <path d="M20 8l-4-4" />
    <path d="M5 16l4-4" />
    <path d="M19 16l-4-4" />
    <path d="M8 20h8" />
  </svg>
);

export const ReportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
    <circle cx="18" cy="16" r="2" fill="currentColor" opacity="0.3" />
    <circle cx="18" cy="16" r="2.5" strokeWidth="1" />
  </svg>
);

export const TransferIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7-7" />
  </svg>
);
