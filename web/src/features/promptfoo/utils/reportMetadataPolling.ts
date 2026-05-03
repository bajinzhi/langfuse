import {
  PromptfooMatrixRunStatus,
  type PromptfooMatrixRunStatus as PromptfooMatrixRunStatusType,
} from "@langfuse/shared";

export const PROMPTFOO_REPORT_METADATA_REFETCH_INTERVAL_MS = 5_000;

export function shouldPollPromptfooReportMetadata(
  status: PromptfooMatrixRunStatusType | null | undefined,
) {
  return (
    status === PromptfooMatrixRunStatus.Pending ||
    status === PromptfooMatrixRunStatus.Running
  );
}
