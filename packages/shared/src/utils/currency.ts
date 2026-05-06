import Decimal from "decimal.js";

/**
 * Multi-currency display support (UI layer only).
 *
 * Langfuse stores model costs in USD; this module provides primitives that
 * convert and format those USD values into a project's chosen display
 * currency. The base currency is always USD; conversion rates express
 * "1 USD = N units of the target currency".
 *
 * Decisions:
 * - Decimal arithmetic (decimal.js) keeps cost math precise across the long
 *   tail of fractional-cent values that token-based pricing produces.
 * - We use **duck-typing** instead of `instanceof Decimal`. Cross-module
 *   bundles (web vs shared, server vs client) frequently produce two
 *   distinct Decimal classes with the same shape; `instanceof` returns
 *   false in that case and silently corrupts numbers.
 * - Currency descriptors live next to the type so adding a currency means
 *   touching exactly one file in this package.
 */

export const BASE_CURRENCY = "USD" as const;

export const SUPPORTED_CURRENCIES = ["USD", "CNY"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyDescriptor {
  /** ISO 4217 code. */
  code: SupportedCurrency;
  /** Display symbol used by Intl.NumberFormat as a fallback. */
  symbol: string;
  /** Default conversion rate from USD (1 USD = N units of this currency). */
  defaultRate: number;
  /**
   * Default minimum fraction digits. Cost values are often sub-cent so
   * pricing-style cells use larger fraction precision (see usdFormatter
   * in web/utils/numbers.ts which defaults to 6).
   */
  minimumFractionDigits: number;
  maximumFractionDigits: number;
}

export const CURRENCY_DESCRIPTORS: Record<SupportedCurrency, CurrencyDescriptor> = {
  USD: {
    code: "USD",
    symbol: "$",
    defaultRate: 1,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  },
  CNY: {
    code: "CNY",
    symbol: "¥",
    // Conservative spot rate as of mid-2025; users override per-project.
    defaultRate: 7.2,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  },
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

/**
 * Validate and clamp a user-supplied conversion rate.
 *
 * Returns the descriptor's default when the input is null/undefined,
 * non-finite, zero, or negative. Callers that need to detect "fall back
 * to default" can compare the result against `descriptor.defaultRate`.
 */
export function normalizeRate(
  currency: SupportedCurrency,
  rawRate: number | null | undefined,
): number {
  const descriptor = CURRENCY_DESCRIPTORS[currency];
  if (rawRate === null || rawRate === undefined) return descriptor.defaultRate;
  if (typeof rawRate !== "number" || !Number.isFinite(rawRate)) {
    return descriptor.defaultRate;
  }
  if (rawRate <= 0) return descriptor.defaultRate;
  return rawRate;
}

/**
 * Duck-type check for Decimal-shaped values. We avoid `instanceof Decimal`
 * because two bundles can produce two distinct Decimal classes and the
 * cross-module check fails silently.
 */
function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  );
}

export type CostValue = number | bigint | Decimal | null | undefined;

export function toBaseNumber(value: CostValue): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (isDecimalLike(value)) return value.toNumber();
  return 0;
}

/**
 * Convert a USD value into the target currency using the supplied rate.
 * Performs the multiplication in Decimal space then converts to a JS
 * number for downstream Intl formatting.
 */
export function convertFromUsd(
  usdValue: CostValue,
  targetCurrency: SupportedCurrency,
  rate: number,
): number {
  const usd = toBaseNumber(usdValue);
  if (targetCurrency === BASE_CURRENCY) return usd;
  const safeRate = normalizeRate(targetCurrency, rate);
  return new Decimal(usd).mul(safeRate).toNumber();
}

export interface FormatCurrencyOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a value already expressed in `currency` units. Caller is
 * responsible for performing any USD→target conversion first
 * (e.g. via `convertFromUsd`) — this function does not multiply by rate.
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  options: FormatCurrencyOptions = {},
): string {
  const descriptor = CURRENCY_DESCRIPTORS[currency];
  const locale = options.locale ?? "en-US";
  const minimumFractionDigits =
    options.minimumFractionDigits ?? descriptor.minimumFractionDigits;
  const maximumFractionDigits = Math.max(
    minimumFractionDigits,
    options.maximumFractionDigits ?? descriptor.maximumFractionDigits,
  );

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Convenience: format a USD value directly into the target currency.
 */
export function formatUsdAs(
  usdValue: CostValue,
  targetCurrency: SupportedCurrency,
  rate: number,
  options: FormatCurrencyOptions = {},
): string {
  const converted = convertFromUsd(usdValue, targetCurrency, rate);
  return formatCurrency(converted, targetCurrency, options);
}
