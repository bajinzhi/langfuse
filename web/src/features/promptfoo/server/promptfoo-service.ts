import { randomUUID } from "crypto";
import { env as sharedEnv } from "@langfuse/shared/src/env";
import { prisma } from "@langfuse/shared/src/db";
import {
  createDatasetItemFilterState,
  DefaultEvalModelService,
  getS3EventStorageClient,
  getDatasetItems,
  logger,
  PromptfooExperimentCreateQueue,
  PromptService,
  QueueJobs,
  redis,
} from "@langfuse/shared/src/server";
import {
  extractPlaceholderNames,
  extractVariables,
  isPresent,
  PromptType,
  PROMPTFOO_REPORT_HTML_FORMAT,
  PROMPTFOO_REPORT_JSON_FORMAT,
  getPromptfooReservedPromptVariableConflicts,
  promptfooAssertionsRequireExpectedOutput,
  validateDatasetItem,
  type CreatePromptfooMatrixExperimentInput,
  type DatasetItemDomain,
  type PromptMessage,
  type PromptfooAssertion,
  type PromptfooDatasetRunMetadata,
  type PromptfooMatrixConfig,
} from "@langfuse/shared";
import {
  PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT,
  PromptfooDatasetRunMetadataSchema,
  PromptfooMatrixRunStatus,
} from "@langfuse/shared";

type PromptDetails = {
  id: string;
  name: string;
  version: number;
  variables: string[];
};

export const PromptfooMatrixValidationMessageKey = {
  DatasetNotFound: "promptfoo.matrix.validation.datasetNotFound",
  PromptNotFound: "promptfoo.matrix.validation.promptNotFound",
  PromptVariablesRequired:
    "promptfoo.matrix.validation.promptVariablesRequired",
  ReservedVariables: "promptfoo.matrix.validation.reservedVariables",
  VariableMismatch: "promptfoo.matrix.validation.variableMismatch",
  DatasetEmpty: "promptfoo.matrix.validation.datasetEmpty",
  NoMatchingItemsWithExpectedOutput:
    "promptfoo.matrix.validation.noMatchingItemsWithExpectedOutput",
  NoMatchingItems: "promptfoo.matrix.validation.noMatchingItems",
  CallLimitExceeded: "promptfoo.matrix.validation.callLimitExceeded",
  ModelConfigInvalid: "promptfoo.matrix.validation.modelConfigInvalid",
  ModelConfigInvalidGeneric:
    "promptfoo.matrix.validation.modelConfigInvalidGeneric",
} as const;

export type PromptfooMatrixValidationMessageKey =
  (typeof PromptfooMatrixValidationMessageKey)[keyof typeof PromptfooMatrixValidationMessageKey];

export type PromptfooMatrixValidationMessageValues = Record<
  string,
  string | number | boolean | null
>;

type MatrixValidationResult =
  | {
      isValid: true;
      totalItems: number;
      validItems: number;
      totalCalls: number;
      variables: string[];
    }
  | {
      isValid: false;
      messageKey: PromptfooMatrixValidationMessageKey;
      values?: PromptfooMatrixValidationMessageValues;
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function areSameVariables(left: string[], right: string[]) {
  const sortedLeft = uniqueSorted(left);
  const sortedRight = uniqueSorted(right);
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function countValidDatasetItems(
  datasetItems: Omit<DatasetItemDomain, "status">[],
  variables: string[],
  requiresExpectedOutput: boolean,
) {
  return datasetItems.filter(
    ({ input, expectedOutput }) =>
      isPresent(input) &&
      validateDatasetItem(input, variables) &&
      (!requiresExpectedOutput ||
        (expectedOutput !== null && expectedOutput !== undefined)),
  ).length;
}

function invalidMatrixConfig(
  messageKey: PromptfooMatrixValidationMessageKey,
  values?: PromptfooMatrixValidationMessageValues,
): MatrixValidationResult {
  return {
    isValid: false,
    messageKey,
    ...(values && { values }),
  };
}

function getPromptVariables(prompt: {
  type: string;
  prompt: unknown;
}): string[] {
  const extractedVariables = extractVariables(
    prompt.type === PromptType.Text
      ? (prompt.prompt?.toString() ?? "")
      : JSON.stringify(prompt.prompt),
  );

  const promptMessages =
    prompt.type === PromptType.Chat && Array.isArray(prompt.prompt)
      ? (prompt.prompt as PromptMessage[])
      : [];
  const placeholderNames = extractPlaceholderNames(promptMessages);

  return uniqueSorted([...extractedVariables, ...placeholderNames]);
}

async function getPromptDetails(params: {
  projectId: string;
  promptIds: string[];
}): Promise<PromptDetails[]> {
  const promptService = new PromptService(prisma, redis);
  const prompts = await prisma.prompt.findMany({
    where: {
      projectId: params.projectId,
      id: { in: params.promptIds },
    },
  });
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));

  return Promise.all(
    params.promptIds.map(async (promptId) => {
      const prompt = promptById.get(promptId);
      if (!prompt) {
        throw new Error(`Prompt ${promptId} not found`);
      }

      const resolvedPrompt = await promptService.resolvePrompt(prompt);
      if (!resolvedPrompt) {
        throw new Error(`Prompt ${promptId} not found`);
      }

      return {
        id: resolvedPrompt.id,
        name: resolvedPrompt.name,
        version: resolvedPrompt.version,
        variables: getPromptVariables(resolvedPrompt),
      };
    }),
  );
}

