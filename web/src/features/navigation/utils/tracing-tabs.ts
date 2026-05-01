import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const TRACING_TABS = {
  TRACES: "traces",
  OBSERVATIONS: "observations",
} as const;

export type TracingTab = (typeof TRACING_TABS)[keyof typeof TRACING_TABS];

export const getTracingTabs = (projectId: string, t: Translate) => [
  {
    value: TRACING_TABS.TRACES,
    label: t("nav.traces"),
    href: `/project/${projectId}/traces`,
  },
  {
    value: TRACING_TABS.OBSERVATIONS,
    label: t("nav.observations"),
    href: `/project/${projectId}/observations`,
  },
];
