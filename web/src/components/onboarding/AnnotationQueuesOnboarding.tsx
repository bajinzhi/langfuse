import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { ClipboardCheck, Users, BarChart4, GitMerge } from "lucide-react";
import { CreateOrEditAnnotationQueueButton } from "@/src/features/annotation-queues/components/CreateOrEditAnnotationQueueButton";
import { useI18n } from "@/src/features/i18n";

export function AnnotationQueuesOnboarding({
  projectId,
}: {
  projectId: string;
}) {
  const { t } = useI18n();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("onboarding.annotationQueues.manageWorkflows"),
      description: t("onboarding.annotationQueues.manageWorkflowsDescription"),
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      title: t("onboarding.annotationQueues.collaborate"),
      description: t("onboarding.annotationQueues.collaborateDescription"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t("onboarding.annotationQueues.trackMetrics"),
      description: t("onboarding.annotationQueues.trackMetricsDescription"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
    {
      title: t("onboarding.annotationQueues.baseline"),
      description: t("onboarding.annotationQueues.baselineDescription"),
      icon: <GitMerge className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("onboarding.annotationQueues.title")}
      description={t("onboarding.annotationQueues.description")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("onboarding.annotationQueues.createQueue"),
        component: (
          <CreateOrEditAnnotationQueueButton
            variant="default"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: t("onboarding.learnMore"),
        href: "https://langfuse.com/docs/scores/annotation",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/annotation-queue-overview-v1.mp4"
    />
  );
}
