import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Database, Beaker, Zap, Code } from "lucide-react";
import { DatasetActionButton } from "@/src/features/datasets/components/DatasetActionButton";
import { useI18n } from "@/src/features/i18n";

export function DatasetsOnboarding({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("onboarding.datasets.continuousImprovement"),
      description: t("onboarding.datasets.continuousImprovementDescription"),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t("onboarding.datasets.preDeploymentTesting"),
      description: t("onboarding.datasets.preDeploymentTestingDescription"),
      icon: <Beaker className="h-4 w-4" />,
    },
    {
      title: t("onboarding.datasets.structuredTesting"),
      description: t("onboarding.datasets.structuredTestingDescription"),
      icon: <Database className="h-4 w-4" />,
    },
    {
      title: t("onboarding.datasets.customWorkflows"),
      description: t("onboarding.datasets.customWorkflowsDescription"),
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("onboarding.datasets.title")}
      description={t("onboarding.datasets.description")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("onboarding.datasets.createDataset"),
        component: (
          <DatasetActionButton
            variant="default"
            mode="create"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: t("onboarding.learnMore"),
        href: "https://langfuse.com/docs/datasets",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/datasets-overview-v1.mp4"
    />
  );
}
