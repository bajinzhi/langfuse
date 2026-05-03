import { beforeEach, describe, expect, it, vi } from "vitest";

import { PromptfooReportAdapter } from "./reportAdapter";
import type { PromptfooEvaluateSummary } from "./promptfooRunner";

const {
  mockDeleteFiles,
  mockEnv,
  mockInsert,
  mockUploadFile,
  mockUploadJson,
  mockWarn,
} = vi.hoisted(() => ({
  mockDeleteFiles: vi.fn(),
  mockEnv: {
    LANGFUSE_ENABLE_BLOB_STORAGE_FILE_LOG: "true",
    LANGFUSE_S3_EVENT_UPLOAD_BUCKET: "event-bucket",
    LANGFUSE_S3_EVENT_UPLOAD_PREFIX: "events/",
  },
  mockInsert: vi.fn(),
  mockUploadFile: vi.fn(),
  mockUploadJson: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock("../../env", () => ({
  env: mockEnv,
}));

vi.mock("@langfuse/shared/src/server", () => ({
  clickhouseClient: () => ({
    insert: mockInsert,
  }),
  logger: {
    warn: mockWarn,
  },
}));

vi.mock("../evaluation/s3StorageClient", () => ({
  getEvalS3StorageClient: () => ({
    deleteFiles: mockDeleteFiles,
    uploadFile: mockUploadFile,
    uploadJson: mockUploadJson,
  }),
}));

const summary = {
  results: [],
} as unknown as PromptfooEvaluateSummary;

describe("PromptfooReportAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.LANGFUSE_ENABLE_BLOB_STORAGE_FILE_LOG = "true";
    mockInsert.mockResolvedValue(undefined);
    mockUploadJson.mockResolvedValue(undefined);
    mockUploadFile.mockResolvedValue(undefined);
    mockDeleteFiles.mockResolvedValue(undefined);
  });

  it("registers saved Promptfoo reports in the blob storage file log", async () => {
    const adapter = new PromptfooReportAdapter();

    await adapter.saveReport({
      projectId: "project-1",
      matrixRunId: "matrix-1",
      summary,
      htmlReport: "<!doctype html>",
    });

    expect(mockUploadJson).toHaveBeenCalledWith(
      "events/project-1/promptfoo/matrix-1/evaluate-summary.json",
      summary,
    );
    expect(mockUploadFile).toHaveBeenCalledWith({
      fileName: "events/project-1/promptfoo/matrix-1/evaluate-report.html",
      fileType: "text/html; charset=utf-8",
      data: "<!doctype html>",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      table: "blob_storage_file_log",
      format: "JSONEachRow",
      values: [
        expect.objectContaining({
          project_id: "project-1",
          entity_type: "promptfoo_report",
          entity_id: "matrix-1",
          event_id: "evaluate-summary.json",
          bucket_name: "event-bucket",
          bucket_path:
            "events/project-1/promptfoo/matrix-1/evaluate-summary.json",
          is_deleted: 0,
        }),
        expect.objectContaining({
          project_id: "project-1",
          entity_type: "promptfoo_report",
          entity_id: "matrix-1",
          event_id: "evaluate-report.html",
          bucket_name: "event-bucket",
          bucket_path:
            "events/project-1/promptfoo/matrix-1/evaluate-report.html",
          is_deleted: 0,
        }),
      ],
    });
  });

  it("deletes uploaded reports when blob log registration fails", async () => {
    const error = new Error("clickhouse unavailable");
    mockInsert.mockRejectedValue(error);
    const adapter = new PromptfooReportAdapter();

    await expect(
      adapter.saveReport({
        projectId: "project-1",
        matrixRunId: "matrix-1",
        summary,
        htmlReport: "<!doctype html>",
      }),
    ).rejects.toThrow(error);

    expect(mockDeleteFiles).toHaveBeenCalledWith([
      "events/project-1/promptfoo/matrix-1/evaluate-summary.json",
      "events/project-1/promptfoo/matrix-1/evaluate-report.html",
    ]);
    expect(mockWarn).toHaveBeenCalled();
  });

  it("deletes the JSON report when HTML report upload fails", async () => {
    const error = new Error("s3 unavailable");
    mockUploadFile.mockRejectedValue(error);
    const adapter = new PromptfooReportAdapter();

    await expect(
      adapter.saveReport({
        projectId: "project-1",
        matrixRunId: "matrix-1",
        summary,
        htmlReport: "<!doctype html>",
      }),
    ).rejects.toThrow(error);

    expect(mockDeleteFiles).toHaveBeenCalledWith([
      "events/project-1/promptfoo/matrix-1/evaluate-summary.json",
    ]);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(
      "Failed to save Promptfoo reports, deleting uploaded reports",
      expect.objectContaining({
        error,
        objectKeys: [
          "events/project-1/promptfoo/matrix-1/evaluate-summary.json",
        ],
      }),
    );
  });

  it("skips blob log registration when the blob file log is disabled", async () => {
    mockEnv.LANGFUSE_ENABLE_BLOB_STORAGE_FILE_LOG = "false";
    const adapter = new PromptfooReportAdapter();

    await adapter.saveReport({
      projectId: "project-1",
      matrixRunId: "matrix-1",
      summary,
    });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });
});
