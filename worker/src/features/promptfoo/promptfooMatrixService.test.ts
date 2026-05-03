import { describe, expect, it } from "vitest";
import {
  CreatePromptfooMatrixExperimentInputSchema,
  PromptfooMatrixRunStatus,
  getPromptfooReservedPromptVariableConflicts,
  promptfooAssertionsRequireExpectedOutput,
  type PromptfooDatasetRunMetadata,
} from "@langfuse/shared";

import { buildUpdatedPromptfooDatasetRunMetadata } from "./promptfooMatrixService";

const baseMetadata: PromptfooDatasetRunMetadata = {
  execution_mode: "promptfoo",
  promptfoo_matrix_run_id: "matrix-1",
  prompt_id: "prompt-1",
  prompt_name: "capital-answer",
  prompt_version: 1,
  promptfoo_prompt_index: 0,
  promptfoo_provider_id: "openai/gpt-4o-mini",
  provider: "openai",
  model: "gpt-4o-mini",
  model_params: {},
  assertions: [],
  status: PromptfooMatrixRunStatus.Failed,
  error: "previous failure",
};

describe("buildUpdatedPromptfooDatasetRunMetadata", () => {
  it("clears stale errors when a Promptfoo run moves back to running", () => {
    const metadata = buildUpdatedPromptfooDatasetRunMetadata({
      metadata: baseMetadata,
      status: PromptfooMatrixRunStatus.Running,
    });

    expect(metadata.status).toBe(PromptfooMatrixRunStatus.Running);
    expect(metadata.error).toBeUndefined();
  });

  it("clears stale errors when a Promptfoo run completes", () => {
    const metadata = buildUpdatedPromptfooDatasetRunMetadata({
      metadata: baseMetadata,
      status: PromptfooMatrixRunStatus.Completed,
      reportJsonObjectKey: "events/project-1/promptfoo/matrix-1/report.json",
      reportHtmlObjectKey: "events/project-1/promptfoo/matrix-1/report.html",
    });

    expect(metadata.status).toBe(PromptfooMatrixRunStatus.Completed);
    expect(metadata.error).toBeUndefined();
    expect(metadata.promptfoo_report_object_key).toBe(
      "events/project-1/promptfoo/matrix-1/report.json",
    );
    expect(metadata.promptfoo_report_html_object_key).toBe(
      "events/project-1/promptfoo/matrix-1/report.html",
    );
  });

  it("persists the current error for failed Promptfoo runs", () => {
    const metadata = buildUpdatedPromptfooDatasetRunMetadata({
      metadata: baseMetadata,
      status: PromptfooMatrixRunStatus.Failed,
      error: "current failure",
    });

    expect(metadata.status).toBe(PromptfooMatrixRunStatus.Failed);
    expect(metadata.error).toBe("current failure");
  });
});

describe("promptfooAssertionsRequireExpectedOutput", () => {
  it("requires expected outputs for omitted non-json assertion values", () => {
    expect(
      promptfooAssertionsRequireExpectedOutput([
        { type: "equals", metricName: "expected-output" },
      ]),
    ).toBe(true);
  });

  it("requires expected outputs for explicit expected_output templates", () => {
    expect(
      promptfooAssertionsRequireExpectedOutput([
        { type: "contains", value: "{{ expected_output }}" },
      ]),
    ).toBe(true);
  });

  it("does not require expected outputs for assertions with explicit values", () => {
    expect(
      promptfooAssertionsRequireExpectedOutput([
        { type: "contains", value: "Paris" },
        { type: "is-json" },
      ]),
    ).toBe(false);
  });
});

describe("getPromptfooReservedPromptVariableConflicts", () => {
  it("detects variables reserved for Promptfoo matrix bookkeeping", () => {
    expect(
      getPromptfooReservedPromptVariableConflicts([
        "country",
        "expected_output",
        "__langfuse_dataset_item_id",
        "country",
      ]),
    ).toEqual(["__langfuse_dataset_item_id", "expected_output"]);
  });
});

describe("CreatePromptfooMatrixExperimentInputSchema", () => {
  const validInput = {
    projectId: "project-1",
    datasetId: "dataset-1",
    promptIds: ["prompt-1"],
    modelConfigs: [{ provider: "openai", model: "gpt-4o-mini" }],
    assertions: [{ type: "equals", value: "Paris" }],
    name: "Capital matrix",
  };

  it("rejects matrix names that are empty after trimming", () => {
    expect(
      CreatePromptfooMatrixExperimentInputSchema.safeParse({
        ...validInput,
        name: "   ",
      }).success,
    ).toBe(false);
  });

  it("stores the trimmed matrix name", () => {
    const parsed = CreatePromptfooMatrixExperimentInputSchema.parse({
      ...validInput,
      name: "  Capital matrix  ",
    });

    expect(parsed.name).toBe("Capital matrix");
  });
});
