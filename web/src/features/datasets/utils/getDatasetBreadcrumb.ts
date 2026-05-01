import { createBreadcrumbItems } from "@/src/features/folders/utils";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const getDatasetBreadcrumb = (
  projectId: string,
  datasetName?: string,
  t?: Translate,
) => {
  const segments = (datasetName ?? "")
    .split("/")
    .filter((segment) => segment.trim());
  const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
  const breadcrumbItems = folderPath ? createBreadcrumbItems(folderPath) : [];

  return [
    {
      name: t ? t("datasets.label") : "Datasets",
      href: `/project/${projectId}/datasets`,
    },
    ...breadcrumbItems.map((item) => ({
      name: item.name,
      href: `/project/${projectId}/datasets?folder=${encodeURIComponent(item.folderPath)}`,
    })),
  ];
};
