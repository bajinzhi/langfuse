import { createContext, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "./locales";
import { type MessageKey } from "./messages";
import { translateMessage, type MessageValues } from "./format";

type I18nContextValue = {
  locale: SupportedLocale;
  t: (key: MessageKey, values?: MessageValues) => string;
  formatDate: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = normalizeLocale(router.locale) ?? DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) =>
      translateMessage(locale, key, values),
    [locale],
  );

  const formatDate = useCallback(
    (value: Date | number | string, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(new Date(value)),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      t,
      formatDate,
      formatNumber,
    }),
    [formatDate, formatNumber, locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
