import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  getLocaleCookieValue,
  getLocaleRedirectPath,
  getLocaleFromPathname,
  resolveCurrentLocale,
  resolvePreferredLocale,
  shouldSkipLocaleDetection,
} from "@/src/features/i18n/routing";

const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: localeCookieMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
  });
}

function stripBasePath(pathname: string, basePath?: string) {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export function proxy(request: NextRequest) {
  const { search } = request.nextUrl;
  const pathname = stripBasePath(
    request.nextUrl.pathname,
    request.nextUrl.basePath,
  );

  if (shouldSkipLocaleDetection(pathname)) {
    return NextResponse.next();
  }

  const explicitLocale = getLocaleFromPathname(pathname);
  const currentLocale = resolveCurrentLocale({
    pathname,
    nextLocale: request.nextUrl.locale,
  });

  const preferredLocale = resolvePreferredLocale({
    pathname,
    cookieLocale: getLocaleCookieValue({
      [LOCALE_COOKIE_NAME]: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    }),
    acceptLanguage: request.headers.get("accept-language"),
  });

  const redirectPath = getLocaleRedirectPath({
    pathname,
    search,
    locale: preferredLocale,
    currentLocale,
    hasExplicitNonDefaultLocale:
      currentLocale !== DEFAULT_LOCALE ||
      (explicitLocale !== null && explicitLocale !== DEFAULT_LOCALE),
  });

  if (!redirectPath) {
    const response = NextResponse.next();
    if (preferredLocale !== DEFAULT_LOCALE) {
      setLocaleCookie(response, preferredLocale);
    }
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectPath.split("?")[0] || "/";
  redirectUrl.search = redirectPath.includes("?")
    ? `?${redirectPath.split("?").slice(1).join("?")}`
    : "";

  const response = NextResponse.redirect(redirectUrl);
  setLocaleCookie(response, preferredLocale);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
