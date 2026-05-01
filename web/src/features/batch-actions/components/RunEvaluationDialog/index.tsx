import { useMemo, useState } from "react";
import {
  type BatchActionQuery,
  type BatchEvalSourceTable,
  EvalTargetObject,
  BatchEvalSourceTable as SourceTable,
  getEvalTargetObjectFromSourceTable,
} from "@langfuse/shared";
import { api } from "@/src/utils/api";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { ChevronLeft } from "lucide-react";
import { EvaluatorSelectionStep } from "./EvaluatorSelectionStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { CreateEvaluatorDialog } from "./CreateEvaluatorDialog";
import { buildQueryWithSelectedIds } from "./utils";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { useI18n } from "@/src/features/i18n";

type RunEvaluationDialogProps = {
  projectId: string;
  selectedObservationIds: string[];
  query: BatchActionQuery;
  selectAll: boolean;
  totalCount: number;
  onClose: () => void;
  experimentCount?: number;
  exampleObservation?: {
    id: string;
    traceId: string;
    startTime?: Date;
  };
  sourceTable?: BatchEvalSourceTable;
};

type DialogStep = "select-evaluator" | "confirm";

export function RunEvaluationDialog(props: RunEvaluationDialogProps) {
  const { t } = useI18n();
  const { isBetaEnabled } = useV4Beta();
  const {
    projectId,
    selectedObservationIds,
    query,
    selectAll,
    totalCount,
    sourceTable = SourceTable.EVENTS,
  } = props;

  const [step, setStep] = useState<DialogStep>("select-evaluator");
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<string[]>(
    [],
  );
  const [evaluatorSearchQuery, setEvaluatorSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Derive targetObject from sourceTable
  const targetObject = getEvalTargetObjectFromSourceTable(sourceTable);

  const evaluatorsQuery = api.evals.jobConfigsByTarget.useQuery({
    projectId,
    targetObject,
  });

  const runEvaluationMutation =
    api.batchAction.runEvaluation.create.useMutation({
      onError: (error) => {
        showErrorToast(
          t("batchActions.evaluationScheduleFailed"),
          error.message,
        );
      },
    });

  const displayCount = selectAll ? totalCount : selectedObservationIds.length;
  // For experiments source, displayCount is experiment count, not item count
  const isExperimentsSource = sourceTable === SourceTable.EXPERIMENTS;
  const scopeLabel =
    sourceTable === SourceTable.EVENTS
      ? t("batchActions.scopeObservation")
      : t("batchActions.scopeExperimentItem");
  const evaluatorScopeLabel =
    targetObject === EvalTargetObject.EVENT
      ? t("batchActions.scopeObservation")
      : t("batchActions.scopeExperiment");
  const evaluatorScope =
    targetObject === EvalTargetObject.EVENT ? "observation" : "experiment";
  const experimentItemsExperimentCount =
    sourceTable === SourceTable.EXPERIMENT_ITEMS
      ? (props.experimentCount ?? 0)
      : 0;

  const previewObservationQuery = api.observations.byId.useQuery(
    {
      projectId,
      observationId: props.exampleObservation?.id as string,
      traceId: props.exampleObservation?.traceId as string,
      startTime: props.exampleObservation?.startTime ?? null,
    },
    {
      enabled:
        !isBetaEnabled &&
        Boolean(
          props.exampleObservation?.id && props.exampleObservation?.traceId,
        ),
    },
  );

  const previewEventQuery = api.events.batchIO.useQuery(
    {
      projectId,
      observations: [
        {
          id: props.exampleObservation?.id as string,
          traceId: props.exampleObservation?.traceId as string,
        },
      ],
      minStartTime: props.exampleObservation?.startTime as Date,
      maxStartTime: props.exampleObservation?.startTime as Date,
      truncated: false,
    },
    {
      enabled:
        isBetaEnabled &&
        Boolean(
          props.exampleObservation?.id &&
          props.exampleObservation?.traceId &&
          props.exampleObservation?.startTime,
        ),
    },
  );

  const eligibleEvaluators = useMemo(() => {
    return (evaluatorsQuery.data ?? []).filter(
      (evaluator) => evaluator.targetObject === targetObject,
    );
  }, [evaluatorsQuery.data, targetObject]);

  const selectedEvaluators = useMemo(
    () =>
      eligibleEvaluators.filter((evaluator) =>
        selectedEvaluatorIds.includes(evaluator.id),
      ),
    [eligibleEvaluators, selectedEvaluatorIds],
  );

  const toggleEvaluatorSelection = (evaluatorId: string) => {
    setSelectedEvaluatorIds((previous) =>
      previous.includes(evaluatorId)
        ? previous.filter((id) => id !== evaluatorId)
        : [...previous, evaluatorId],
    );
  };

  const onSubmit = async () => {
    if (selectedEvaluators.length === 0) {
      return;
    }

    const finalQuery = buildQueryWithSelectedIds({
      query,
      selectAll,
      selectedObservationIds,
    });

    try {
      await runEvaluationMutation.mutateAsync({
        projectId,
        query: finalQuery,
        evaluatorIds: selectedEvaluators.map((evaluator) => evaluator.id),
        sourceTable,
      });
    } catch {
      return;
    }

    showSuccessToast({
      title: t("batchActions.evaluationQueued"),
      description: isExperimentsSource
        ? t("batchActions.evaluationQueuedExperiments", {
            count: displayCount,
            evaluatorCount: selectedEvaluators.length,
          })
        : sourceTable === SourceTable.EXPERIMENT_ITEMS
          ? t("batchActions.evaluationQueuedExperimentItems", {
              itemCount: displayCount,
              experimentCount: experimentItemsExperimentCount,
              evaluatorCount: selectedEvaluators.length,
            })
          : t("batchActions.evaluationQueuedSelected", {
              count: displayCount,
              scope: scopeLabel,
              evaluatorCount: selectedEvaluators.length,
            }),
      link: {
        href: `/project/${projectId}/settings/batch-actions`,
        text: t("batchActions.viewBatchActions"),
      },
    });

    props.onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && props.onClose()}>
        <DialogContent className="flex max-h-[62vh] min-h-[38vh] max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>
              {isExperimentsSource
                ? t("batchActions.evaluateExperimentItemsFromRuns", {
                    count: displayCount,
                  })
                : sourceTable === SourceTable.EXPERIMENT_ITEMS
                  ? t("batchActions.evaluateExperimentItemsAcrossRuns", {
                      itemCount: displayCount,
                      experimentCount: experimentItemsExperimentCount,
                    })
                  : t("batchActions.evaluateSelected", {
                      count: displayCount,
                      scope: scopeLabel,
                    })}
            </DialogTitle>
            <DialogDescription>
              {step === "confirm"
                ? t("batchActions.reviewEvaluationBeforeRunning")
                : t("batchActions.selectScopedEvaluators", {
                    scope: evaluatorScopeLabel,
                  })}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex-1 overflow-hidden">
            {step === "select-evaluator" ? (
              <EvaluatorSelectionStep
                eligibleEvaluators={eligibleEvaluators}
                selectedEvaluators={selectedEvaluators}
                isQueryLoading={evaluatorsQuery.isLoading}
                isQueryError={evaluatorsQuery.isError}
                queryErrorMessage={evaluatorsQuery.error?.message}
                previewObservation={
                  isBetaEnabled
                    ? previewEventQuery.data?.[0]
                    : previewObservationQuery.data
                }
                isPreviewLoading={
                  previewObservationQuery.isLoading ||
                  previewEventQuery.isLoading
                }
                evaluatorScopeLabel={evaluatorScope}
                selectedEvaluatorIds={selectedEvaluatorIds}
                evaluatorSearchQuery={evaluatorSearchQuery}
                onSearchQueryChange={setEvaluatorSearchQuery}
                onToggleEvaluator={toggleEvaluatorSelection}
                onCreateEvaluator={() => setShowCreateDialog(true)}
              />
            ) : (
              <ConfirmationStep
                projectId={projectId}
                displayCount={displayCount}
                evaluators={selectedEvaluators.map((e) => ({
                  id: e.id,
                  name: e.scoreName,
                }))}
                hideCount={targetObject === EvalTargetObject.EXPERIMENT}
                sourceTable={sourceTable}
                experimentCount={experimentItemsExperimentCount}
              />
            )}
          </DialogBody>

          <DialogFooter className="flex justify-between">
            {step === "confirm" ? (
              <Button
                variant="ghost"
                onClick={() => setStep("select-evaluator")}
                disabled={runEvaluationMutation.isPending}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("common.previous")}
              </Button>
            ) : (
              <div />
            )}

            {step === "select-evaluator" ? (
              <Button
                onClick={() => setStep("confirm")}
                disabled={selectedEvaluators.length === 0}
              >
                {t("batchActions.continue")}
                {selectedEvaluators.length > 0
                  ? ` ${t("batchActions.withEvaluators", {
                      count: selectedEvaluators.length,
                    })}`
                  : null}
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                loading={runEvaluationMutation.isPending}
              >
                {t("batchActions.runEvaluation")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEvaluatorDialog
        projectId={projectId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        targetObject={targetObject}
      />
    </>
  );
}
