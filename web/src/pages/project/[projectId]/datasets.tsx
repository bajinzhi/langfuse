import { useRouter } from "next/router";
import { DatasetsTable } from "@/src/features/datasets/components/DatasetsTable";
import Page from "@/src/components/layouts/page";
import { DatasetActionButton } from "@/src/features/datasets/components/DatasetActionButton";
import { api } from "@/src/utils/api";
import { DatasetsOnboarding } from "@/src/components/onboarding/DatasetsOnboarding";
import { useQueryParam, StringParam } from "use-query-params";
import { useExperimentAccess } from "@/src/features/experiments/hooks/useExperimentAccess";
import { ExperimentsBetaSwitch } from "@/src/features/experiments/components/ExperimentsBetaSwitch";
import { useI18n } from "@/src/features/i18n";

export default function Datasets() {
  const { t } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [currentFolderPath] = useQueryParam("folder", StringParam);

  // Check if the project has any datasets
  const { data: hasAnyDataset, isLoading } = api.datasets.hasAny.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const {
    canUseExperimentsBetaToggle,
    isExperimentsBetaEnabled,
    setExperimentsBetaEnabled,
  } = useExperimentAccess();

  const showOnboarding = !isLoading && !hasAnyDataset;

  if (showOnboarding) {
    return (
      <Page
        headerProps={{
          title: t("datasets.label"),
          help: {
            description: t("datasets.helpDescription"),
            href: "https://langfuse.com/docs/evaluation/dataset-runs/datasets",
          },
        }}
        scrollable
      >
        <DatasetsOnboarding projectId={projectId} />
      </Page>
    );
  }

  return (
    <Page
      headerProps={{
        title: t("datasets.label"),
        help: {
          description: t("datasets.helpDescription"),
          href: "https://langfuse.com/docs/evaluation/dataset-runs/datasets",
        },
        actionButtonsLeft: canUseExperimentsBetaToggle ? (
          <ExperimentsBetaSwitch
            enabled={isExperimentsBetaEnabled}
            onEnabledChange={setExperimentsBetaEnabled}
          />
        ) : undefined,
        actionButtonsRight: (
          <DatasetActionButton
            projectId={projectId}
            mode="create"
            folderPrefix={currentFolderPath || undefined}
          />
        ),
      }}
    >
      <DatasetsTable projectId={projectId} />
    </Page>
  );
}
