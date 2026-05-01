import { DEFAULT_LOCALE, type SupportedLocale } from "../locales";
import { enMessages, type EnMessages, type MessageKey } from "./en";
import { zhCNMessages } from "./zh-CN";

export { enMessages };
export type { MessageKey };

export const messages: Record<SupportedLocale, EnMessages> = {
  en: enMessages,
  "zh-CN": zhCNMessages,
};

export function getMessage(locale: SupportedLocale, key: MessageKey): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
}
