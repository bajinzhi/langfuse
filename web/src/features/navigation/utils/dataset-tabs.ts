import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const DATASET_TABS = {
  RUNS: "runs",
  ITEMS: "items",
} as const;

export type DatasetTab = (typeof DATASET_TABS)[keyof typeof DATASET_TABS];

export const getDatasetTabs = (
  projectId: string,
  datasetId: string,
  t: Translate,
) => {
  return [
    {
      value: DATASET_TABS.RUNS,
      label: t("datasets.experiments"),
      href: `/project/${projectId}/datasets/${datasetId}`,
    },
    {
      value: DATASET_TABS.ITEMS,
      label: t("datasets.items"),
      href: `/project/${projectId}/datasets/${datasetId}/items`,
    },
  ];
};
