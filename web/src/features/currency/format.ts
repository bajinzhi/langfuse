import {
  convertFromUsd,
  formatCurrency,
  type CostValue,
  type SupportedCurrency,
} from "@langfuse/shared";
import {
  getActiveCurrency,
  getActiveRate,
} from "@/src/features/currency/store";

/**
 * Non-React helpers for places where a hook is impossible (CSV/PDF
 * exports, table value-formatters passed into recharts, etc.).
 *
 * These read the *current* active preference from the global store
 * synchronously. Components that subscribe via `useProjectCurrency`
 * stay reactive; non-React callers get a snapshot that always matches
 * what the user is currently looking at.
 */

interface FormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatActiveCurrency(
  usdValue: CostValue,
  options: FormatOptions = {},
): string {
  const currency = getActiveCurrency();
  const rate = getActiveRate(currency);
  return formatCurrency(convertFromUsd(usdValue, currency, rate), currency, {
    locale: options.locale ?? "en-US",
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  });
}

export function formatStrictCurrency(
  usdValue: CostValue,
  currency: SupportedCurrency,
  options: FormatOptions = {},
): string {
  return formatCurrency(convertFromUsd(usdValue, currency, 1), currency, {
    locale: options.locale ?? "en-US",
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  });
}

/**
 * Format the supplied USD value as USD strictly — used by Billing
 * pages where the displayed number is a real invoice amount and must
 * not be re-priced through the user's configured rate.
 */
export function formatUsdStrict(
  usdValue: CostValue,
  options: FormatOptions = {},
): string {
  return formatStrictCurrency(usdValue, "USD", options);
}
