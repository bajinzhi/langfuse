import { type MessageKey } from "@/src/features/i18n";

export const EVALS_TABS = {
  CONFIGS: "configs",
  TEMPLATES: "templates",
} as const;

export type EvalsTab = (typeof EVALS_TABS)[keyof typeof EVALS_TABS];

type Translate = (key: MessageKey) => string;

export const getEvalsTabs = (projectId: string, t?: Translate) => [
  {
    value: EVALS_TABS.CONFIGS,
    label: t?.("evals.tabs.running") ?? "Running Evaluators",
    href: `/project/${projectId}/evals`,
  },
  {
    value: EVALS_TABS.TEMPLATES,
    label: t?.("evals.tabs.library") ?? "Evaluator Library",
    href: `/project/${projectId}/evals/templates`,
  },
];
