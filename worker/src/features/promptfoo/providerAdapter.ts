import type { ApiProvider, EvaluateResult, ProviderResponse } from "promptfoo";
import {
  convertDateToClickhouseDateTime,
  eventTypes,
  fetchLLMCompletion,
  IngestionEventType,
  LangfuseInternalTraceEnvironment,
  LLMAdapter,
  processEventBatch,
  queryClickhouse,
  type ChatMessage,
  type TraceSinkParams,
} from "@langfuse/shared/src/server";
import {
  asRecord,
  type DatasetItemDomain,
  type PromptfooDatasetRunMetadata,
} from "@langfuse/shared";
import { DefaultEvalModelService } from "@langfuse/shared/src/server";
import { createInternalEventsWriter } from "../internal-tracing/createInternalEventsWriter";
import { createW3CTraceId } from "../utils/utilities";
import {
  compilePromptMessages,
  type LangfusePromptForPromptfoo,
} from "./promptAdapter";
import {
  PROMPTFOO_DATASET_ITEM_ID_VAR,
  PROMPTFOO_DATASET_ITEM_VERSION_VAR,
  PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX,
} from "./constants";
import { createPromptfooDeterministicUuid } from "./ids";

export type PromptfooDatasetRunForProvider = {
  id: string;
  name: string;
  description: string | null;
  metadata: PromptfooDatasetRunMetadata;
};

type ProviderRunContext = {
  projectId: string;
  datasetId: string;
  datasetRun: PromptfooDatasetRunForProvider;
  prompt: LangfusePromptForPromptfoo;
  modelConfig: PromptfooDatasetRunMetadata;
  modelConfigResultPromise?: Promise<PromptfooModelConfigResult>;
  datasetItemsById: Map<string, DatasetItemDomain>;
};

type PromptfooModelConfigResult = Awaited<
  ReturnType<typeof DefaultEvalModelService.fetchValidModelConfig>
>;

type ValidPromptfooModelConfig = Extract<
  PromptfooModelConfigResult,
  { valid: true }
>["config"];

type ExistingPromptfooCell = {
  runItemId: string;
  traceId: string;
  output?: string;
  error?: string;
};

export const PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE =
  "dataset-run-item-ingestion";

export type PromptfooProviderResponseMetadata = {
  projectId: string;
  datasetRunId: string;
  datasetItemId: string;
  runItemId: string;
  traceId: string;
  promptId: string;
  provider: string;
  model: string;
  promptfooProviderId: string;
  retryableErrorSource?: typeof PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE;
  retryableErrorMessage?: string;
};

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

function getProviderId(metadata: PromptfooDatasetRunMetadata): string {
  return metadata.promptfoo_provider_id;
}

function stringifyCompletion(completion: unknown): string {
  if (typeof completion === "string") {
    return completion;
  }

  if (
    completion &&
    typeof completion === "object" &&
    "text" in completion &&
    typeof completion.text === "string"
  ) {
    return completion.text;
  }

  return JSON.stringify(completion) ?? String(completion);
}

async function createDatasetRunItem(params: {
  projectId: string;
  datasetId: string;
  datasetRunId: string;
  datasetItem: DatasetItemDomain;
  runItemId: string;
  traceId: string;
}) {
  const timestamp = new Date().toISOString();
  const event: IngestionEventType = {
    id: params.runItemId,
    type: eventTypes.DATASET_RUN_ITEM_CREATE,
    timestamp,
    body: {
      id: params.runItemId,
      traceId: params.traceId,
      observationId: null,
      error: null,
      createdAt: timestamp,
      datasetId: params.datasetId,
      runId: params.datasetRunId,
      datasetItemId: params.datasetItem.id,
      datasetVersion: params.datasetItem.validFrom.toISOString(),
    },
  };

  const result = await processEventBatch(
    [event],
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
    const error = result.errors[0];
    throw new Error(
      `Failed to create Promptfoo dataset run item ${params.runItemId}: ${
        error.message ?? error.error ?? "Unknown ingestion error"
      }`,
    );
  }
}

async function getExistingPromptfooCell(params: {
  projectId: string;
  datasetId: string;
  datasetRunId: string;
  datasetItemId: string;
}): Promise<ExistingPromptfooCell | null> {
  const runItems = await queryClickhouse<{
    id: string;
    trace_id: string;
  }>({
    query: `
      SELECT id, trace_id
      FROM dataset_run_items_rmt
      WHERE project_id = {projectId: String}
        AND dataset_id = {datasetId: String}
        AND dataset_run_id = {datasetRunId: String}
        AND dataset_item_id = {datasetItemId: String}
        AND is_deleted = 0
      ORDER BY event_ts DESC
      LIMIT 1
    `,
    params,
    tags: {
      feature: "promptfoo",
      type: "dataset-run-item",
      kind: "idempotency-check",
      projectId: params.projectId,
    },
  });
  const runItem = runItems[0];
  if (!runItem) {
    return null;
  }

  const observations = await queryClickhouse<{
    output: string | null;
    level: string;
    status_message: string | null;
  }>({
    query: `
      SELECT output, level, status_message
      FROM observations
      WHERE project_id = {projectId: String}
        AND type = 'GENERATION'
        AND trace_id = {traceId: String}
        AND is_deleted = 0
      ORDER BY event_ts DESC
      LIMIT 1
    `,
    params: {
      projectId: params.projectId,
      traceId: runItem.trace_id,
    },
    tags: {
      feature: "promptfoo",
      type: "observation",
      kind: "idempotency-check",
      projectId: params.projectId,
    },
  });
  const observation = observations[0];

  return {
    runItemId: runItem.id,
    traceId: runItem.trace_id,
    ...(observation?.output !== null &&
      observation?.output !== undefined && {
        output: observation.output,
      }),
    ...(observation?.output == null &&
      observation?.level === "ERROR" && {
        error:
          observation.status_message ?? "Previous Promptfoo model call failed",
      }),
  };
}

