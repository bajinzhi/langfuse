import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  normalizeLocale,
  supportedLocales,
  type SupportedLocale,
} from "./locales";

const PUBLIC_FILE_PATTERN = /\/[^/]+\.[^/]+$/;
const SKIPPED_PATH_PREFIXES = [
  "/api",
  "/_next",
  "/assets",
  "/favicon",
  "/icon",
  "/apple-touch-icon",
  "/robots.txt",
  "/sitemap.xml",
];

export function getLocaleFromPathname(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isSupportedLocale(firstSegment) ? firstSegment : null;
}

export function resolveCurrentLocale({
  pathname,
  nextLocale,
}: {
  pathname: string;
  nextLocale?: string | null;
}): SupportedLocale {
  return (
    normalizeLocale(nextLocale) ??
    getLocaleFromPathname(pathname) ??
    DEFAULT_LOCALE
  );
}

export function shouldSkipLocaleDetection(pathname: string) {
  return (
    PUBLIC_FILE_PATTERN.test(pathname) ||
    SKIPPED_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function parseAcceptLanguage(acceptLanguage: string | null | undefined) {
  if (!acceptLanguage) return [];

  return acceptLanguage
    .split(",")
    .map((part, index) => {
      const [language = "", ...params] = part.trim().split(";");
      const qValue = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = qValue ? Number(qValue.slice(2)) : 1;

      return {
        language,
        index,
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .filter((item) => item.language && item.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
}

export function resolvePreferredLocale({
  pathname,
  cookieLocale,
  acceptLanguage,
}: {
  pathname: string;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): SupportedLocale {
  const pathnameLocale = getLocaleFromPathname(pathname);
  if (pathnameLocale) return pathnameLocale;

  const normalizedCookieLocale = normalizeLocale(cookieLocale);
  if (normalizedCookieLocale) return normalizedCookieLocale;

  for (const acceptedLanguage of parseAcceptLanguage(acceptLanguage)) {
    const normalizedAcceptedLanguage = normalizeLocale(
      acceptedLanguage.language,
    );
    if (normalizedAcceptedLanguage) return normalizedAcceptedLanguage;
  }

  return DEFAULT_LOCALE;
}

export function getLocaleRedirectPath({
  pathname,
  search = "",
  locale,
  currentLocale,
  hasExplicitNonDefaultLocale = false,
}: {
  pathname: string;
  search?: string;
  locale: SupportedLocale;
  currentLocale?: SupportedLocale;
  hasExplicitNonDefaultLocale?: boolean;
}) {
  if (shouldSkipLocaleDetection(pathname)) return null;

  if (hasExplicitNonDefaultLocale && currentLocale === locale) {
    return null;
  }

  const pathnameLocale = getLocaleFromPathname(pathname);
  if (pathnameLocale) {
    if (pathnameLocale !== DEFAULT_LOCALE) return null;

    const withoutDefaultLocale =
      pathname === `/${DEFAULT_LOCALE}`
        ? "/"
        : pathname.replace(`/${DEFAULT_LOCALE}/`, "/");
    return `${withoutDefaultLocale}${search}`;
  }

  if (locale === DEFAULT_LOCALE) return null;

  const normalizedPathname = pathname === "/" ? "" : pathname;
  return `/${locale}${normalizedPathname}${search}`;
}

export function getLocaleCookieValue(
  cookies: Partial<Record<typeof LOCALE_COOKIE_NAME, string | undefined>>,
) {
  return cookies[LOCALE_COOKIE_NAME];
}

export { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, supportedLocales };
