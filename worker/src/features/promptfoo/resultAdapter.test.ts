import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScoreDataTypeEnum } from "@langfuse/shared";

import { PromptfooResultAdapter } from "./resultAdapter";
import type { PromptfooEvaluateSummary } from "./promptfooRunner";

const { mockProcessEventBatch } = vi.hoisted(() => ({
  mockProcessEventBatch: vi.fn(),
}));

vi.mock("@langfuse/shared/src/server", async () => {
  const actual = await vi.importActual("@langfuse/shared/src/server");
  return {
    ...actual,
    processEventBatch: mockProcessEventBatch,
  };
});

const providerMetadata = {
  projectId: "project-1",
  datasetRunId: "run-1",
  datasetItemId: "item-1",
  runItemId: "run-item-1",
  traceId: "trace-1",
  promptId: "prompt-1",
  provider: "openai",
  model: "gpt-4o-mini",
  promptfooProviderId: "langfuse:0:openai:gpt-4o-mini",
};

const summary = {
  results: [
    {
      success: true,
      score: 1,
      namedScores: {
        "contains-expected": 1,
        pass: 0.5,
        score: 0.75,
        "named/pass": 0.25,
      },
      promptIdx: 0,
      testIdx: 0,
      gradingResult: {
        reason: "All assertions passed",
      },
      response: {
        metadata: providerMetadata,
      },
    },
  ],
} as unknown as PromptfooEvaluateSummary;

describe("PromptfooResultAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessEventBatch.mockImplementation(
      async (events: Array<{ id: string }>) => ({
        successes: events.map((event) => ({ id: event.id, status: 201 })),
        errors: [],
      }),
    );
  });

  it("uses deterministic score ids so retries upsert the same Promptfoo scores", async () => {
    const adapter = new PromptfooResultAdapter();

    const firstResult = await adapter.writeScores({
      projectId: "project-1",
      matrixRunId: "matrix-1",
      summary,
    });
    const secondResult = await adapter.writeScores({
      projectId: "project-1",
      matrixRunId: "matrix-1",
      summary,
    });

    const firstEvents = mockProcessEventBatch.mock.calls[0]![0] as Array<{
      id: string;
      body: { id: string; name: string; dataType: string };
    }>;
    const secondEvents = mockProcessEventBatch.mock.calls[1]![0] as Array<{
      id: string;
      body: { id: string; name: string };
    }>;

    expect(firstEvents).toHaveLength(6);
    expect(firstResult).toEqual({ written: 6, skipped: 0 });
    expect(secondResult).toEqual({ written: 6, skipped: 0 });
    expect(firstEvents.map((event) => event.body.name)).toEqual([
      "promptfoo/pass",
      "promptfoo/score",
      "promptfoo/contains-expected",
      "promptfoo/named/pass",
      "promptfoo/named/score",
      "promptfoo/named/named/pass",
    ]);
    expect(new Set(firstEvents.map((event) => event.id)).size).toBe(
      firstEvents.length,
    );
    expect(
      firstEvents.find((event) => event.body.name === "promptfoo/pass")?.body
        .dataType,
    ).toBe(ScoreDataTypeEnum.BOOLEAN);
    expect(secondEvents.map((event) => event.id)).toEqual(
      firstEvents.map((event) => event.id),
    );
    expect(secondEvents.map((event) => event.body.id)).toEqual(
      firstEvents.map((event) => event.body.id),
    );
  });

  it("throws when score ingestion returns errors", async () => {
    mockProcessEventBatch.mockResolvedValueOnce({
      successes: [],
      errors: [
        {
          id: "score-1",
          status: 400,
          message: "Invalid request data",
          error: "Score value is invalid",
        },
      ],
    });

    await expect(
      new PromptfooResultAdapter().writeScores({
        projectId: "project-1",
        matrixRunId: "matrix-1",
        summary,
      }),
    ).rejects.toThrow(
      "Failed to write Promptfoo scores: Invalid request data: Score value is invalid",
    );
  });
});