async function validateModelConfigs(
  projectId: string,
  input: PromptfooMatrixConfig,
) {
  for (const modelConfig of input.modelConfigs) {
    const validModel = await DefaultEvalModelService.fetchValidModelConfig(
      projectId,
      modelConfig.provider,
      modelConfig.model,
      modelConfig.modelParams,
    );

    if (!validModel.valid) {
      throw new Error(validModel.error);
    }
  }
}

function buildProviderId(params: {
  modelIndex: number;
  provider: string;
  model: string;
}) {
  return `langfuse:${params.modelIndex}:${params.provider}:${params.model}`;
}

export function buildRunName(params: {
  matrixName: string;
  matrixRunId: string;
  prompt: PromptDetails;
  promptIndex: number;
  modelIndex: number;
  provider: string;
  model: string;
}) {
  return [
    params.matrixName,
    `prompt ${params.promptIndex + 1}: ${params.prompt.name} v${params.prompt.version}`,
    `model ${params.modelIndex + 1}: ${params.provider}/${params.model}`,
    params.matrixRunId.slice(0, 8),
  ].join(" / ");
}

function buildMetadata(params: {
  matrixRunId: string;
  prompt: PromptDetails;
  promptIndex: number;
  providerId: string;
  provider: string;
  model: string;
  modelParams: CreatePromptfooMatrixExperimentInput["modelConfigs"][number]["modelParams"];
  assertions: PromptfooAssertion[];
  datasetVersion?: Date;
}): PromptfooDatasetRunMetadata {
  return PromptfooDatasetRunMetadataSchema.parse({
    execution_mode: "promptfoo",
    promptfoo_matrix_run_id: params.matrixRunId,
    prompt_id: params.prompt.id,
    prompt_name: params.prompt.name,
    prompt_version: params.prompt.version,
    promptfoo_prompt_index: params.promptIndex,
    promptfoo_provider_id: params.providerId,
    provider: params.provider,
    model: params.model,
    model_params: params.modelParams,
    assertions: params.assertions,
    ...(params.datasetVersion && {
      dataset_version: params.datasetVersion.toISOString(),
    }),
    status: PromptfooMatrixRunStatus.Pending,
  });
}

