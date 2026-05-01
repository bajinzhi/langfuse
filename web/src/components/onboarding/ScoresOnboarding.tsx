import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { ThumbsUp, Star, LineChart, Code } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

export function ScoresOnboarding() {
  const { t } = useI18n();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("onboarding.scores.collectFeedback"),
      description: t("onboarding.scores.collectFeedbackDescription"),
      icon: <ThumbsUp className="h-4 w-4" />,
    },
    {
      title: t("onboarding.scores.modelEvaluations"),
      description: t("onboarding.scores.modelEvaluationsDescription"),
      icon: <Star className="h-4 w-4" />,
    },
    {
      title: t("onboarding.scores.trackMetrics"),
      description: t("onboarding.scores.trackMetricsDescription"),
      icon: <LineChart className="h-4 w-4" />,
    },
    {
      title: t("onboarding.scores.customMetrics"),
      description: t("onboarding.scores.customMetricsDescription"),
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("onboarding.scores.title")}
      description={t("onboarding.scores.description")}
      valuePropositions={valuePropositions}
      secondaryAction={{
        label: t("onboarding.learnMore"),
        href: "https://langfuse.com/docs/evaluation/evaluation-methods/custom-scores",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/scores-overview-v1.mp4"
    />
  );
}
