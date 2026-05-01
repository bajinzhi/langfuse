import { DatasetForm } from "@/src/features/datasets/components/DatasetForm";
import type { DatasetCreateStepProps } from "./types";
import { useI18n } from "@/src/features/i18n";

export function DatasetCreateStep(props: DatasetCreateStepProps) {
  const { t } = useI18n();
  const { projectId, formRef, onDatasetCreated, onValidationChange } = props;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-medium">
          {t("batchActions.createNewDataset")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("batchActions.createDatasetDescription")}
        </p>
      </div>

      <DatasetForm
        ref={formRef}
        projectId={projectId}
        mode="create"
        redirectOnSuccess={false}
        showFooter={false}
        onCreateDatasetSuccess={onDatasetCreated}
        onValidationChange={onValidationChange}
      />
    </div>
  );
}
