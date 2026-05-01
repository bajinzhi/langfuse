import { useState } from "react";
import {
  EvalTargetObject,
  type EvalTargetObject as EvalTargetObjectType,
} from "@langfuse/shared";
import { api } from "@/src/utils/api";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { EvaluatorSelector } from "@/src/features/evals/components/evaluator-selector";
import { EvaluatorForm } from "@/src/features/evals/components/evaluator-form";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

type CreateEvaluatorDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetObject?: EvalTargetObjectType;
};

export function CreateEvaluatorDialog(props: CreateEvaluatorDialogProps) {
  const { t } = useI18n();
  const {
    projectId,
    open,
    onOpenChange,
    targetObject = EvalTargetObject.EVENT,
  } = props;
  const [templateId, setTemplateId] = useState<string | null>(null);
  const utils = api.useUtils();
  const targetLabel =
    targetObject === EvalTargetObject.EVENT
      ? t("batchActions.scopeObservation")
      : t("batchActions.scopeExperiment");

  const templatesQuery = api.evals.allTemplates.useQuery(
    {
      projectId,
      limit: 500,
      page: 0,
    },
    {
      enabled: open,
    },
  );

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setTemplateId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-(--breakpoint-md) pb-0">
        <DialogHeader>
          <DialogTitle>
            {t("batchActions.createEvaluatorForBatchedRuns", {
              target: targetLabel,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("batchActions.createEvaluatorForBatchedRunsDescription", {
              target: targetLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[72vh] overflow-y-auto pr-1 pb-0">
          {!templateId ? (
            <div className="space-y-4 px-1 pb-1">
              <p className="text-muted-foreground text-sm">
                {t("batchActions.selectEvaluatorTemplate")}
              </p>
              {templatesQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">
                  {t("batchActions.loadingTemplates")}
                </p>
              ) : templatesQuery.isError ? (
                <p className="text-destructive text-sm">
                  {t("batchActions.failedToLoadTemplates", {
                    message: templatesQuery.error.message,
                  })}
                </p>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto rounded-md border p-2">
                  <EvaluatorSelector
                    projectId={projectId}
                    evalTemplates={templatesQuery.data?.templates ?? []}
                    selectedTemplateId={undefined}
                    onTemplateSelect={(id) => setTemplateId(id)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="pb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemplateId(null)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("batchActions.backToTemplateSelection")}
              </Button>
              <EvaluatorForm
                useDialog
                projectId={projectId}
                evalTemplates={templatesQuery.data?.templates ?? []}
                templateId={templateId}
                hideTargetSelection
                hidePreviewTable
                defaultRunOnLive={false}
                defaultTarget={targetObject}
                onFormSuccess={() => {
                  handleClose(false);
                  void utils.evals.jobConfigsByTarget.invalidate({
                    projectId,
                    targetObject,
                  });
                  showSuccessToast({
                    title: t("batchActions.evaluatorCreated"),
                    description: t("batchActions.evaluatorCreatedDescription"),
                  });
                }}
                preprocessFormValues={(values) => ({
                  ...values,
                  target: targetObject,
                  timeScope: ["NEW"],
                  ...(values.runOnLive
                    ? {}
                    : {
                        filter: [],
                        sampling: 1,
                        delay: 0,
                      }),
                })}
              />
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