async function callLangfuseModel(params: {
  context: ProviderRunContext;
  datasetItem: DatasetItemDomain;
  datasetVersion: string;
  messages: ChatMessage[];
  traceId: string;
}) {
  const { context } = params;
  const modelConfig = await getValidModelConfig(context);

  const llmConnection = modelConfig.apiKey as unknown as Parameters<
    typeof fetchLLMCompletion
  >[0]["llmConnection"];
  const adapter =
    modelConfig.apiKey.adapter ??
    (modelConfig.adapter as unknown as LLMAdapter);
  const traceSinkParams: TraceSinkParams = {
    environment: LangfuseInternalTraceEnvironment.PromptExperiments,
    traceId: params.traceId,
    traceName: `promptfoo-${context.datasetRun.id.slice(0, 5)}`,
    targetProjectId: context.projectId,
    metadata: {
      promptfoo_matrix_run_id:
        context.datasetRun.metadata.promptfoo_matrix_run_id,
      dataset_id: context.datasetId,
      dataset_run_id: context.datasetRun.id,
      prompt_id: context.prompt.id,
      provider: context.modelConfig.provider,
      model: context.modelConfig.model,
    },
    prompt: {
      name: context.prompt.name,
      version: context.prompt.version,
    },
    eventsWriter: createInternalEventsWriter({
      experimentContext: {
        id: context.datasetRun.id,
        name: context.datasetRun.name,
        metadata: asRecord({
          ...context.datasetRun.metadata,
          dataset_version: params.datasetVersion,
        }),
        description: context.datasetRun.description,
        datasetId: context.datasetId,
        itemId: params.datasetItem.id,
        itemVersion: convertDateToClickhouseDateTime(
          params.datasetItem.validFrom,
        ),
        itemExpectedOutput: params.datasetItem.expectedOutput,
        itemMetadata: asRecord(params.datasetItem.metadata),
      },
    }),
  };

  return await fetchLLMCompletion({
    streaming: false,
    llmConnection,
    maxRetries: 1,
    messages: params.messages,
    modelParams: {
      provider: context.modelConfig.provider,
      model: context.modelConfig.model,
      adapter,
      ...context.modelConfig.model_params,
    },
    traceSinkParams,
  });
}

async function getValidModelConfig(
  context: ProviderRunContext,
): Promise<ValidPromptfooModelConfig> {
  context.modelConfigResultPromise ??=
    DefaultEvalModelService.fetchValidModelConfig(
      context.projectId,
      context.modelConfig.provider,
      context.modelConfig.model,
      context.modelConfig.model_params,
    );

  const modelConfig = await context.modelConfigResultPromise;
  if (!modelConfig.valid) {
    throw new Error(modelConfig.error);
  }

  return modelConfig.config;
}

