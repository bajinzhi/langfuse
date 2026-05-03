import { ScoreDataTypeEnum } from "@langfuse/shared";
import {
  eventTypes,
  LangfuseInternalTraceEnvironment,
  processEventBatch,
  type IngestionEventType,
} from "@langfuse/shared/src/server";
import type { EvaluateResult } from "promptfoo";
import { PromptfooProviderResponseMetadata } from "./providerAdapter";
import type { PromptfooEvaluateSummary } from "./promptfooRunner";
import { createPromptfooDeterministicUuid } from "./ids";

type ScoreValue =
  | {
      dataType: typeof ScoreDataTypeEnum.NUMERIC;
      value: number;
    }
  | {
      dataType: typeof ScoreDataTypeEnum.BOOLEAN;
      value: 0 | 1;
    };

const BUILT_IN_PROMPTFOO_SCORE_NAMES = new Set(["pass", "score"]);

function isProviderMetadata(
  metadata: unknown,
): metadata is PromptfooProviderResponseMetadata {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const value = metadata as Record<string, unknown>;
  return (
    typeof value.projectId === "string" &&
    typeof value.datasetRunId === "string" &&
    typeof value.datasetItemId === "string" &&
    typeof value.runItemId === "string" &&
    typeof value.traceId === "string" &&
    typeof value.promptId === "string" &&
    typeof value.provider === "string" &&
    typeof value.model === "string" &&
    typeof value.promptfooProviderId === "string"
  );
}

function buildScoreEvent(params: {
  name: string;
  score: ScoreValue;
  result: EvaluateResult;
  metadata: PromptfooProviderResponseMetadata;
  matrixRunId: string;
}): IngestionEventType {
  const scoreId = createPromptfooDeterministicUuid([
    "promptfoo-score",
    params.matrixRunId,
    params.metadata.datasetRunId,
    params.metadata.datasetItemId,
    params.metadata.promptfooProviderId,
    params.name,
  ]);
  const timestamp = new Date().toISOString();
  const bodyBase = {
    id: scoreId,
    traceId: params.metadata.traceId,
    observationId: null,
    name: params.name,
    comment: params.result.gradingResult?.reason ?? null,
    source: "EVAL" as const,
    environment: LangfuseInternalTraceEnvironment.PromptExperiments,
    executionTraceId: params.metadata.traceId,
    metadata: {
      promptfoo_matrix_run_id: params.matrixRunId,
      promptfoo_provider_id: params.metadata.promptfooProviderId,
      prompt_id: params.metadata.promptId,
      provider: params.metadata.provider,
      model: params.metadata.model,
      dataset_run_id: params.metadata.datasetRunId,
      dataset_item_id: params.metadata.datasetItemId,
      dataset_run_item_id: params.metadata.runItemId,
      promptfoo_prompt_idx: String(params.result.promptIdx),
      promptfoo_test_idx: String(params.result.testIdx),
    },
  };

  return {
    id: scoreId,
    type: eventTypes.SCORE_CREATE,
    timestamp,
    body:
      params.score.dataType === ScoreDataTypeEnum.NUMERIC
        ? {
            ...bodyBase,
            value: params.score.value,
            dataType: ScoreDataTypeEnum.NUMERIC,
          }
        : {
            ...bodyBase,
            value: params.score.value,
            dataType: ScoreDataTypeEnum.BOOLEAN,
          },
  };
}

function getNamedScoreName(name: string, usedNames: Set<string>) {
  const preferredName = `promptfoo/${name}`;
  if (
    !BUILT_IN_PROMPTFOO_SCORE_NAMES.has(name) &&
    !usedNames.has(preferredName)
  ) {
    return preferredName;
  }

  const fallbackName = `promptfoo/named/${name}`;
  if (!usedNames.has(fallbackName)) {
    return fallbackName;
  }

  let suffix = 2;
  while (usedNames.has(`${fallbackName}/${suffix}`)) {
    suffix += 1;
  }

  return `${fallbackName}/${suffix}`;
}

function getResultScores(result: EvaluateResult) {
  const scores: Array<{ name: string; score: ScoreValue }> = [
    {
      name: "promptfoo/pass",
      score: {
        dataType: ScoreDataTypeEnum.BOOLEAN,
        value: result.success ? 1 : 0,
      },
    },
    {
      name: "promptfoo/score",
      score: {
        dataType: ScoreDataTypeEnum.NUMERIC,
        value: Number.isFinite(result.score) ? result.score : 0,
      },
    },
  ];
  const usedNames = new Set(scores.map((score) => score.name));

  Object.entries(result.namedScores ?? {}).forEach(([name, value]) => {
    if (!Number.isFinite(value)) return;
    const scoreName = getNamedScoreName(name, usedNames);
    usedNames.add(scoreName);

    scores.push({
      name: scoreName,
      score: {
        dataType: ScoreDataTypeEnum.NUMERIC,
        value,
      },
    });
  });

  return scores;
}

function formatIngestionError(
  error: Awaited<ReturnType<typeof processEventBatch>>["errors"][number],
) {
  return [error.message, error.error].filter(Boolean).join(": ");
}

export class PromptfooResultAdapter {
  async writeScores(params: {
    projectId: string;
    matrixRunId: string;
    summary: PromptfooEvaluateSummary;
  }): Promise<{ written: number; skipped: number }> {
    const events: IngestionEventType[] = [];
    let skipped = 0;

    for (const result of params.summary.results) {
      const metadata = result.response?.metadata;
      if (!isProviderMetadata(metadata)) {
        skipped += 1;
        continue;
      }

      for (const score of getResultScores(result)) {
        events.push(
          buildScoreEvent({
            name: score.name,
            score: score.score,
            result,
            metadata,
            matrixRunId: params.matrixRunId,
          }),
        );
      }
    }

    if (events.length === 0) {
      return { written: 0, skipped };
    }

    const result = await processEventBatch(
      events,
      {
        validKey: true,
        scope: {
          projectId: params.projectId,
          accessLevel: "project" as const,
        },
      },
      { isLangfuseInternal: true },
    );

    if (result.errors.length > 0) {
      const firstError = result.errors[0];
      throw new Error(
        `Failed to write Promptfoo scores: ${formatIngestionError(firstError) || "Unknown ingestion error"}`,
      );
    }

    return { written: result.successes.length, skipped };
  }
}
