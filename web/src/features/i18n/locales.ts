export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const supportedLocales = ["en", "zh-CN"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const localeDisplayNames: Record<SupportedLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(
  locale: string | null | undefined,
): locale is SupportedLocale {
  return Boolean(locale && supportedLocaleSet.has(locale));
}

export function normalizeLocale(
  locale: string | null | undefined,
): SupportedLocale | null {
  if (!locale) return null;

  const normalized = locale.trim().replace("_", "-").toLowerCase();

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return "zh-CN";
  }

  return null;
}
