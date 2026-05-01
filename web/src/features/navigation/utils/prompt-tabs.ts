import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const PROMPT_TABS = {
  VERSIONS: "versions",
  METRICS: "metrics",
} as const;

export type PromptTab = (typeof PROMPT_TABS)[keyof typeof PROMPT_TABS];

export const getPromptTabs = (
  projectId: string,
  promptName: string,
  t: Translate,
) => [
  {
    value: PROMPT_TABS.VERSIONS,
    label: t("prompts.versions"),
    href: `/project/${projectId}/prompts/${encodeURIComponent(promptName)}`,
  },
  {
    value: PROMPT_TABS.METRICS,
    label: t("prompts.metrics.title"),
    href: `/project/${projectId}/prompts/${encodeURIComponent(promptName)}/metrics`,
  },
];
