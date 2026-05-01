import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { EstimatedCostRow } from "./EstimatedCostRow";
import { BatchEvalSourceTable } from "@langfuse/shared";
import { useI18n } from "@/src/features/i18n";

type ConfirmationStepProps = {
  projectId: string;
  displayCount: number;
  evaluators: Array<{ id: string; name: string }>;
  hideCount: boolean;
  sourceTable: BatchEvalSourceTable;
  experimentCount?: number;
};

/**
 * Determines whether to show a cost disclaimer instead of the actual cost estimate.
 * For experiments source, we can't accurately estimate cost because displayCount
 * is the experiment count, not the actual observation count.
 */
function shouldShowCostDisclaimer(sourceTable: BatchEvalSourceTable): boolean {
  return sourceTable === BatchEvalSourceTable.EXPERIMENTS;
}

/**
 * Calculates the effective observation count for cost estimation.
 * For experiment-items source, multiplies by experiment count since each item
 * is evaluated once per experiment.
 */
function getEffectiveObservationCount(
  displayCount: number,
  sourceTable: BatchEvalSourceTable,
  experimentCount?: number,
): number {
  if (
    sourceTable === BatchEvalSourceTable.EXPERIMENT_ITEMS &&
    experimentCount
  ) {
    return displayCount * experimentCount;
  }
  return displayCount;
}

export function ConfirmationStep(props: ConfirmationStepProps) {
  const { t } = useI18n();
  const {
    projectId,
    displayCount,
    evaluators,
    hideCount,
    sourceTable,
    experimentCount,
  } = props;

  const showCostDisclaimer = shouldShowCostDisclaimer(sourceTable);
  const effectiveObservationCount = getEffectiveObservationCount(
    displayCount,
    sourceTable,
    experimentCount,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          {!hideCount && (
            <div className="flex gap-2">
              <span className="text-muted-foreground">
                {t("batchActions.observations")}
              </span>
              <span className="font-medium">{displayCount}</span>
            </div>
          )}

          {evaluators.length > 0 && (
            <div className="flex gap-2">
              <span className="text-muted-foreground shrink-0">
                {t("batchActions.evaluators")}
              </span>
              <div className="flex flex-wrap gap-1">
                {evaluators.map((e) => (
                  <Badge key={e.id} variant="secondary" className="text-xs">
                    {e.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {showCostDisclaimer ? (
            <div className="flex gap-2">
              <span className="text-muted-foreground shrink-0">
                {t("batchActions.estLlmApiKeyCost")}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("batchActions.costEstimateUnavailable")}
              </span>
            </div>
          ) : (
            <EstimatedCostRow
              projectId={projectId}
              evaluators={evaluators}
              observationCount={effectiveObservationCount}
            />
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        {t("batchActions.evaluationsRunBackground")}
      </p>
    </div>
  );
}
