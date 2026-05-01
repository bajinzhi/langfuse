import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { useMemo } from "react";
import { usePriceUnitMultiplier } from "@/src/features/models/hooks/usePriceUnitMultiplier";
import Decimal from "decimal.js";
import { getMaxDecimals } from "@/src/features/models/utils";
import { useI18n } from "@/src/features/i18n";
import { getPriceUnitLabel } from "@/src/features/models/components/PriceUnitSelector";

type MatchedTierCardProps = {
  tier: {
    id: string;
    name: string;
    priority: number;
    isDefault: boolean;
    prices: Record<string, number>;
  };
};

export type { MatchedTierCardProps };

export function MatchedTierCard({ tier }: MatchedTierCardProps) {
  const { t } = useI18n();
  const { priceUnit, priceUnitMultiplier } = usePriceUnitMultiplier();

  const maxDecimals = useMemo(
    () =>
      Math.max(
        ...Object.values(tier.prices).map((price) =>
          getMaxDecimals(price, priceUnitMultiplier),
        ),
      ),
    [tier.prices, priceUnitMultiplier],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("models.test.matchedPricingTier")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{tier.name}</span>
          {tier.isDefault && (
            <Badge variant="secondary" className="text-xs">
              {t("models.tiers.default")}
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {t("models.tiers.priority", { priority: tier.priority })}
          </span>
        </div>

        <div>
          <div className="text-muted-foreground mb-2 text-xs font-medium">
            {t("models.test.pricesPerUnit", {
              unit: getPriceUnitLabel(priceUnit, t),
            })}
          </div>
          <div className="space-y-1.5">
            {Object.entries(tier.prices).map(([usageType, price]) => (
              <div
                key={usageType}
                className="bg-muted/50 flex items-center justify-between rounded px-3 py-1.5"
              >
                <span className="text-muted-foreground font-mono text-xs">
                  {usageType}:
                </span>
                <span className="font-mono text-sm font-semibold">
                  $
                  {new Decimal(price)
                    .mul(priceUnitMultiplier)
                    .toFixed(maxDecimals)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
