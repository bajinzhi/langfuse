import type { Assertion, EvaluateTestSuite, TestCase } from "promptfoo";
import { prisma } from "@langfuse/shared/src/db";
import {
  logger,
  traceException,
  type PromptfooExperimentCreateEventType,
} from "@langfuse/shared/src/server";
import {
  PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT,
  PromptfooDatasetRunMetadata,
  PromptfooDatasetRunMetadataSchema,
  PromptfooMatrixRunStatus,
  formatPromptfooReservedPromptVariableError,
  getPromptfooReservedPromptVariableConflicts,
  promptfooAssertionsRequireExpectedOutput,
  type PromptfooAssertion,
} from "@langfuse/shared";
import { LangfuseDatasetAdapter } from "./datasetAdapter";
import {
  LangfusePromptAdapter,
  type LangfusePromptForPromptfoo,
} from "./promptAdapter";
import {
  getRetryablePromptfooProviderFailure,
  LangfuseProviderAdapter,
} from "./providerAdapter";
import { PromptfooReportAdapter } from "./reportAdapter";
import { PromptfooResultAdapter } from "./resultAdapter";
import { PromptfooRunner } from "./promptfooRunner";
import {
  PROMPTFOO_EXPECTED_OUTPUT_VAR,
  PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX,
  PROMPTFOO_REPORT_HTML_FORMAT,
  PROMPTFOO_REPORT_JSON_FORMAT,
  PROMPTFOO_VERSION,
} from "./constants";

type PromptfooDatasetRunRecord = {
  id: string;
  name: string;
  description: string | null;
  metadata: PromptfooDatasetRunMetadata;
};

type PromptfooMatrixJobResult =
  | { success: true }
  | { success: false; error?: string; retryable: boolean };

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function assertSameVariables(prompts: Array<{ variables: string[] }>) {
  const [firstPrompt, ...rest] = prompts;
  if (!firstPrompt) return;

  const expected = uniqueSorted(firstPrompt.variables);
  for (const prompt of rest) {
    const current = uniqueSorted(prompt.variables);
    if (
      expected.length !== current.length ||
      expected.some((value, index) => value !== current[index])
    ) {
      throw new Error(
        "All selected prompts must use the same variables and placeholders",
      );
    }
  }
}

function assertNoReservedVariables(prompts: Array<{ variables: string[] }>) {
  const reservedVariableConflicts = getPromptfooReservedPromptVariableConflicts(
    prompts.flatMap((prompt) => prompt.variables),
  );

  if (reservedVariableConflicts.length > 0) {
    throw new Error(
      formatPromptfooReservedPromptVariableError(reservedVariableConflicts),
    );
  }
}

function toPromptfooAssertion(assertion: PromptfooAssertion): Assertion {
  return {
    type: assertion.type,
    ...(assertion.type !== "is-json" && {
      value: assertion.value ?? `{{ ${PROMPTFOO_EXPECTED_OUTPUT_VAR} }}`,
    }),
    ...(assertion.metricName && { metric: assertion.metricName }),
  } as Assertion;
}

function stringifyPromptContent(prompt: LangfusePromptForPromptfoo) {
  return typeof prompt.prompt === "string"
    ? prompt.prompt
    : JSON.stringify(prompt.prompt, null, 2);
}

function toPromptfooPrompt(prompt: LangfusePromptForPromptfoo) {
  return [
    `Langfuse prompt: ${prompt.name} v${prompt.version}`,
    `${PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX} ${prompt.id}`,
    "",
    stringifyPromptContent(prompt),
  ].join("\n");
}

function parseDatasetRuns(
  datasetRuns: Array<{
    id: string;
    name: string;
    description: string | null;
    metadata: unknown;
  }>,
  matrixRunId: string,
): PromptfooDatasetRunRecord[] {
  return datasetRuns.map((datasetRun) => {
    const parsedMetadata = PromptfooDatasetRunMetadataSchema.safeParse(
      datasetRun.metadata,
    );
    if (!parsedMetadata.success) {
      throw new Error(`Dataset run ${datasetRun.id} is not a Promptfoo run`);
    }

    if (parsedMetadata.data.promptfoo_matrix_run_id !== matrixRunId) {
      throw new Error(`Dataset run ${datasetRun.id} belongs to another matrix`);
    }

    return {
      id: datasetRun.id,
      name: datasetRun.name,
      description: datasetRun.description,
      metadata: parsedMetadata.data,
    };
  });
}

