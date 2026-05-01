import { Database, Plus } from "lucide-react";
import type { DatasetChoiceStepProps } from "./types";
import { useI18n } from "@/src/features/i18n";

export function DatasetChoiceStep(props: DatasetChoiceStepProps) {
  const { t } = useI18n();
  const { onSelectMode } = props;

  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {/* Existing Dataset Card */}
      <button
        type="button"
        onClick={() => onSelectMode("select")}
        className="hover:border-tertiary hover:bg-accent flex flex-col items-center rounded-lg border-2 p-8 text-center transition-all"
      >
        <div className="bg-primary/10 mb-4 rounded-full p-4">
          <Database className="text-primary h-8 w-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {t("batchActions.existingDataset")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("batchActions.addToExistingDatasetDescription")}
        </p>
      </button>

      {/* New Dataset Card */}
      <button
        type="button"
        onClick={() => onSelectMode("create")}
        className="hover:border-tertiary hover:bg-accent flex flex-col items-center rounded-lg border-2 p-8 text-center transition-all"
      >
        <div className="bg-primary/10 mb-4 rounded-full p-4">
          <Plus className="text-primary h-8 w-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {t("datasets.newDataset")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("batchActions.createDatasetForObservations")}
        </p>
      </button>
    </div>
  );
}
