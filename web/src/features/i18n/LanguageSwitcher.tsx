import { Check } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  localeDisplayNames,
  supportedLocales,
  type SupportedLocale,
} from "./locales";
import { useI18n } from "./useI18n";

const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

function persistLocale(locale: SupportedLocale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(
    locale,
  )}; path=/; max-age=${localeCookieMaxAgeSeconds}; SameSite=Lax`;
}

export function useLocaleSwitcher() {
  const router = useRouter();

  return useCallback(
    (nextLocale: SupportedLocale) => {
      persistLocale(nextLocale);
      void router.push(
        { pathname: router.pathname, query: router.query },
        router.asPath,
        { locale: nextLocale },
      );
    },
    [router],
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const switchLocale = useLocaleSwitcher();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isSupportedLocale(value)) {
          switchLocale(value);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLocales.map((localeOption) => (
          <SelectItem key={localeOption} value={localeOption}>
            {localeDisplayNames[localeOption]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LanguageMenuItemContent({
  localeOption,
}: {
  localeOption: SupportedLocale;
}) {
  const { locale } = useI18n();

  return (
    <span className="flex w-full items-center justify-between gap-3">
      {localeDisplayNames[localeOption]}
      {locale === localeOption ? <Check className="h-4 w-4" /> : null}
    </span>
  );
}
