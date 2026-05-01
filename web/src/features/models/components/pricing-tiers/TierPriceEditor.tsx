import { MinusCircle, PlusCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { FormLabel } from "@/src/components/ui/form";
import { PricePreview } from "../PricePreview";
import type { UseFormReturn } from "react-hook-form";
import type { FormUpsertModel } from "../../validation";
import { useI18n } from "@/src/features/i18n";

type TierPriceEditorProps = {
  tierIndex: number;
  form: UseFormReturn<FormUpsertModel>;
  isDefault: boolean;
};

export type { TierPriceEditorProps };

export function TierPriceEditor({
  tierIndex,
  form,
  isDefault,
}: TierPriceEditorProps) {
  const { t } = useI18n();
  const prices = form.watch(`pricingTiers.${tierIndex}.prices`) || {};

  return (
    <div className="space-y-3">
      <FormLabel>{t("models.tiers.prices")}</FormLabel>
      <div className="text-muted-foreground grid grid-cols-2 gap-1 text-sm">
        <span>{t("models.tiers.usageType")}</span>
        <span>{t("models.price.price")}</span>
      </div>
      {Object.entries(prices).map(([key, value], index) => (
        <div key={index} className="grid grid-cols-2 gap-1">
          <Input
            placeholder={t("models.price.keyPlaceholder")}
            value={key}
            disabled={!isDefault}
            onChange={(e) => {
              const newKey = e.target.value;

              // Prevent overwriting existing keys (unless it's the same key)
              if (newKey !== key && prices[newKey] !== undefined) {
                return; // Don't allow the change
              }

              const newPrices = { ...prices };
              const oldValue = newPrices[key];
              delete newPrices[key];
              newPrices[newKey] = oldValue;
              form.setValue(`pricingTiers.${tierIndex}.prices`, newPrices);
            }}
            className={!isDefault ? "bg-muted cursor-not-allowed" : ""}
          />
          <div className="flex gap-1">
            <Input
              type="number"
              placeholder={t("models.price.pricePerUnit")}
              value={value as number}
              step="0.000001"
              onChange={(e) => {
                form.setValue(`pricingTiers.${tierIndex}.prices`, {
                  ...prices,
                  [key]: parseFloat(e.target.value),
                });
              }}
            />
            {isDefault && (
              <Button
                type="button"
                variant="outline"
                title={t("models.price.removePrice")}
                size="icon"
                onClick={() => {
                  const newPrices = { ...prices };
                  delete newPrices[key];
                  form.setValue(`pricingTiers.${tierIndex}.prices`, newPrices);
                }}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      {isDefault && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            // Generate unique key name
            let counter = 1;
            let newKey = "new_usage_type";
            while (prices[newKey] !== undefined) {
              newKey = `new_usage_type_${counter}`;
              counter++;
            }
            form.setValue(`pricingTiers.${tierIndex}.prices`, {
              ...prices,
              [newKey]: 0.000001,
            });
          }}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t("models.price.addPrice")}</span>
        </Button>
      )}
      <PricePreview prices={prices} />
    </div>
  );
}