function buildResponseMetadata(params: {
  context: ProviderRunContext;
  datasetItemId: string;
  runItemId: string;
  traceId: string;
}): PromptfooProviderResponseMetadata {
  return {
    projectId: params.context.projectId,
    datasetRunId: params.context.datasetRun.id,
    datasetItemId: params.datasetItemId,
    runItemId: params.runItemId,
    traceId: params.traceId,
    promptId: params.context.prompt.id,
    provider: params.context.modelConfig.provider,
    model: params.context.modelConfig.model,
    promptfooProviderId: getProviderId(params.context.modelConfig),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Promptfoo error";
}

export function getRetryablePromptfooProviderFailure(
  results: EvaluateResult[],
) {
  for (const result of results) {
    const metadata = result.response?.metadata;
    if (
      isProviderMetadata(metadata) &&
      metadata.retryableErrorSource ===
        PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE
    ) {
      return (
        metadata.retryableErrorMessage ??
        result.response?.error ??
        result.error ??
        "Retryable Promptfoo provider setup error"
      );
    }
  }

  return null;
}

function parseLangfusePromptId(renderedPrompt: string) {
  const prefix = PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const match = renderedPrompt.match(
    new RegExp(`^${prefix}\\s*(\\S+)\\s*$`, "m"),
  );

  return match?.[1] ?? null;
}

export function resolvePromptIndex(params: {
  contextPromptIdx: unknown;
  renderedPrompt: string;
  prompts: LangfusePromptForPromptfoo[];
}) {
  if (
    typeof params.contextPromptIdx === "number" &&
    Number.isInteger(params.contextPromptIdx) &&
    params.contextPromptIdx >= 0 &&
    params.contextPromptIdx < params.prompts.length
  ) {
    return params.contextPromptIdx;
  }

  const promptId = parseLangfusePromptId(params.renderedPrompt);
  if (!promptId) {
    return null;
  }

  const promptIndex = params.prompts.findIndex(
    (prompt) => prompt.id === promptId,
  );
  return promptIndex >= 0 ? promptIndex : null;
}

export class LangfuseProviderAdapter {
  async createProviders(params: {
    projectId: string;
    datasetId: string;
    prompts: LangfusePromptForPromptfoo[];
    datasetRuns: PromptfooDatasetRunForProvider[];
    datasetItemsById: Map<string, DatasetItemDomain>;
  }): Promise<ApiProvider[]> {
    const contexts = new Map<string, ProviderRunContext>();

    for (const datasetRun of params.datasetRuns) {
      const prompt = params.prompts[datasetRun.metadata.promptfoo_prompt_index];
      if (!prompt) {
        throw new Error(
          `Prompt index ${datasetRun.metadata.promptfoo_prompt_index} not found`,
        );
      }

      contexts.set(
        `${getProviderId(datasetRun.metadata)}:${datasetRun.metadata.promptfoo_prompt_index}`,
        {
          projectId: params.projectId,
          datasetId: params.datasetId,
          datasetRun,
          prompt,
          modelConfig: datasetRun.metadata,
          datasetItemsById: params.datasetItemsById,
        },
      );
    }

    const providerIds = Array.from(
      new Set(params.datasetRuns.map((run) => getProviderId(run.metadata))),
    );

    return providerIds.map((providerId) => ({
      id: () => providerId,
      label: providerId,
      callApi: async (renderedPrompt, context): Promise<ProviderResponse> => {
        const promptIdx = resolvePromptIndex({
          contextPromptIdx: context?.promptIdx,
          renderedPrompt,
          prompts: params.prompts,
        });
        if (promptIdx === null) {
          return {
            error: `Could not resolve Langfuse prompt for Promptfoo provider ${providerId}`,
          };
        }

        const runContext = contexts.get(`${providerId}:${promptIdx}`);
        if (!runContext) {
          return { error: `No Langfuse run context for ${providerId}` };
        }

        const datasetItemId = String(
          context?.vars?.[PROMPTFOO_DATASET_ITEM_ID_VAR] ?? "",
        );
        const datasetItem = runContext.datasetItemsById.get(datasetItemId);
        if (!datasetItem) {
          return { error: `Dataset item ${datasetItemId} not found` };
        }

        const traceId = createW3CTraceId(
          `${runContext.datasetRun.id}-${datasetItem.id}`,
        );
        const existingCell = await getExistingPromptfooCell({
          projectId: runContext.projectId,
          datasetId: runContext.datasetId,
          datasetRunId: runContext.datasetRun.id,
          datasetItemId: datasetItem.id,
        });
        const runItemId =
          existingCell?.runItemId ??
          createPromptfooDeterministicUuid([
            "promptfoo-run-item",
            runContext.datasetRun.id,
            datasetItem.id,
          ]);
        const cellTraceId = existingCell?.traceId ?? traceId;
        const metadata = buildResponseMetadata({
          context: runContext,
          datasetItemId,
          runItemId,
          traceId: cellTraceId,
        });

        if (existingCell?.output !== undefined) {
          return {
            output: existingCell.output,
            metadata,
          };
        }

        if (existingCell?.error) {
          return {
            error: existingCell.error,
            metadata,
          };
        }

        if (!existingCell) {
          try {
            await createDatasetRunItem({
              projectId: runContext.projectId,
              datasetId: runContext.datasetId,
              datasetRunId: runContext.datasetRun.id,
              datasetItem,
              runItemId,
              traceId: cellTraceId,
            });
          } catch (error) {
            const message = getErrorMessage(error);

            return {
              error: message,
              metadata: {
                ...metadata,
                retryableErrorSource:
                  PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE,
                retryableErrorMessage: message,
              },
            };
          }
        }

        try {
          const vars = (context?.vars ?? {}) as Record<string, unknown>;
          const messages = compilePromptMessages({
            prompt: runContext.prompt,
            vars,
          });
          const completion = await callLangfuseModel({
            context: runContext,
            datasetItem,
            datasetVersion: String(
              context?.vars?.[PROMPTFOO_DATASET_ITEM_VERSION_VAR] ?? "",
            ),
            messages,
            traceId: cellTraceId,
          });

          return {
            output: stringifyCompletion(completion),
            metadata,
          };
        } catch (error) {
          const message = getErrorMessage(error);

          return {
            error: message,
            metadata,
          };
        }
      },
    }));
  }
}
