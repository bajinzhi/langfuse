import Link from "next/link";
import { FileJson, FileText } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { useI18n } from "@/src/features/i18n";
import {
  PROMPTFOO_REPORT_METADATA_REFETCH_INTERVAL_MS,
  shouldPollPromptfooReportMetadata,
} from "@/src/features/promptfoo/utils/reportMetadataPolling";
import { api } from "@/src/utils/api";

export function PromptfooReportButtons({
  projectId,
  datasetRunId,
}: {
  projectId: string;
  datasetRunId: string | undefined;
}) {
  const { t } = useI18n();
  const promptfooReport = api.promptfoo.reportMetadata.useQuery(
    {
      projectId,
      datasetRunId: datasetRunId ?? "",
    },
    {
      enabled: Boolean(projectId && datasetRunId),
      refetchInterval: (query) => {
        const metadata = query.state.data;
        return metadata && shouldPollPromptfooReportMetadata(metadata.status)
          ? PROMPTFOO_REPORT_METADATA_REFETCH_INTERVAL_MS
          : false;
      },
    },
  );

  if (
    !promptfooReport.data?.reportHtmlObjectKey &&
    !promptfooReport.data?.reportObjectKey
  ) {
    return null;
  }

  const getReportUrl = (format: "html" | "json") =>
    `/api/promptfoo/report?projectId=${encodeURIComponent(
      projectId,
    )}&datasetRunId=${encodeURIComponent(datasetRunId ?? "")}&format=${format}`;

  return (
    <div className="flex flex-wrap gap-2">
      {promptfooReport.data.reportHtmlObjectKey && (
        <Button asChild variant="outline" size="sm">
          <Link href={getReportUrl("html")} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" />
            <span className="ml-2 hidden md:block">
              {t("promptfoo.report.openHtml")}
            </span>
          </Link>
        </Button>
      )}
      {promptfooReport.data.reportObjectKey && (
        <Button asChild variant="outline" size="sm">
          <Link href={getReportUrl("json")} target="_blank" rel="noreferrer">
            <FileJson className="h-4 w-4" />
            <span className="ml-2 hidden md:block">
              {t("promptfoo.report.openJson")}
            </span>
          </Link>
        </Button>
      )}
    </div>
  );
}
