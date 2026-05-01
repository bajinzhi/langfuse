import { type ParsedUrlQuery } from "querystring";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const DATASET_RUN_COMPARE_TABS = {
  COMPARE: "compare",
  CHARTS: "charts",
} as const;

export type DatasetRunCompareTab =
  (typeof DATASET_RUN_COMPARE_TABS)[keyof typeof DATASET_RUN_COMPARE_TABS];

export const getDatasetRunCompareTabs = (
  projectId: string,
  datasetId: string,
  t: Translate,
) => [
  {
    value: DATASET_RUN_COMPARE_TABS.COMPARE,
    label: t("datasets.outputs"),
    href: `/project/${projectId}/datasets/${datasetId}/compare`,
    querySelector: (query: ParsedUrlQuery) => ({ runs: query.runs }),
  },
  {
    value: DATASET_RUN_COMPARE_TABS.CHARTS,
    label: t("datasets.charts"),
    href: `/project/${projectId}/datasets/${datasetId}/compare/charts`,
    querySelector: (query: ParsedUrlQuery) => ({ runs: query.runs }),
  },
];
