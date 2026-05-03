import { LocalIsoDate } from "@/src/components/LocalIsoDate";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { ExperimentComparisonSelector } from "./ExperimentComparisonSelector";
import { ExperimentBaselineControls } from "./ExperimentBaselineControls";
import { useI18n } from "@/src/features/i18n";
import { api } from "@/src/utils/api";
import { PromptfooReportButtons } from "@/src/features/promptfoo/components/PromptfooReportButtons";
import {
  PROMPTFOO_REPORT_METADATA_REFETCH_INTERVAL_MS,
  shouldPollPromptfooReportMetadata,
} from "@/src/features/promptfoo/utils/reportMetadataPolling";

type ExperimentOverviewPanelProps = {
  projectId: string;
  hasBaseline: boolean;
  experiment?: {
    id: string;
    name: string;
    description: string | null;
    datasetId: string;
    datasetName?: string;
    prompts: Array<[string, number | null]>; // [prompt_name, prompt_version]
    metadata: Record<string, string>;
    startTime: Date;
  };
  // Comparison selector props
  comparisonIds: string[];
  onComparisonIdsChange: (ids: string[]) => void;
  // Baseline controls props
  onBaselineChange: (id: string) => void;
  onBaselineClear: () => void;
};

export function ExperimentOverviewPanel({
  projectId,
  hasBaseline,
  experiment,
  comparisonIds,
  onComparisonIdsChange,
  onBaselineChange,
  onBaselineClear,
}: ExperimentOverviewPanelProps) {
  const { t } = useI18n();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const provider = experiment?.metadata?.provider;
  const model = experiment?.metadata?.model;
  const isPromptfooExperiment =
    experiment?.metadata?.execution_mode === "promptfoo" ||
    Boolean(experiment?.metadata?.promptfoo_matrix_run_id);
  const promptfooReport = api.promptfoo.reportMetadata.useQuery(
    {
      projectId,
      datasetRunId: experiment?.id ?? "",
    },
    {
      enabled: Boolean(experiment?.id && isPromptfooExperiment),
      refetchInterval: (query) => {
        const metadata = query.state.data;
        return metadata && shouldPollPromptfooReportMetadata(metadata.status)
          ? PROMPTFOO_REPORT_METADATA_REFETCH_INTERVAL_MS
          : false;
      },
    },
  );
  // Get the first prompt name and version from the prompts array
  const [promptName, promptVersion] =
    experiment && experiment.prompts.length > 0
      ? experiment.prompts[0]
      : [null, null];

  // Check if description is long (more than 150 chars)
  const isLongDescription =
    experiment?.description && experiment.description.length > 150;
  const shouldTruncate = isLongDescription && !isDescriptionExpanded;
  const displayDescription = shouldTruncate
    ? experiment?.description?.slice(0, 150) + "..."
    : experiment?.description;

  return (
    <div className="space-y-4">
      {hasBaseline && experiment ? (
        <>
          <h3 className="text-lg font-semibold">
            {t("experiments.overview.details")}
          </h3>

          <div className="space-y-3 text-sm">
            {/* Name */}
            <div>
              <div className="text-muted-foreground text-xs">
                {t("experiments.overview.name")}
              </div>
              <div className="font-medium">{experiment.name}</div>
            </div>

            {/* Description */}
            {experiment.description && (
              <div>
                <div className="text-muted-foreground text-xs">
                  {t("experiments.overview.description")}
                </div>
                <div className="break-words">{displayDescription}</div>
                {isLongDescription && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                  >
                    {isDescriptionExpanded
                      ? t("dashboard.seeLess")
                      : t("dashboard.seeMore")}
                  </Button>
                )}
              </div>
            )}

            {/* Dataset */}
            <div>
              <div className="text-muted-foreground text-xs">
                {t("experiments.steps.dataset")}
              </div>
              <Link
                href={`/project/${projectId}/datasets/${encodeURIComponent(experiment.datasetId)}`}
                className="text-primary hover:underline"
              >
                {experiment.datasetName || experiment.datasetId}
              </Link>
            </div>

            {/* Prompt */}
            {promptName && (
              <div>
                <div className="text-muted-foreground text-xs">
                  {t("prompts.prompt")}
                </div>
                <Link
                  href={`/project/${projectId}/prompts/${encodeURIComponent(promptName)}${promptVersion !== null ? `?version=${promptVersion}` : ""}`}
                  className="text-primary hover:underline"
                >
                  {promptName}
                  {promptVersion !== null && (
                    <span className="text-muted-foreground ml-1">
                      (v{promptVersion})
                    </span>
                  )}
                </Link>
              </div>
            )}

            {/* Model Configuration */}
            {(provider || model) && (
              <div>
                <div className="text-muted-foreground text-xs">
                  {t("experiments.promptModel.model")}
                </div>
                <div>
                  {provider && model
                    ? `${provider}/${model}`
                    : provider || model}
                </div>
              </div>
            )}

            {/* Start Time */}
            <div>
              <div className="text-muted-foreground text-xs">
                {t("experiments.overview.startTime")}
              </div>
              <LocalIsoDate date={experiment.startTime} />
            </div>

            {/* Promptfoo report */}
            {isPromptfooExperiment && (
              <div>
                <div className="text-muted-foreground text-xs">
                  {t("promptfoo.report.title")}
                </div>
                {promptfooReport.data?.reportHtmlObjectKey ||
                promptfooReport.data?.reportObjectKey ? (
                  <div className="mt-1">
                    <PromptfooReportButtons
                      projectId={projectId}
                      datasetRunId={experiment.id}
                    />
                  </div>
                ) : promptfooReport.data?.status === "FAILED" ? (
                  <div className="text-destructive text-xs">
                    {t("promptfoo.report.failed", {
                      error:
                        promptfooReport.data.error ??
                        t("promptfoo.report.unknownError"),
                    })}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">
                    {promptfooReport.isLoading
                      ? t("promptfoo.report.loading")
                      : t("promptfoo.report.pending", {
                          status: promptfooReport.data?.status ?? "PENDING",
                        })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Baseline Controls */}
      <div className={hasBaseline ? "border-t pt-4" : undefined}>
        <h4 className="mb-2 text-sm font-medium">
          {t("experiments.overview.baseline")}
        </h4>
        <ExperimentBaselineControls
          projectId={projectId}
          baselineId={experiment?.id}
          baselineName={experiment?.name}
          onBaselineChange={onBaselineChange}
          onBaselineClear={onBaselineClear}
          canClearBaseline={comparisonIds.length > 0}
        />
      </div>

      {/* Comparison Selector */}
      <div className="border-t pt-4">
        <h4 className="mb-2 text-sm font-medium">
          {t("experiments.overview.compareWith")}
        </h4>
        <ExperimentComparisonSelector
          projectId={projectId}
          baselineExperimentId={experiment?.id}
          selectedIds={comparisonIds}
          onSelectedIdsChange={onComparisonIdsChange}
        />
      </div>
    </div>
  );
}
