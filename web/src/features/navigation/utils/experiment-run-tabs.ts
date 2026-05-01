import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const EXPERIMENT_RUN_TABS = {
  RESULTS: "results",
  ANALYTICS: "analytics",
} as const;

export type ExperimentRunTab =
  (typeof EXPERIMENT_RUN_TABS)[keyof typeof EXPERIMENT_RUN_TABS];

export const getExperimentRunTabs = (
  projectId: string,
  t: Translate,
  onResultsClick?: () => void,
) => [
  {
    value: EXPERIMENT_RUN_TABS.RESULTS,
    label: t("experiments.results"),
    href: onResultsClick
      ? undefined
      : `/project/${projectId}/experiments/results`,
    onClick: onResultsClick,
  },
  {
    value: EXPERIMENT_RUN_TABS.ANALYTICS,
    label: t("common.analytics"),
    href: `/project/${projectId}/experiments/analytics`,
  },
];
