import { randomUUID } from "crypto";
import {
  clickhouseClient,
  logger,
  type BlobStorageFileLogInsertType,
} from "@langfuse/shared/src/server";

import { env } from "../../env";
import { getEvalS3StorageClient } from "../evaluation/s3StorageClient";
import type { PromptfooEvaluateSummary } from "./promptfooRunner";

export type SavedPromptfooReports = {
  jsonObjectKey: string;
  htmlObjectKey?: string;
};

const PROMPTFOO_REPORT_ENTITY_TYPE = "promptfoo_report";

function createBlobStorageFileLogRecord(params: {
  projectId: string;
  matrixRunId: string;
  objectKey: string;
  eventId: string;
  timestamp: number;
}): BlobStorageFileLogInsertType {
  return {
    id: randomUUID(),
    project_id: params.projectId,
    entity_type: PROMPTFOO_REPORT_ENTITY_TYPE,
    entity_id: params.matrixRunId,
    event_id: params.eventId,
    bucket_name: env.LANGFUSE_S3_EVENT_UPLOAD_BUCKET,
    bucket_path: params.objectKey,
    created_at: params.timestamp,
    updated_at: params.timestamp,
    event_ts: params.timestamp,
    is_deleted: 0,
  };
}

export class PromptfooReportAdapter {
  async saveReport(params: {
    projectId: string;
    matrixRunId: string;
    summary: PromptfooEvaluateSummary;
    htmlReport?: string;
  }): Promise<SavedPromptfooReports> {
    const reportPrefix = `${env.LANGFUSE_S3_EVENT_UPLOAD_PREFIX}${params.projectId}/promptfoo/${params.matrixRunId}`;
    const jsonObjectKey = `${reportPrefix}/evaluate-summary.json`;
    const htmlObjectKey = params.htmlReport
      ? `${reportPrefix}/evaluate-report.html`
      : undefined;

    const storageClient = getEvalS3StorageClient();
    const uploadedObjectKeys: string[] = [];

    try {
      await storageClient.uploadJson(
        jsonObjectKey,
        params.summary as unknown as Record<string, unknown>,
      );
      uploadedObjectKeys.push(jsonObjectKey);

      if (params.htmlReport && htmlObjectKey) {
        await storageClient.uploadFile({
          fileName: htmlObjectKey,
          fileType: "text/html; charset=utf-8",
          data: params.htmlReport,
        });
        uploadedObjectKeys.push(htmlObjectKey);
      }

      await this.registerReportBlobs({
        projectId: params.projectId,
        matrixRunId: params.matrixRunId,
        objectKeys: uploadedObjectKeys,
      });
    } catch (error) {
      if (uploadedObjectKeys.length > 0) {
        logger.warn(
          "Failed to save Promptfoo reports, deleting uploaded reports",
          {
            error,
            projectId: params.projectId,
            matrixRunId: params.matrixRunId,
            objectKeys: uploadedObjectKeys,
          },
        );
        try {
          await storageClient.deleteFiles(uploadedObjectKeys);
        } catch (cleanupError) {
          logger.warn("Failed to delete Promptfoo reports after save failure", {
            cleanupError,
            originalError: error,
            projectId: params.projectId,
            matrixRunId: params.matrixRunId,
            objectKeys: uploadedObjectKeys,
          });
        }
      }
      throw error;
    }

    return { jsonObjectKey, htmlObjectKey };
  }

  private async registerReportBlobs(params: {
    projectId: string;
    matrixRunId: string;
    objectKeys: string[];
  }) {
    if (env.LANGFUSE_ENABLE_BLOB_STORAGE_FILE_LOG !== "true") {
      return;
    }

    const timestamp = new Date().getTime();
    await clickhouseClient().insert({
      table: "blob_storage_file_log",
      values: params.objectKeys.map((objectKey) =>
        createBlobStorageFileLogRecord({
          projectId: params.projectId,
          matrixRunId: params.matrixRunId,
          objectKey,
          eventId: objectKey.split("/").pop() ?? objectKey,
          timestamp,
        }),
      ),
      format: "JSONEachRow",
    });
  }
}