function buildFailedMetadata(params: {
  metadata: unknown;
  error: string;
}): PromptfooDatasetRunMetadata {
  const metadata = PromptfooDatasetRunMetadataSchema.parse(params.metadata);

  return {
    ...metadata,
    status: PromptfooMatrixRunStatus.Failed,
    error: params.error,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function buildExpectedReportObjectKey(params: {
  projectId: string;
  matrixRunId: string;
  fileName: string;
}) {
  if (!UUID_REGEX.test(params.matrixRunId)) {
    return null;
  }

  return `${sharedEnv.LANGFUSE_S3_EVENT_UPLOAD_PREFIX}${params.projectId}/promptfoo/${params.matrixRunId}/${params.fileName}`;
}

function getValidatedJsonReportObjectKey(params: {
  projectId: string;
  metadata: PromptfooDatasetRunMetadata;
}) {
  const expectedObjectKey = buildExpectedReportObjectKey({
    projectId: params.projectId,
    matrixRunId: params.metadata.promptfoo_matrix_run_id,
    fileName: "evaluate-summary.json",
  });

  if (!expectedObjectKey) {
    return null;
  }

  if (
    params.metadata.promptfoo_report_format !== PROMPTFOO_REPORT_JSON_FORMAT
  ) {
    return null;
  }

  if (params.metadata.promptfoo_report_object_key !== expectedObjectKey) {
    return null;
  }

  return expectedObjectKey;
}

function getValidatedHtmlReportObjectKey(params: {
  projectId: string;
  metadata: PromptfooDatasetRunMetadata;
}) {
  const expectedObjectKey = buildExpectedReportObjectKey({
    projectId: params.projectId,
    matrixRunId: params.metadata.promptfoo_matrix_run_id,
    fileName: "evaluate-report.html",
  });

  if (!expectedObjectKey) {
    return null;
  }

  if (
    params.metadata.promptfoo_report_html_format !==
    PROMPTFOO_REPORT_HTML_FORMAT
  ) {
    return null;
  }

  if (params.metadata.promptfoo_report_html_object_key !== expectedObjectKey) {
    return null;
  }

  return expectedObjectKey;
}

export class PromptfooService {
  async validateMatrixConfig(
    input: PromptfooMatrixConfig,
  ): Promise<MatrixValidationResult> {
    const dataset = await prisma.dataset.findUnique({
      where: {
        id_projectId: {
          id: input.datasetId,
          projectId: input.projectId,
        },
      },
    });

    if (!dataset) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.DatasetNotFound,
      );
    }

    let prompts: PromptDetails[];
    try {
      prompts = await getPromptDetails({
        projectId: input.projectId,
        promptIds: input.promptIds,
      });
    } catch {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.PromptNotFound,
      );
    }

    if (prompts.some((prompt) => prompt.variables.length === 0)) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.PromptVariablesRequired,
      );
    }

    const baseVariables = prompts[0]?.variables ?? [];
    const reservedVariableConflicts =
      getPromptfooReservedPromptVariableConflicts(
        prompts.flatMap((prompt) => prompt.variables),
      );
    if (reservedVariableConflicts.length > 0) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.ReservedVariables,
        {
          variables: reservedVariableConflicts.join(", "),
        },
      );
    }

    const mismatch = prompts.some(
      (prompt) => !areSameVariables(prompt.variables, baseVariables),
    );
    if (mismatch) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.VariableMismatch,
      );
    }

    const datasetItems = await getDatasetItems({
      projectId: input.projectId,
      filterState: createDatasetItemFilterState({
        datasetIds: [input.datasetId],
        status: "ACTIVE",
      }),
      version: input.datasetVersion,
    });

    if (datasetItems.length === 0) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.DatasetEmpty,
      );
    }

    const requiresExpectedOutput = promptfooAssertionsRequireExpectedOutput(
      input.assertions,
    );
    const validItems = countValidDatasetItems(
      datasetItems,
      baseVariables,
      requiresExpectedOutput,
    );
    if (validItems === 0) {
      return invalidMatrixConfig(
        requiresExpectedOutput
          ? PromptfooMatrixValidationMessageKey.NoMatchingItemsWithExpectedOutput
          : PromptfooMatrixValidationMessageKey.NoMatchingItems,
      );
    }

    const totalCalls =
      validItems * input.promptIds.length * input.modelConfigs.length;
    if (totalCalls > PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT) {
      return invalidMatrixConfig(
        PromptfooMatrixValidationMessageKey.CallLimitExceeded,
        {
          calls: totalCalls,
          limit: PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT,
        },
      );
    }

    try {
      await validateModelConfigs(input.projectId, input);
    } catch (error) {
      return invalidMatrixConfig(
        error instanceof Error
          ? PromptfooMatrixValidationMessageKey.ModelConfigInvalid
          : PromptfooMatrixValidationMessageKey.ModelConfigInvalidGeneric,
        error instanceof Error
          ? {
              error: error.message,
            }
          : undefined,
      );
    }

    return {
      isValid: true,
      totalItems: datasetItems.length,
      validItems,
      totalCalls,
      variables: baseVariables,
    };
  }

  async createMatrixExperiment(input: CreatePromptfooMatrixExperimentInput) {
    if (!redis) {
      throw new Error("Promptfoo matrix creation requires Redis.");
    }

    const validation = await this.validateMatrixConfig(input);
    if (!validation.isValid) {
      throw new Error(validation.messageKey);
    }

    const queue = PromptfooExperimentCreateQueue.getInstance();
    if (!queue) {
      throw new Error("Promptfoo experiment queue is not available.");
    }

    const prompts = await getPromptDetails({
      projectId: input.projectId,
      promptIds: input.promptIds,
    });
    const matrixRunId = randomUUID();

    const datasetRuns = await prisma.$transaction(
      input.promptIds.flatMap((promptId, promptIndex) => {
        const prompt = prompts.find((candidate) => candidate.id === promptId);
        if (!prompt) {
          throw new Error(`Prompt ${promptId} not found`);
        }

        return input.modelConfigs.map((modelConfig, modelIndex) => {
          const providerId = buildProviderId({
            modelIndex,
            provider: modelConfig.provider,
            model: modelConfig.model,
          });
          const runName = buildRunName({
            matrixName: input.name,
            matrixRunId,
            prompt,
            promptIndex,
            modelIndex,
            provider: modelConfig.provider,
            model: modelConfig.model,
          });

          return prisma.datasetRuns.create({
            data: {
              name: runName,
              description: input.description,
              datasetId: input.datasetId,
              projectId: input.projectId,
              metadata: buildMetadata({
                matrixRunId,
                prompt,
                promptIndex,
                providerId,
                provider: modelConfig.provider,
                model: modelConfig.model,
                modelParams: modelConfig.modelParams,
                assertions: input.assertions,
                datasetVersion: input.datasetVersion,
              }),
            },
          });
        });
      }),
    );

    try {
      await queue.add(QueueJobs.PromptfooExperimentCreateJob, {
        name: QueueJobs.PromptfooExperimentCreateJob,
        id: randomUUID(),
        timestamp: new Date(),
        payload: {
          projectId: input.projectId,
          datasetId: input.datasetId,
          matrixRunId,
          datasetRunIds: datasetRuns.map((datasetRun) => datasetRun.id),
          concurrency: input.concurrency,
          status: PromptfooMatrixRunStatus.Pending,
        },
        retryBaggage: {
          originalJobTimestamp: new Date(),
          attempt: 0,
        },
      });
    } catch (error) {
      const failedStatusError = `Failed to enqueue Promptfoo matrix job: ${getErrorMessage(error)}`;

      try {
        await prisma.$transaction(
          datasetRuns.map((datasetRun) =>
            prisma.datasetRuns.update({
              where: {
                id_projectId: {
                  id: datasetRun.id,
                  projectId: input.projectId,
                },
              },
              data: {
                metadata: buildFailedMetadata({
                  metadata: datasetRun.metadata,
                  error: failedStatusError,
                }),
              },
            }),
          ),
        );
      } catch (cleanupError) {
        logger.warn(
          "Failed to mark Promptfoo matrix runs failed after enqueue failure",
          {
            cleanupError,
            originalError: error,
            projectId: input.projectId,
            datasetId: input.datasetId,
            matrixRunId,
            datasetRunIds: datasetRuns.map((datasetRun) => datasetRun.id),
          },
        );
      }

      throw error;
    }

    return {
      success: true,
      datasetId: input.datasetId,
      matrixRunId,
      runIds: datasetRuns.map((datasetRun) => datasetRun.id),
      runName: input.name,
      totalCalls: validation.totalCalls,
    };
  }

  async getReportMetadata(params: {
    projectId: string;
    matrixRunId?: string;
    datasetRunId?: string;
  }) {
    const datasetRun = await prisma.datasetRuns.findFirst({
      where: {
        projectId: params.projectId,
        ...(params.datasetRunId
          ? { id: params.datasetRunId }
          : {
              metadata: {
                path: ["promptfoo_matrix_run_id"],
                equals: params.matrixRunId,
              },
            }),
      },
      orderBy: { createdAt: "asc" },
    });

    if (!datasetRun) {
      return null;
    }

    const metadata = PromptfooDatasetRunMetadataSchema.safeParse(
      datasetRun.metadata,
    );
    if (!metadata.success) {
      return null;
    }

    const reportObjectKey = getValidatedJsonReportObjectKey({
      projectId: params.projectId,
      metadata: metadata.data,
    });
    const reportHtmlObjectKey = getValidatedHtmlReportObjectKey({
      projectId: params.projectId,
      metadata: metadata.data,
    });

    return {
      datasetRunId: datasetRun.id,
      matrixRunId: metadata.data.promptfoo_matrix_run_id,
      status: metadata.data.status,
      reportObjectKey,
      reportHtmlObjectKey,
      reportFormat: reportObjectKey
        ? (metadata.data.promptfoo_report_format ?? null)
        : null,
      reportHtmlFormat: reportHtmlObjectKey
        ? (metadata.data.promptfoo_report_html_format ?? null)
        : null,
      promptfooVersion: metadata.data.promptfoo_version ?? null,
      error: metadata.data.error ?? null,
    };
  }

  async getReportJson(params: {
    projectId: string;
    matrixRunId?: string;
    datasetRunId?: string;
  }) {
    const metadata = await this.getReportMetadata(params);
    if (!metadata?.reportObjectKey) {
      return null;
    }

    const storageClient = getS3EventStorageClient(
      sharedEnv.LANGFUSE_S3_EVENT_UPLOAD_BUCKET,
    );

    return {
      metadata,
      reportJson: await storageClient.download(metadata.reportObjectKey),
    };
  }

  async getReportHtml(params: {
    projectId: string;
    matrixRunId?: string;
    datasetRunId?: string;
  }) {
    const metadata = await this.getReportMetadata(params);
    if (!metadata?.reportHtmlObjectKey) {
      return null;
    }

    const storageClient = getS3EventStorageClient(
      sharedEnv.LANGFUSE_S3_EVENT_UPLOAD_BUCKET,
    );

    return {
      metadata,
      reportHtml: await storageClient.download(metadata.reportHtmlObjectKey),
    };
  }
}

export const promptfooService = new PromptfooService();
