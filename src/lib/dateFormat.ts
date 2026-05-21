export interface DateConfig {
  flatpickrFormat: string;
  locale: string;
  display: Intl.DateTimeFormatOptions;
  longDisplay: Intl.DateTimeFormatOptions;
}

const countryConfigs: Record<string, DateConfig> = {
  NG: {
    flatpickrFormat: "d/m/Y",
    locale: "en-NG",
    display: { day: "2-digit", month: "2-digit", year: "numeric" },
    longDisplay: { day: "numeric", month: "short", year: "numeric" },
  },
};

let active: DateConfig = countryConfigs.NG;

export function getDateFormat(): string {
  return active.flatpickrFormat;
}

export function formatDate(date: Date | string | number | undefined | null, style?: "short" | "long"): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  if (style === "long") {
    return d.toLocaleDateString(active.locale, active.longDisplay);
  }
  return d.toLocaleDateString(active.locale, active.display);
}

export function setCountry(code: string): void {
  if (countryConfigs[code]) {
    active = countryConfigs[code];
  }
}

export function formatDateTime(date: Date | string | number | undefined | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(active.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function addCountry(code: string, config: DateConfig): void {
  countryConfigs[code] = config;
}
