import { useRouter } from "next/router";
import { useEffect } from "react";
import Page from "@/src/components/layouts/page";
import { FlaskConical, Loader2 } from "lucide-react";
import { useExperimentAccess } from "@/src/features/experiments/hooks/useExperimentAccess";
import {
  EXPERIMENT_RUN_TABS,
  getExperimentRunTabs,
} from "@/src/features/navigation/utils/experiment-run-tabs";
import useSessionStorage from "@/src/components/useSessionStorage";
import { ExperimentsBetaSwitch } from "@/src/features/experiments/components/ExperimentsBetaSwitch";
import { useI18n } from "@/src/features/i18n";

export default function ExperimentAnalytics() {
  const { t } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;

  const {
    canAccessExperiments,
    canUseExperimentsBetaToggle,
    isExperimentsBetaActive,
    setExperimentsBetaEnabled,
  } = useExperimentAccess();

  const [lastResultsUrl] = useSessionStorage<string | null>(
    "experiment-results-url",
    null,
  );

  const handleResultsClick = () => {
    const fallbackUrl = `/project/${projectId}/experiments/results`;
    void router.push(lastResultsUrl ?? fallbackUrl);
  };

  const betaSwitch = canUseExperimentsBetaToggle ? (
    <ExperimentsBetaSwitch
      enabled={isExperimentsBetaActive}
      onEnabledChange={setExperimentsBetaEnabled}
    />
  ) : null;

  // Auto-redirect when beta is off
  useEffect(() => {
    if (canAccessExperiments && !isExperimentsBetaActive && lastResultsUrl) {
      void router.push(lastResultsUrl);
    }
  }, [canAccessExperiments, isExperimentsBetaActive, lastResultsUrl, router]);

  if (!canAccessExperiments) {
    return (
      <Page headerProps={{ title: t("experiments.analytics") }}>
        <div className="p-4">{t("experiments.pagesComingSoon")}</div>
      </Page>
    );
  }

  if (!isExperimentsBetaActive) {
    return (
      <Page headerProps={{ title: t("experiments.analytics") }}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      headerProps={{
        title: t("experiments.analytics"),
        itemType: "EXPERIMENT",
        breadcrumb: [
          {
            name: t("experiments.title"),
            href: `/project/${projectId}/experiments`,
          },
        ],
        tabsProps: {
          tabs: getExperimentRunTabs(projectId, t, handleResultsClick),
          activeTab: EXPERIMENT_RUN_TABS.ANALYTICS,
        },
        actionButtonsLeft: betaSwitch,
      }}
    >
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="border-border bg-card/50 flex max-w-md flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-sm backdrop-blur-sm">
          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <FlaskConical className="text-muted-foreground h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">
              {t("experiments.analyticsComingSoon")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("experiments.analyticsComingSoonDescription")}
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
