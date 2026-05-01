import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Bot, Gauge, Zap, BarChart4 } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

interface EvaluatorsOnboardingProps {
  projectId: string;
}

export function EvaluatorsOnboarding({ projectId }: EvaluatorsOnboardingProps) {
  const { t } = useI18n();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("onboarding.evaluators.automate"),
      description: t("onboarding.evaluators.automateDescription"),
      icon: <Bot className="h-4 w-4" />,
    },
    {
      title: t("onboarding.evaluators.measureQuality"),
      description: t("onboarding.evaluators.measureQualityDescription"),
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      title: t("onboarding.evaluators.scale"),
      description: t("onboarding.evaluators.scaleDescription"),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t("onboarding.evaluators.trackPerformance"),
      description: t("onboarding.evaluators.trackPerformanceDescription"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("onboarding.evaluators.title")}
      description={t("onboarding.evaluators.description")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("onboarding.evaluators.createEvaluator"),
        href: `/project/${projectId}/evals/new`,
      }}
      secondaryAction={{
        label: t("onboarding.learnMore"),
        href: "https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/scores-llm-as-a-judge-overview-v1.mp4"
    />
  );
}