function getPromptIdsByIndex(datasetRuns: PromptfooDatasetRunRecord[]) {
  const promptIdsByIndex: string[] = [];

  for (const datasetRun of datasetRuns) {
    const index = datasetRun.metadata.promptfoo_prompt_index;
    const existingPromptId = promptIdsByIndex[index];
    if (
      existingPromptId &&
      existingPromptId !== datasetRun.metadata.prompt_id
    ) {
      throw new Error(
        `Conflicting prompt ids for Promptfoo prompt index ${index}`,
      );
    }
    promptIdsByIndex[index] = datasetRun.metadata.prompt_id;
  }

  if (promptIdsByIndex.some((promptId) => !promptId)) {
    throw new Error("Promptfoo prompt indexes must be contiguous");
  }

  return promptIdsByIndex;
}

function buildTestSuite(params: {
  prompts: LangfusePromptForPromptfoo[];
  providers: EvaluateTestSuite["providers"];
  tests: Array<{ description: string; vars: Record<string, string> }>;
  assertions: PromptfooAssertion[];
}): EvaluateTestSuite {
  const assertions = params.assertions.map(toPromptfooAssertion);
  const tests: TestCase[] = params.tests.map((test) => ({
    description: test.description,
    vars: test.vars,
    assert: assertions,
  }));

  return {
    description: "Langfuse Promptfoo matrix evaluation",
    prompts: params.prompts.map(toPromptfooPrompt),
    providers: params.providers,
    tests,
    writeLatestResults: false,
  };
}

function assertWithinCallLimit(params: {
  testCount: number;
  datasetRunCount: number;
}) {
  const totalCalls = params.testCount * params.datasetRunCount;

  if (totalCalls > PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT) {
    throw new Error(
      `Promptfoo matrix would create ${totalCalls} model calls, above the ${PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT} limit.`,
    );
  }
}

export function buildUpdatedPromptfooDatasetRunMetadata(params: {
  metadata: PromptfooDatasetRunMetadata;
  status: PromptfooMatrixRunStatus;
  error?: string;
  reportJsonObjectKey?: string;
  reportHtmlObjectKey?: string;
}): PromptfooDatasetRunMetadata {
  const { error: _previousError, ...metadataWithoutError } = params.metadata;

  return {
    ...metadataWithoutError,
    status: params.status,
    ...(params.error !== undefined && { error: params.error }),
    ...(params.reportJsonObjectKey && {
      promptfoo_report_object_key: params.reportJsonObjectKey,
      promptfoo_report_format: PROMPTFOO_REPORT_JSON_FORMAT,
      promptfoo_version: PROMPTFOO_VERSION,
    }),
    ...(params.reportHtmlObjectKey && {
      promptfoo_report_html_object_key: params.reportHtmlObjectKey,
      promptfoo_report_html_format: PROMPTFOO_REPORT_HTML_FORMAT,
      promptfoo_version: PROMPTFOO_VERSION,
    }),
  };
}

export class PromptfooMatrixService {
  private readonly datasetAdapter = new LangfuseDatasetAdapter();
  private readonly promptAdapter = new LangfusePromptAdapter();
  private readonly providerAdapter = new LangfuseProviderAdapter();
  private readonly reportAdapter = new PromptfooReportAdapter();
  private readonly resultAdapter = new PromptfooResultAdapter();
  private readonly runner = new PromptfooRunner();

