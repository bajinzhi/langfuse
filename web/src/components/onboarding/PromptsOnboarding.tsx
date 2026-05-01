import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { FileText, GitBranch, Zap, BarChart4 } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

export function PromptsOnboarding({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("prompts.onboarding.decoupled.title"),
      description: t("prompts.onboarding.decoupled.description"),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: t("prompts.onboarding.edit.title"),
      description: t("prompts.onboarding.edit.description"),
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      title: t("prompts.onboarding.performance.title"),
      description: t("prompts.onboarding.performance.description"),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t("prompts.onboarding.compareMetrics.title"),
      description: t("prompts.onboarding.compareMetrics.description"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("prompts.onboarding.title")}
      description={t("prompts.onboarding.description")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("prompts.onboarding.createPrompt"),
        href: `/project/${projectId}/prompts/new`,
      }}
      secondaryAction={{
        label: t("prompts.onboarding.learnMore"),
        href: "https://langfuse.com/docs/prompt-management/get-started",
      }}
    />
  );
}
