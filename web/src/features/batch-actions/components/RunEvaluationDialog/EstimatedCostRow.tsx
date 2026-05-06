import { InfoIcon } from "lucide-react";
import { api } from "@/src/utils/api";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { useI18n } from "@/src/features/i18n";
import { useCurrencyFormatter } from "@/src/features/currency/useCurrencyFormatter";

type EstimatedCostRowProps = {
  projectId: string;
  evaluators: Array<{ id: string; name: string }>;
  observationCount: number;
};

export function EstimatedCostRow(props: EstimatedCostRowProps) {
  const { projectId, evaluators, observationCount } = props;
  const { t } = useI18n();
  const { format: formatActiveCurrency, symbol: activeSymbol } =
    useCurrencyFormatter();

  /**
   * Tiny aggregates round to "0.00" with the standard 2-digit precision; we
   * surface a "< {symbol}0.01" hint instead so users don't think the cost is
   * literally zero. The threshold scales by the currency symbol so CNY shows
   * "< ¥0.01", USD shows "< $0.01".
   */
  const formatCostEstimate = (cost: number): string => {
    if (cost > 0 && cost < 0.005) return `< ${activeSymbol}0.01`;
    return `~${formatActiveCurrency(cost, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const evaluatorIds = evaluators.map((e) => e.id);

  const avgCostQuery = api.evals.avgCostByEvaluatorIds.useQuery(
    { projectId, evaluatorIds },
    { enabled: evaluators.length > 0 },
  );

  if (avgCostQuery.isLoading) {
    return (
      <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("batchActions.estLlmApiKeyCost")}
        </span>
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  const data = avgCostQuery.data;
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("batchActions.estLlmApiKeyCost")}
        </span>
        <span className="text-muted-foreground">
          {t("batchActions.noData")}
        </span>
      </div>
    );
  }

  const evaluatorsWithData = evaluatorIds.filter((id) => id in data);
  const evaluatorsWithoutData = evaluatorIds.filter((id) => !(id in data));
  const isPartial = evaluatorsWithoutData.length > 0;

  const totalEstimate = evaluatorsWithData.reduce(
    (sum, id) => sum + data[id].avgCost * observationCount,
    0,
  );

  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">
        {t("batchActions.estLlmApiKeyCost")}
      </span>
      <span className="flex items-center gap-1 font-medium">
        {formatCostEstimate(totalEstimate)}
        {isPartial ? "*" : ""}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-2 p-3">
              <p className="text-xs">
                {t("batchActions.costTooltip")}
              </p>
              <div className="space-y-1">
                {evaluators.map(({ id, name }) => {
                  const entry = data[id];
                  return (
                    <div
                      key={id}
                      className="flex justify-between gap-4 text-xs"
                    >
                      <span className="truncate">{name}</span>
                      <span className="shrink-0 tabular-nums">
                        {entry
                          ? formatCostEstimate(entry.avgCost * observationCount)
                          : t("batchActions.noData")}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isPartial ? (
                <p className="text-muted-foreground text-xs">
                  {t("batchActions.partialEstimate")}
                </p>
              ) : null}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </div>
  );
}
