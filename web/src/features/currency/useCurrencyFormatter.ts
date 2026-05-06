import { useCallback, useMemo } from "react";
import {
  CURRENCY_DESCRIPTORS,
  convertFromUsd,
  formatCurrency,
  type CostValue,
  type SupportedCurrency,
} from "@langfuse/shared";
import { useI18n } from "@/src/features/i18n";
import { useProjectCurrency } from "@/src/features/currency/useProjectCurrency";

/**
 * Hook factory for project-aware currency formatting.
 *
 * The implementation defers locale handling to the global UI locale —
 * forcing a currency-specific locale (e.g. `zh-CN` for CNY) caused
 * inconsistent number grouping when the user kept the UI in English but
 * displayed prices in CNY. Letting Intl pick from the user's locale
 * with `currency: "CNY"` gives a result like `CN¥0.17` in en mode and
 * `¥0.17` in zh-CN mode, both of which are correct for that locale.
 */

export interface UsdAmountDescriptor {
  /** Original USD value as a JS number for tooltip rendering. */
  usdValue: number;
  /** Converted value in the active currency. */
  convertedValue: number;
  /** Active display currency. */
  currency: SupportedCurrency;
  /** Conversion rate used (1 USD = N units). */
  rate: number;
  /** Pre-formatted display string for the active currency. */
  formatted: string;
  /** Pre-formatted USD string (used inside tooltips). */
  usdFormatted: string;
  /** True when activeCurrency != USD (controls tooltip visibility). */
  isConverted: boolean;
}

interface FormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function useCurrencyFormatter() {
  const { locale } = useI18n();
  const { activeCurrency, activeRate, isConverted } = useProjectCurrency();

  const format = useCallback(
    (value: CostValue, options: FormatOptions = {}) => {
      const converted = convertFromUsd(value, activeCurrency, activeRate);
      return formatCurrency(converted, activeCurrency, {
        locale,
        ...options,
      });
    },
    [activeCurrency, activeRate, locale],
  );

  const formatUsd = useCallback(
    (value: CostValue, options: FormatOptions = {}) => {
      const usd = convertFromUsd(value, "USD", 1);
      return formatCurrency(usd, "USD", { locale, ...options });
    },
    [locale],
  );

  const describe = useCallback(
    (value: CostValue, options: FormatOptions = {}): UsdAmountDescriptor => {
      const usdValue = convertFromUsd(value, "USD", 1);
      const convertedValue = convertFromUsd(value, activeCurrency, activeRate);
      return {
        usdValue,
        convertedValue,
        currency: activeCurrency,
        rate: activeRate,
        formatted: formatCurrency(convertedValue, activeCurrency, {
          locale,
          ...options,
        }),
        usdFormatted: formatCurrency(usdValue, "USD", {
          locale,
          ...options,
        }),
        isConverted,
      };
    },
    [activeCurrency, activeRate, isConverted, locale],
  );

  const symbol = useMemo(
    () => CURRENCY_DESCRIPTORS[activeCurrency].symbol,
    [activeCurrency],
  );

  /**
   * Aggregated-cost formatter for dashboard cards.
   *
   * Mirrors the precision rule of the original `totalCostDashboardFormatted`
   * helper (sub-$5 totals get 6 decimals so tiny aggregates don't round
   * to "$0", larger totals use 2). Lifted into the hook so dashboard
   * cards re-render when the active currency changes — a plain non-React
   * helper would not subscribe to the store.
   */
  const formatDashboardTotal = useCallback(
    (value: number | null | undefined): string => {
      const v =
        value !== null && value !== undefined && Number.isFinite(value)
          ? value
          : 0;
      return v < 5
        ? format(v, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
        : format(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    [format],
  );

  return {
    activeCurrency,
    activeRate,
    isConverted,
    symbol,
    format,
    formatUsd,
    describe,
    formatDashboardTotal,
  };
}
