import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "./locales";
import { getMessage, type MessageKey } from "./messages";

export type MessageValues = Record<string, string | number | boolean | null>;

export function interpolateMessage(message: string, values?: MessageValues) {
  if (!values) return message;

  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export function translateMessage(
  locale: SupportedLocale,
  key: MessageKey,
  values?: MessageValues,
) {
  return interpolateMessage(getMessage(locale, key), values);
}

export function getCurrentClientLocale(): SupportedLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  return normalizeLocale(document.documentElement.lang) ?? DEFAULT_LOCALE;
}

export function translateClientMessage(
  key: MessageKey,
  values?: MessageValues,
) {
  return translateMessage(getCurrentClientLocale(), key, values);
}
