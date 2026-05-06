import { useEffect, useMemo, useState } from "react";
import Header from "@/src/components/layouts/header";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/src/components/ui/radio-group";
import {
  CURRENCY_DESCRIPTORS,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  normalizeRate,
  type SupportedCurrency,
} from "@langfuse/shared";
import { useProjectCurrency } from "@/src/features/currency/useProjectCurrency";
import { useI18n } from "@/src/features/i18n";
import { cn } from "@/src/utils/tailwind";

/**
 * Project-scoped UI for choosing the display currency and overriding the
 * conversion rate. State is kept local until "Save" so partial edits don't
 * cause the rest of the app to re-render with intermediate values.
 *
 * Validation rules:
 *  - Rate must be a finite positive number; we let users type freely
 *    (so they can clear the input) and validate on submit.
 *  - USD is the base currency: when selected, the rate input is disabled
 *    and pinned to 1.
 */
export function CurrencySetting() {
  const { t } = useI18n();
  const {
    activeCurrency,
    rateFor,
    setPreference,
    resetToDefault,
  } = useProjectCurrency();

  const [draftCurrency, setDraftCurrency] =
    useState<SupportedCurrency>(activeCurrency);
  const [rateInputs, setRateInputs] = useState<
    Partial<Record<SupportedCurrency, string>>
  >(() =>
    SUPPORTED_CURRENCIES.reduce<Partial<Record<SupportedCurrency, string>>>(
      (acc, code) => {
        if (code === "USD") return acc;
        acc[code] = String(rateFor(code));
        return acc;
      },
      {},
    ),
  );
  const [error, setError] = useState<string | null>(null);

  // When the global preference changes (e.g. from another tab), reset
  // local edits so the UI never silently keeps a stale draft.
  useEffect(() => {
    setDraftCurrency(activeCurrency);
    setRateInputs((prev) => ({
      ...prev,
      ...SUPPORTED_CURRENCIES.reduce<Partial<Record<SupportedCurrency, string>>>(
        (acc, code) => {
          if (code === "USD") return acc;
          acc[code] = String(rateFor(code));
          return acc;
        },
        {},
      ),
    }));
  }, [activeCurrency, rateFor]);

  const draftDescriptor = CURRENCY_DESCRIPTORS[draftCurrency];
  const isUsd = draftCurrency === "USD";
  const draftRateInput = isUsd ? "1" : (rateInputs[draftCurrency] ?? "");

  const previewText = useMemo(() => {
    if (isUsd) return t("currency.previewUsd");
    return t("currency.previewLine", {
      base: CURRENCY_DESCRIPTORS.USD.symbol,
      rate: draftRateInput,
      target: draftDescriptor.symbol,
      targetCode: draftCurrency,
    });
  }, [draftCurrency, draftDescriptor.symbol, draftRateInput, isUsd, t]);

  function handleSave() {
    const nextRates: Partial<Record<SupportedCurrency, number>> = {};
    for (const code of SUPPORTED_CURRENCIES) {
      if (code === "USD") continue;
      const raw = rateInputs[code];
      const parsed = raw !== undefined && raw !== "" ? Number(raw) : NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) {
        if (code === draftCurrency) {
          setError(t("currency.errorInvalidRate"));
          return;
        }
        // Skip invalid non-active rates rather than blocking the save.
        continue;
      }
      nextRates[code] = normalizeRate(code, parsed);
    }

    setError(null);
    setPreference({
      activeCurrency: draftCurrency,
      rates: nextRates,
    });
  }

  function handleReset() {
    resetToDefault();
    setError(null);
  }

  return (
    <div>
      <Header title={t("currency.settingsTitle")} />
      <Card className="mb-4 p-3">
        <p className="text-foreground mb-4 text-sm">
          {t("currency.settingsDescription")}
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              {t("currency.displayCurrency")}
            </Label>
            <RadioGroup
              value={draftCurrency}
              onValueChange={(v) => {
                if (isSupportedCurrency(v)) setDraftCurrency(v);
              }}
              className="mt-2 flex flex-row flex-wrap gap-4"
            >
              {SUPPORTED_CURRENCIES.map((code) => {
                const descriptor = CURRENCY_DESCRIPTORS[code];
                const id = `currency-option-${code}`;
                return (
                  <div key={code} className="flex items-center gap-2">
                    <RadioGroupItem value={code} id={id} />
                    <Label htmlFor={id} className="cursor-pointer text-sm">
                      {t(`currency.label.${code}` as const)}
                      <span className="text-muted-foreground ml-1">
                        ({descriptor.symbol})
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="currency-rate" className="text-sm font-medium">
              {t("currency.rateLabel", {
                target: draftDescriptor.symbol,
                targetCode: draftCurrency,
              })}
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                1 {CURRENCY_DESCRIPTORS.USD.symbol} =
              </span>
              <Input
                id="currency-rate"
                type="number"
                step="0.0001"
                min="0"
                inputMode="decimal"
                disabled={isUsd}
                value={draftRateInput}
                onChange={(e) => {
                  if (isUsd) return;
                  setRateInputs((prev) => ({
                    ...prev,
                    [draftCurrency]: e.target.value,
                  }));
                  setError(null);
                }}
                className="w-32"
              />
              <span className="text-muted-foreground text-sm">
                {draftDescriptor.symbol} ({draftCurrency})
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-xs",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {error ?? previewText}
            </p>
          </div>

          <div className="flex flex-row gap-2 pt-2">
            <Button variant="secondary" onClick={handleSave}>
              {t("common.save")}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              {t("currency.resetButton")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