  async runMatrixJob(params: {
    event: PromptfooExperimentCreateEventType;
  }): Promise<PromptfooMatrixJobResult> {
    const { event } = params;
    let retryable = true;

    try {
      const datasetRuns = await this.getDatasetRuns(event);
      await this.updateDatasetRunMetadata({
        projectId: event.projectId,
        datasetRuns,
        status: PromptfooMatrixRunStatus.Running,
      });

      const prompts = await this.promptAdapter.getPrompts({
        projectId: event.projectId,
        promptIds: getPromptIdsByIndex(datasetRuns),
      });
      assertSameVariables(prompts);
      try {
        assertNoReservedVariables(prompts);
      } catch (error) {
        retryable = false;
        throw error;
      }

      const assertions = datasetRuns[0]?.metadata.assertions ?? [];
      const requiresExpectedOutput =
        promptfooAssertionsRequireExpectedOutput(assertions);

      const tests = await this.datasetAdapter.getTests({
        projectId: event.projectId,
        datasetId: event.datasetId,
        datasetVersion: datasetRuns[0]?.metadata.dataset_version
          ? new Date(datasetRuns[0].metadata.dataset_version)
          : undefined,
        variables: prompts[0]?.variables ?? [],
        requiresExpectedOutput,
      });

      if (tests.length === 0) {
        retryable = false;
        throw new Error(
          requiresExpectedOutput
            ? "No active dataset items match the selected prompt variables and have expected outputs"
            : "No active dataset items match the selected prompt variables",
        );
      }
      assertWithinCallLimit({
        testCount: tests.length,
        datasetRunCount: datasetRuns.length,
      });

      const datasetItemsById = new Map(
        tests.map((test) => [test.datasetItem.id, test.datasetItem]),
      );
      const providers = await this.providerAdapter.createProviders({
        projectId: event.projectId,
        datasetId: event.datasetId,
        prompts,
        datasetRuns,
        datasetItemsById,
      });

      const testSuite = buildTestSuite({
        prompts,
        providers,
        tests,
        assertions,
      });

      retryable = false;
      const { summary, htmlReport } = await this.runner.evaluate({
        testSuite,
        options: {
          cache: false,
          maxConcurrency: event.concurrency,
          showProgressBar: false,
          silent: true,
        },
        includeHtmlReport: true,
      });
      const retryableProviderFailure = getRetryablePromptfooProviderFailure(
        summary.results,
      );
      if (retryableProviderFailure) {
        retryable = true;
        throw new Error(retryableProviderFailure);
      }

      // Provider calls are represented by deterministic run items/traces at
      // this point, so persistence below can be retried without calling models
      // again.
      retryable = true;

      const reports = await this.reportAdapter.saveReport({
        projectId: event.projectId,
        matrixRunId: event.matrixRunId,
        summary,
        htmlReport,
      });
      const scoreResult = await this.resultAdapter.writeScores({
        projectId: event.projectId,
        matrixRunId: event.matrixRunId,
        summary,
      });

      await this.updateDatasetRunMetadata({
        projectId: event.projectId,
        datasetRuns,
        status: PromptfooMatrixRunStatus.Completed,
        reportJsonObjectKey: reports.jsonObjectKey,
        reportHtmlObjectKey: reports.htmlObjectKey,
      });

      logger.info("Completed Promptfoo matrix evaluation", {
        projectId: event.projectId,
        datasetId: event.datasetId,
        matrixRunId: event.matrixRunId,
        datasetRunCount: datasetRuns.length,
        promptfooResultCount: summary.results.length,
        scoreCount: scoreResult.written,
        skippedResultCount: scoreResult.skipped,
      });

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Promptfoo error";
      traceException(error);
      logger.error("Failed to run Promptfoo matrix evaluation", {
        error,
        projectId: event.projectId,
        datasetId: event.datasetId,
        matrixRunId: event.matrixRunId,
      });

      await this.markFailed(event, message);
      return { success: false, error: message, retryable };
    }
  }

  private async getDatasetRuns(
    event: PromptfooExperimentCreateEventType,
  ): Promise<PromptfooDatasetRunRecord[]> {
    const datasetRuns = await prisma.datasetRuns.findMany({
      where: {
        projectId: event.projectId,
        datasetId: event.datasetId,
        id: { in: event.datasetRunIds },
      },
    });

    if (datasetRuns.length !== event.datasetRunIds.length) {
      throw new Error("One or more Promptfoo dataset runs could not be found");
    }

    return parseDatasetRuns(datasetRuns, event.matrixRunId).sort((a, b) => {
      const promptDiff =
        a.metadata.promptfoo_prompt_index - b.metadata.promptfoo_prompt_index;
      if (promptDiff !== 0) return promptDiff;
      return a.metadata.promptfoo_provider_id.localeCompare(
        b.metadata.promptfoo_provider_id,
      );
    });
  }

  private async updateDatasetRunMetadata(params: {
    projectId: string;
    datasetRuns: PromptfooDatasetRunRecord[];
    status: PromptfooMatrixRunStatus;
    error?: string;
    reportJsonObjectKey?: string;
    reportHtmlObjectKey?: string;
  }) {
    await Promise.all(
      params.datasetRuns.map((datasetRun) =>
        prisma.datasetRuns.update({
          where: {
            id_projectId: {
              id: datasetRun.id,
              projectId: params.projectId,
            },
          },
          data: {
            metadata: buildUpdatedPromptfooDatasetRunMetadata({
              metadata: datasetRun.metadata,
              status: params.status,
              error: params.error,
              reportJsonObjectKey: params.reportJsonObjectKey,
              reportHtmlObjectKey: params.reportHtmlObjectKey,
            }),
          },
        }),
      ),
    );
  }

  private async markFailed(
    event: PromptfooExperimentCreateEventType,
    error: string,
  ) {
    const datasetRuns = await prisma.datasetRuns.findMany({
      where: {
        projectId: event.projectId,
        datasetId: event.datasetId,
        id: { in: event.datasetRunIds },
      },
    });

    const parsedRuns = datasetRuns.flatMap((datasetRun) => {
      const parsedMetadata = PromptfooDatasetRunMetadataSchema.safeParse(
        datasetRun.metadata,
      );
      if (!parsedMetadata.success) return [];
      return [
        {
          id: datasetRun.id,
          name: datasetRun.name,
          description: datasetRun.description,
          metadata: parsedMetadata.data,
        },
      ];
    });

    await this.updateDatasetRunMetadata({
      projectId: event.projectId,
      datasetRuns: parsedRuns,
      status: PromptfooMatrixRunStatus.Failed,
      error,
    });
  }
}
