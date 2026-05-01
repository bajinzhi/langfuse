import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const SCORES_TABS = {
  SCORES: "scores",
  ANALYTICS: "analytics",
} as const;

export type ScoresTab = (typeof SCORES_TABS)[keyof typeof SCORES_TABS];

export const getScoresTabs = (projectId: string, t: Translate) => [
  {
    value: SCORES_TABS.SCORES,
    label: t("nav.scores"),
    href: `/project/${projectId}/scores`,
  },
  {
    value: SCORES_TABS.ANALYTICS,
    label: t("common.analytics"),
    href: `/project/${projectId}/scores/analytics`,
  },
];
