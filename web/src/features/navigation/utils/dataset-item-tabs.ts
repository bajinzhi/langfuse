import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const DATASET_ITEM_TABS = {
  ITEM: "item",
  RUNS: "runs",
} as const;

export type DatasetItemTab =
  (typeof DATASET_ITEM_TABS)[keyof typeof DATASET_ITEM_TABS];

export const getDatasetItemTabs = ({
  projectId,
  datasetId,
  itemId,
  t,
}: {
  projectId: string;
  datasetId: string;
  itemId: string;
  t: Translate;
}) => [
  {
    value: DATASET_ITEM_TABS.ITEM,
    label: t("datasets.item"),
    href: `/project/${projectId}/datasets/${datasetId}/items/${itemId}`,
  },
  {
    value: DATASET_ITEM_TABS.RUNS,
    label: t("datasets.experiments"),
    href: `/project/${projectId}/datasets/${datasetId}/items/${itemId}/runs`,
  },
];
