import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { useCurrencyFormatter } from "@/src/features/currency/useCurrencyFormatter";
import { useI18n } from "@/src/features/i18n";
import { cn } from "@/src/utils/tailwind";
import {
  CURRENCY_DESCRIPTORS,
  type CostValue,
} from "@langfuse/shared";

/**
 * Render a USD value in the project's active display currency.
 *
 * - The visible label is always in the active currency (with the
 *   correct symbol — `¥` for CNY, `$` for USD — picked by
 *   Intl.NumberFormat).
 * - When the active currency differs from USD, hovering reveals a
 *   tooltip showing the original USD value and the conversion rate
 *   currently in use; this matches the original product spec ("don't
 *   label the conversion explicitly, but provide a hint on hover").
 * - For native USD display the trigger renders as a plain span so the
 *   tooltip overhead disappears entirely from the DOM.
 *
 * The component intentionally re-uses the application-wide
 * `<TooltipProvider>` mounted in `_app.tsx` instead of declaring a new
 * one here — wrapping every cost cell in its own provider was the
 * original implementation's main perf foot-gun.
 */
export interface CurrencyAmountProps {
  /** USD value as number / bigint / Decimal / null. Null is rendered as 0. */
  usdValue: CostValue;
  /**
   * Override the default precision. When omitted we fall back to the
   * descriptor defaults (2 / 6) which matches the existing `usdFormatter`
   * behaviour for cost cells.
   */
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Suppress the tooltip (e.g. inside a label that already has one). */
  hideTooltip?: boolean;
  className?: string;
  /** Used by tests / screen readers to identify cost cells generically. */
  "data-testid"?: string;
}

export function CurrencyAmount({
  usdValue,
  minimumFractionDigits,
  maximumFractionDigits,
  hideTooltip = false,
  className,
  ...rest
}: CurrencyAmountProps) {
  const { describe } = useCurrencyFormatter();
  const { t } = useI18n();
  const descriptor = describe(usdValue, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  // Tabular numerals keep cost columns visually aligned across rows even
  // when the integer width changes (`$0.02` vs `¥10.20`).
  const labelClass = cn("tabular-nums", className);

  if (!descriptor.isConverted || hideTooltip) {
    return (
      <span className={labelClass} data-testid={rest["data-testid"]}>
        {descriptor.formatted}
      </span>
    );
  }

  const targetSymbol = CURRENCY_DESCRIPTORS[descriptor.currency].symbol;
  const usdSymbol = CURRENCY_DESCRIPTORS.USD.symbol;
  const rateText = t("currency.rateLine", {
    base: usdSymbol,
    target: targetSymbol,
    // Strip noisy trailing zeros from the rate display.
    rate: descriptor.rate.toString(),
    targetCode: descriptor.currency,
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(labelClass, "cursor-help")}
          data-testid={rest["data-testid"]}
        >
          {descriptor.formatted}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5 text-xs leading-snug">
          <span>
            {t("currency.originalLine", { value: descriptor.usdFormatted })}
          </span>
          <span className="text-muted-foreground">{rateText}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
