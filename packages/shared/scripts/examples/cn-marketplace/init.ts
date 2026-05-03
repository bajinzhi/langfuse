import { hash } from "bcryptjs";
import {
  ApiKeyScope,
  DashboardWidgetChartType,
  DashboardWidgetViews,
  DatasetStatus,
  JobConfigState,
  JobExecutionStatus,
  JobType,
  LegacyPrismaObservationType,
  LegacyPrismaScoreSource,
  Role,
  ScoreConfigDataType,
  prisma,
} from "../../../src/db";
import { encrypt } from "../../../src/encryption";
import {
  PROMPTFOO_REPORT_HTML_FORMAT,
  PROMPTFOO_REPORT_JSON_FORMAT,
  PromptfooAssertionType,
  PromptfooDatasetRunMetadataSchema,
  PromptfooMatrixRunStatus,
  type PromptfooDatasetRunMetadata,
} from "../../../src/features/promptfoo/types";
import { env } from "../../../src/env";
import { createAndAddApiKeysToDb } from "../../../src/server/auth/apiKeys";
import { getS3EventStorageClient } from "../../../src/server/s3";
import { queryClickhouse } from "../../../src/server/repositories/clickhouse";
import { deleteDatasetRunItemsByProjectId } from "../../../src/server/repositories/dataset-run-items";
import { deleteEventsByProjectId } from "../../../src/server/repositories/events";
import { deleteObservationsByProjectId } from "../../../src/server/repositories/observations";
import { deleteScoresByProjectId } from "../../../src/server/repositories/scores";
import { deleteTracesByProjectId } from "../../../src/server/repositories/traces";
import type {
  DatasetRunItemRecordInsertType,
  EventRecordInsertType,
  ObservationRecordInsertType,
  ScoreRecordInsertType,
  TraceRecordInsertType,
} from "../../../src/server/repositories/definitions";
import {
  createDatasetRunItemsCh,
  createEventsCh,
  createObservationsCh,
  createScoresCh,
  createTracesCh,
} from "../../../src/server/test-utils/clickhouse-helpers";
import {
  DEMO_API_KEY,
  DEMO_CASES,
  DEMO_IDS,
  DEMO_ORG,
  DEMO_PROJECT,
  DEMO_USER,
  EVALUATION_RUNS,
  SCORE_CONFIGS,
  SEED_MARKER,
  type DemoCase,
} from "./fixtures";

const SCRIPT_PATH = "packages/shared/scripts/examples/cn-marketplace";
const ENVIRONMENT = "中文二手集市演示";
const RELEASE = "cn-marketplace-demo";
const LLM_PROVIDER = "ollama";
const LLM_ADAPTER = "openai";
const cnMarketplaceOllamaBaseUrl = process.env.CN_MARKETPLACE_OLLAMA_BASE_URL; // eslint-disable-line turbo/no-undeclared-env-vars
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL; // eslint-disable-line turbo/no-undeclared-env-vars
const cnMarketplaceOllamaApiKey = process.env.CN_MARKETPLACE_OLLAMA_API_KEY; // eslint-disable-line turbo/no-undeclared-env-vars
const ollamaApiKey = process.env.OLLAMA_API_KEY; // eslint-disable-line turbo/no-undeclared-env-vars
const cnMarketplaceOllamaModel = process.env.CN_MARKETPLACE_OLLAMA_MODEL; // eslint-disable-line turbo/no-undeclared-env-vars
const ollamaModel = process.env.OLLAMA_MODEL; // eslint-disable-line turbo/no-undeclared-env-vars
const LLM_BASE_URL = normalizeOllamaOpenAIBaseUrl(
  cnMarketplaceOllamaBaseUrl ?? ollamaBaseUrl ?? "http://localhost:11434/v1",
);
const LLM_SECRET_KEY =
  cnMarketplaceOllamaApiKey ?? ollamaApiKey ?? "ollama-local-demo-key";
const FALLBACK_OLLAMA_MODEL = "qwen2.5:7b";
let MODEL_NAME = getConfiguredOllamaModelName() ?? FALLBACK_OLLAMA_MODEL;
const DEFAULT_LLM_MODEL_PARAMS = {
  temperature: 0.2,
  max_tokens: 600,
};
const EVAL_LLM_MODEL_PARAMS = {
  temperature: 0,
  max_tokens: 200,
};
const PROMPTFOO_MATRIX_RUN_ID = "11111111-1111-4111-8111-111111111111";
const PROMPTFOO_MATRIX_NAME = "中文二手集市客服 Promptfoo 矩阵";
const PROMPTFOO_REPORT_JSON_FILE_NAME = "evaluate-summary.json";
const PROMPTFOO_REPORT_HTML_FILE_NAME = "evaluate-report.html";
const PROMPTFOO_VERSION = "0.118.0-demo";
const PROMPTFOO_ASSERTIONS = [
  {
    type: PromptfooAssertionType.Equals,
    metricName: "expected-output",
  },
] as const;
const PROMPTFOO_RUNS = [
  {
    id: DEMO_IDS.promptfooRunAssistantV1,
    variant: "v1",
    promptIndex: 0,
    modelIndex: 0,
    description: "Promptfoo 示例矩阵：基线客服助手在中文交易数据集上的表现。",
  },
  {
    id: DEMO_IDS.promptfooRunAssistantV2,
    variant: "v2",
    promptIndex: 1,
    modelIndex: 0,
    description: "Promptfoo 示例矩阵：优化客服助手在中文交易数据集上的表现。",
  },
] as const;
const EXPECTED = {
  prompts: 4,
  scoreConfigs: 4,
  datasetItems: DEMO_CASES.length,
  datasetRuns: EVALUATION_RUNS.length + PROMPTFOO_RUNS.length,
  datasetRunItems:
    DEMO_CASES.length * (EVALUATION_RUNS.length + PROMPTFOO_RUNS.length),
  llmApiKeys: 1,
  defaultLlmModels: 1,
  traces: DEMO_CASES.length * EVALUATION_RUNS.length,
  observations: DEMO_CASES.length * EVALUATION_RUNS.length * 2,
  scores:
    DEMO_CASES.length * EVALUATION_RUNS.length * 3 +
    DEMO_CASES.length +
    DEMO_CASES.length * PROMPTFOO_RUNS.length * 2,
  jobExecutions: DEMO_CASES.length * EVALUATION_RUNS.length,
  annotationQueueItems: 3,
  dashboardWidgets: 3,
  events: DEMO_CASES.length * EVALUATION_RUNS.length * 2,
};

type RunVariant = (typeof EVALUATION_RUNS)[number]["variant"];
type PromptfooRun = (typeof PROMPTFOO_RUNS)[number];

type SeededArtifacts = {
  traces: TraceRecordInsertType[];
  observations: ObservationRecordInsertType[];
  scores: ScoreRecordInsertType[];
  datasetRunItems: DatasetRunItemRecordInsertType[];
  events: EventRecordInsertType[];
};

type CountRow = {
  count: string | number;
};

type DuplicateIdRow = {
  id: string;
  count: string | number;
};

type OllamaTagsResponse = {
  models?: Array<{
    name?: unknown;
    model?: unknown;
    modified_at?: unknown;
  }>;
};

function getConfiguredOllamaModelName(): string | undefined {
  return cnMarketplaceOllamaModel ?? ollamaModel;
}

function normalizeOllamaOpenAIBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
}

function getOllamaTagsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "");
  url.pathname = `${basePath}/api/tags`.replace(/\/+/g, "/");
  return url.toString();
}

async function fetchDefaultLocalOllamaModel(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(getOllamaTagsUrl(LLM_BASE_URL), {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const models = (data.models ?? [])
      .map((item) => ({
        name:
          typeof item.model === "string"
            ? item.model
            : typeof item.name === "string"
              ? item.name
              : null,
        modifiedAt:
          typeof item.modified_at === "string"
            ? Date.parse(item.modified_at)
            : 0,
      }))
      .filter((item): item is { name: string; modifiedAt: number } =>
        Boolean(item.name),
      )
      .sort((left, right) => right.modifiedAt - left.modifiedAt);

    return models[0]?.name ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveOllamaModelName(): Promise<string> {
  const configuredModel = getConfiguredOllamaModelName();
  if (configuredModel) {
    console.log("使用环境变量指定的 Ollama 模型:", configuredModel);
    return configuredModel;
  }

  const localModel = await fetchDefaultLocalOllamaModel();
  if (localModel) {
    console.log("检测到本地 Ollama 模型:", localModel);
    return localModel;
  }

  console.log("未检测到本地 Ollama 模型，使用回退模型:", FALLBACK_OLLAMA_MODEL);
  return FALLBACK_OLLAMA_MODEL;
}

const getDisplaySecretKey = (secretKey: string): string =>
  secretKey.endsWith('"}')
    ? "..." + secretKey.slice(-6, -2)
    : "..." + secretKey.slice(-4);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeJson = (value: unknown): string => JSON.stringify(value);

const stringifyMetadataValue = (value: unknown): string =>
  value instanceof Date
    ? value.toISOString()
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

const asStringMap = (value: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, stringifyMetadataValue(item)]),
  );

const metadataArrays = (value: Record<string, string | number | boolean>) => {
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right, "zh-CN"),
  );
  return {
    names: entries.map(([key]) => key),
    values: entries.map(([, item]) => String(item)),
  };
};

const toMs = (date: Date): number => date.getTime();
const toMicro = (date: Date): number => date.getTime() * 1000;

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const datasetItemId = (demoCase: DemoCase) =>
  `cn-marketplace-dataset-item-${demoCase.id}`;

const traceId = (demoCase: DemoCase, variant: RunVariant) =>
  `cn-marketplace-trace-${demoCase.id}-${variant}`;

const rootObservationId = (demoCase: DemoCase, variant: RunVariant) =>
  `cn-marketplace-root-${demoCase.id}-${variant}`;

const generationObservationId = (demoCase: DemoCase, variant: RunVariant) =>
  `cn-marketplace-generation-${demoCase.id}-${variant}`;

const datasetRunItemId = (demoCase: DemoCase, variant: RunVariant) =>
  `cn-marketplace-run-item-${demoCase.id}-${variant}`;

const promptfooDatasetRunItemId = (
  demoCase: DemoCase,
  promptfooRun: PromptfooRun,
) => `cn-marketplace-promptfoo-item-${demoCase.id}-${promptfooRun.variant}`;

const scoreId = (
  demoCase: DemoCase,
  variant: RunVariant,
  name: "quality" | "intent" | "risk" | "manual",
) => `cn-marketplace-score-${demoCase.id}-${variant}-${name}`;

const promptfooScoreId = (
  demoCase: DemoCase,
  promptfooRun: PromptfooRun,
  name: "pass" | "score",
) =>
  `cn-marketplace-promptfoo-score-${demoCase.id}-${promptfooRun.variant}-${name}`;

const evalExecutionId = (demoCase: DemoCase, variant: RunVariant) =>
  `cn-marketplace-eval-execution-${demoCase.id}-${variant}`;

const getVariantOutput = (demoCase: DemoCase, variant: RunVariant): string =>
  variant === "v1" ? demoCase.baselineOutput : demoCase.optimizedOutput;

const getVariantScores = (demoCase: DemoCase, variant: RunVariant) =>
  variant === "v1" ? demoCase.scores.v1 : demoCase.scores.v2;

const getPromptForVariant = (variant: RunVariant) =>
  variant === "v1"
    ? {
        id: DEMO_IDS.promptAssistantV1,
        name: "中文二手集市-客服助手",
        version: 1,
      }
    : {
        id: DEMO_IDS.promptAssistantV2,
        name: "中文二手集市-客服助手",
        version: 2,
      };

const buildPromptfooProviderId = (modelIndex: number) =>
  `langfuse:${modelIndex}:${LLM_PROVIDER}:${MODEL_NAME}`;

const buildPromptfooRunName = (run: PromptfooRun) => {
  const prompt = getPromptForVariant(run.variant);
  return [
    PROMPTFOO_MATRIX_NAME,
    `prompt ${run.promptIndex + 1}: ${prompt.name} v${prompt.version}`,
    `model ${run.modelIndex + 1}: ${LLM_PROVIDER}/${MODEL_NAME}`,
    PROMPTFOO_MATRIX_RUN_ID.slice(0, 8),
  ].join(" / ");
};

const buildPromptfooReportObjectKey = (fileName: string) =>
  `${env.LANGFUSE_S3_EVENT_UPLOAD_PREFIX}${DEMO_PROJECT.id}/promptfoo/${PROMPTFOO_MATRIX_RUN_ID}/${fileName}`;

const buildPromptfooRunMetadata = (
  run: PromptfooRun,
): PromptfooDatasetRunMetadata => {
  const prompt = getPromptForVariant(run.variant);

  return PromptfooDatasetRunMetadataSchema.parse({
    execution_mode: "promptfoo",
    promptfoo_matrix_run_id: PROMPTFOO_MATRIX_RUN_ID,
    promptfoo_report_object_key: buildPromptfooReportObjectKey(
      PROMPTFOO_REPORT_JSON_FILE_NAME,
    ),
    promptfoo_report_format: PROMPTFOO_REPORT_JSON_FORMAT,
    promptfoo_report_html_object_key: buildPromptfooReportObjectKey(
      PROMPTFOO_REPORT_HTML_FILE_NAME,
    ),
    promptfoo_report_html_format: PROMPTFOO_REPORT_HTML_FORMAT,
    promptfoo_version: PROMPTFOO_VERSION,
    prompt_id: prompt.id,
    prompt_name: prompt.name,
    prompt_version: prompt.version,
    promptfoo_prompt_index: run.promptIndex,
    promptfoo_provider_id: buildPromptfooProviderId(run.modelIndex),
    provider: LLM_PROVIDER,
    model: MODEL_NAME,
    model_params: DEFAULT_LLM_MODEL_PARAMS,
    assertions: PROMPTFOO_ASSERTIONS.map((assertion) => ({ ...assertion })),
    status: PromptfooMatrixRunStatus.Completed,
  });
};

const hasSeedMarker = (metadata: unknown): boolean =>
  Boolean(
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).seed === SEED_MARKER,
  );

async function main() {
  console.log("开始初始化中文二手集市演示数据...");
  MODEL_NAME = await resolveOllamaModelName();

  const orgMembership = await ensureDemoUserAndOrg();
  await resetExistingSeedProject();
  await createProjectContext(orgMembership.id);
  await seedPostgresData();
  await seedPromptfooReports();

  const artifacts = buildClickHouseArtifacts();
  await seedClickHouseData(artifacts);

  const summary = await validateSeed();
  console.log("中文二手集市演示数据初始化完成。");
  console.log(JSON.stringify(summary, null, 2));
  console.log("登录账号:", DEMO_USER.email);
  console.log("登录密码:", DEMO_USER.password);
  console.log("项目 ID:", DEMO_PROJECT.id);
  console.log("Public Key:", DEMO_API_KEY.publicKey);
  console.log("Secret Key:", DEMO_API_KEY.secretKey);
  console.log("默认 LLM Provider:", LLM_PROVIDER);
  console.log("默认 Ollama Base URL:", LLM_BASE_URL);
  console.log("默认 Ollama 模型:", MODEL_NAME);
}

async function ensureDemoUserAndOrg() {
  const password = await hash(DEMO_USER.password, 12);

  await prisma.user.upsert({
    where: { id: DEMO_USER.id },
    update: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password,
    },
    create: {
      id: DEMO_USER.id,
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password,
    },
  });

  await prisma.organization.upsert({
    where: { id: DEMO_ORG.id },
    update: {
      name: DEMO_ORG.name,
      metadata: {
        seed: SEED_MARKER,
        source: SCRIPT_PATH,
      },
    },
    create: {
      id: DEMO_ORG.id,
      name: DEMO_ORG.name,
      metadata: {
        seed: SEED_MARKER,
        source: SCRIPT_PATH,
      },
    },
  });

  return prisma.organizationMembership.upsert({
    where: {
      orgId_userId: {
        orgId: DEMO_ORG.id,
        userId: DEMO_USER.id,
      },
    },
    update: {
      role: Role.OWNER,
    },
    create: {
      id: DEMO_IDS.orgMembership,
      orgId: DEMO_ORG.id,
      userId: DEMO_USER.id,
      role: Role.OWNER,
    },
  });
}

async function resetExistingSeedProject() {
  const existingProject = await prisma.project.findUnique({
    where: { id: DEMO_PROJECT.id },
    select: { id: true, metadata: true, name: true },
  });

  if (!existingProject) return;

  if (!hasSeedMarker(existingProject.metadata)) {
    throw new Error(
      `项目 ${DEMO_PROJECT.id} 已存在但没有 ${SEED_MARKER} 标记，已中止以避免误删现有数据。`,
    );
  }

  console.log("发现已有演示项目，开始清理旧数据...");

  await Promise.all([
    deleteEventsByProjectId(DEMO_PROJECT.id),
    deleteDatasetRunItemsByProjectId(DEMO_PROJECT.id),
    deleteScoresByProjectId(DEMO_PROJECT.id),
    deleteObservationsByProjectId(DEMO_PROJECT.id),
    deleteTracesByProjectId(DEMO_PROJECT.id),
  ]);

  await waitForClickHouseProjectDataDeleted();

  await prisma.project.delete({
    where: { id: DEMO_PROJECT.id },
  });
}

async function createProjectContext(orgMembershipId: string) {
  const now = new Date();

  await prisma.project.create({
    data: {
      id: DEMO_PROJECT.id,
      orgId: DEMO_ORG.id,
      name: DEMO_PROJECT.name,
      hasTraces: true,
      metadata: {
        seed: SEED_MARKER,
        source: SCRIPT_PATH,
        refreshedAt: now.toISOString(),
        description: "中文二手交易客服、数据集、实验、评估与标注闭环示例。",
      },
    },
  });

  await prisma.projectMembership.create({
    data: {
      orgMembershipId,
      projectId: DEMO_PROJECT.id,
      userId: DEMO_USER.id,
      role: Role.ADMIN,
    },
  });

  await prisma.apiKey.deleteMany({
    where: { publicKey: DEMO_API_KEY.publicKey },
  });

  await createAndAddApiKeysToDb({
    prisma,
    entityId: DEMO_PROJECT.id,
    scope: ApiKeyScope.PROJECT,
    note: "中文二手集市演示 API Key",
    predefinedKeys: {
      publicKey: DEMO_API_KEY.publicKey,
      secretKey: DEMO_API_KEY.secretKey,
    },
  });

  const llmApiKey = await prisma.llmApiKeys.create({
    data: {
      id: DEMO_IDS.llmApiKey,
      projectId: DEMO_PROJECT.id,
      provider: LLM_PROVIDER,
      adapter: LLM_ADAPTER,
      secretKey: encrypt(LLM_SECRET_KEY),
      displaySecretKey: getDisplaySecretKey(LLM_SECRET_KEY),
      baseURL: LLM_BASE_URL,
      customModels: [MODEL_NAME],
      withDefaultModels: false,
      extraHeaderKeys: [],
    },
  });

  await prisma.defaultLlmModel.create({
    data: {
      id: DEMO_IDS.defaultLlmModel,
      projectId: DEMO_PROJECT.id,
      llmApiKeyId: llmApiKey.id,
      provider: LLM_PROVIDER,
      adapter: LLM_ADAPTER,
      model: MODEL_NAME,
      modelParams: DEFAULT_LLM_MODEL_PARAMS,
    },
  });
}

async function seedPostgresData() {
  const baseTime = addMinutes(new Date(), -180);
  const datasetItems = DEMO_CASES.map((demoCase, index) => {
    const createdAt = addMinutes(baseTime, index * 12);
    return {
      id: datasetItemId(demoCase),
      projectId: DEMO_PROJECT.id,
      datasetId: DEMO_IDS.dataset,
      status: DatasetStatus.ACTIVE,
      input: demoCase.input,
      expectedOutput: demoCase.expectedOutput,
      metadata: {
        ...demoCase.metadata,
        用例标题: demoCase.title,
        数据来源: demoCase.source,
      },
      sourceTraceId: traceId(demoCase, "v2"),
      sourceObservationId: generationObservationId(demoCase, "v2"),
      createdAt,
      updatedAt: createdAt,
      validFrom: createdAt,
    };
  });

  const evaluationDatasetRunItems = EVALUATION_RUNS.flatMap((run) =>
    DEMO_CASES.map((demoCase, index) => {
      const createdAt = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 2 : 6),
      );
      return {
        id: datasetRunItemId(demoCase, run.variant),
        projectId: DEMO_PROJECT.id,
        datasetRunId: run.id,
        datasetItemId: datasetItemId(demoCase),
        traceId: traceId(demoCase, run.variant),
        observationId: generationObservationId(demoCase, run.variant),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );
  const promptfooDatasetRunItems = PROMPTFOO_RUNS.flatMap((run) =>
    DEMO_CASES.map((demoCase, index) => {
      const createdAt = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 9 : 11),
      );
      return {
        id: promptfooDatasetRunItemId(demoCase, run),
        projectId: DEMO_PROJECT.id,
        datasetRunId: run.id,
        datasetItemId: datasetItemId(demoCase),
        traceId: traceId(demoCase, run.variant),
        observationId: generationObservationId(demoCase, run.variant),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );
  const datasetRunItems = [
    ...evaluationDatasetRunItems,
    ...promptfooDatasetRunItems,
  ];

  const traceSessions = DEMO_CASES.map((demoCase, index) => ({
    id: demoCase.sessionId,
    projectId: DEMO_PROJECT.id,
    environment: ENVIRONMENT,
    bookmarked: index === 0,
    public: false,
    createdAt: addMinutes(baseTime, index * 12),
    updatedAt: addMinutes(baseTime, index * 12),
  }));

  const traces = EVALUATION_RUNS.flatMap((run) =>
    DEMO_CASES.map((demoCase, index) => {
      const timestamp = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 1 : 5),
      );
      return {
        id: traceId(demoCase, run.variant),
        timestamp,
        name: `${run.name} / ${demoCase.title}`,
        userId: demoCase.userId,
        metadata: {
          ...demoCase.metadata,
          运行名称: run.name,
          模型版本: run.variant,
          数据来源: demoCase.source,
        },
        release: RELEASE,
        version: run.variant,
        projectId: DEMO_PROJECT.id,
        public: false,
        bookmarked: run.variant === "v2" && index === 0,
        tags: ["中文示例", "二手集市", run.variant, demoCase.metadata.业务阶段],
        input: demoCase.input,
        output: {
          回复: getVariantOutput(demoCase, run.variant),
          版本: run.variant,
        },
        sessionId: demoCase.sessionId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }),
  );

  const observations = EVALUATION_RUNS.flatMap((run) =>
    DEMO_CASES.flatMap((demoCase, index) => {
      const startTime = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 1 : 5),
      );
      const endTime = addMinutes(startTime, 1);
      const prompt = getPromptForVariant(run.variant);
      const scores = getVariantScores(demoCase, run.variant);
      const usage = run.variant === "v1" ? 1380 : 1560;
      const output = getVariantOutput(demoCase, run.variant);

      return [
        {
          id: rootObservationId(demoCase, run.variant),
          traceId: traceId(demoCase, run.variant),
          projectId: DEMO_PROJECT.id,
          type: LegacyPrismaObservationType.SPAN,
          startTime,
          endTime,
          name: "客服请求处理",
          metadata: {
            场景: demoCase.input.场景,
            运行名称: run.name,
          },
          level: "DEFAULT" as const,
          statusMessage: "请求处理完成",
          version: run.variant,
          input: demoCase.input,
          output: { 回复质量: scores.replyQuality },
          createdAt: startTime,
          updatedAt: endTime,
        },
        {
          id: generationObservationId(demoCase, run.variant),
          traceId: traceId(demoCase, run.variant),
          projectId: DEMO_PROJECT.id,
          type: LegacyPrismaObservationType.GENERATION,
          startTime: addMinutes(startTime, 0.2),
          endTime,
          name: "中文客服助手生成",
          metadata: {
            提示词: prompt.name,
            运行名称: run.name,
            商品类目: demoCase.metadata.商品类目,
          },
          parentObservationId: rootObservationId(demoCase, run.variant),
          level: "DEFAULT" as const,
          statusMessage: "生成成功",
          version: run.variant,
          model: MODEL_NAME,
          internalModel: MODEL_NAME,
          internalModelId: DEMO_IDS.model,
          modelParameters: {
            temperature: run.variant === "v1" ? 0.4 : 0.2,
            max_tokens: DEFAULT_LLM_MODEL_PARAMS.max_tokens,
          },
          input: {
            messages: [
              {
                role: "user",
                content: demoCase.input.买家消息,
              },
            ],
          },
          output: {
            role: "assistant",
            content: output,
          },
          promptTokens: usage,
          completionTokens: run.variant === "v1" ? 128 : 180,
          totalTokens: usage + (run.variant === "v1" ? 128 : 180),
          unit: "TOKENS",
          inputCost: "0.0012",
          outputCost: "0.0008",
          totalCost: "0.0020",
          calculatedInputCost: "0.0012",
          calculatedOutputCost: "0.0008",
          calculatedTotalCost: "0.0020",
          completionStartTime: addMinutes(startTime, 0.4),
          promptId: prompt.id,
          createdAt: startTime,
          updatedAt: endTime,
        },
      ];
    }),
  );

  const scores = buildPrismaScores(baseTime);
  const jobExecutions = EVALUATION_RUNS.flatMap((run) =>
    DEMO_CASES.map((demoCase, index) => {
      const startTime = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 4 : 8),
      );
      return {
        id: evalExecutionId(demoCase, run.variant),
        projectId: DEMO_PROJECT.id,
        jobConfigurationId: DEMO_IDS.evalJobConfig,
        jobTemplateId: DEMO_IDS.evalTemplate,
        status: JobExecutionStatus.COMPLETED,
        startTime,
        endTime: addMinutes(startTime, 1),
        jobInputTraceId: traceId(demoCase, run.variant),
        jobInputTraceTimestamp: startTime,
        jobInputObservationId: generationObservationId(demoCase, run.variant),
        jobInputDatasetItemId: datasetItemId(demoCase),
        jobInputDatasetItemValidFrom: datasetItems[index]?.validFrom,
        jobOutputScoreId: scoreId(demoCase, run.variant, "quality"),
      };
    }),
  );

  await prisma.model.create({
    data: {
      id: DEMO_IDS.model,
      projectId: DEMO_PROJECT.id,
      modelName: MODEL_NAME,
      matchPattern: escapeRegExp(MODEL_NAME),
      startDate: baseTime,
      inputPrice: "0.000002",
      outputPrice: "0.000006",
      unit: "TOKENS",
      tokenizerId: "openai",
      tokenizerConfig: {
        tokenizer: "cl100k_base",
        note: "中文二手集市演示模型价格配置",
      },
    },
  });

  await prisma.promptProtectedLabels.create({
    data: {
      id: DEMO_IDS.promptProtectedLabel,
      projectId: DEMO_PROJECT.id,
      label: "production",
    },
  });

  await prisma.prompt.createMany({
    data: [
      {
        id: DEMO_IDS.promptStyle,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        prompt:
          "请使用自然、清爽、可信的中文表达。先回应买家关切，再给出明确下一步，避免夸大商品成色。",
        name: "中文二手集市-回复语气片段",
        version: 1,
        type: "text",
        labels: ["production", "latest"],
        tags: ["中文", "语气", "二手交易"],
        commitMessage: "初始化中文语气片段",
      },
      {
        id: DEMO_IDS.promptAssistantV1,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        prompt: [
          {
            role: "system",
            content: "你是二手交易平台客服助手，负责帮卖家回复买家。",
          },
          {
            role: "user",
            content:
              "场景：{{场景}}\n商品信息：{{商品}}\n买家消息：{{买家消息}}\n约束：{{卖家约束}}",
          },
        ],
        name: "中文二手集市-客服助手",
        version: 1,
        type: "chat",
        labels: [],
        tags: ["中文", "客服", "v1"],
        commitMessage: "初始化基线客服助手",
      },
      {
        id: DEMO_IDS.promptAssistantV2,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        prompt: [
          {
            role: "system",
            content:
              "你是二手交易平台客服助手。回复要真实、清晰、友好，优先保护交易安全，并严格遵守商品事实和卖家约束。",
          },
          {
            role: "user",
            content:
              "请基于以下信息生成中文回复。\n场景：{{场景}}\n商品：{{商品}}\n买家消息：{{买家消息}}\n卖家约束：{{卖家约束}}",
          },
        ],
        name: "中文二手集市-客服助手",
        version: 2,
        type: "chat",
        labels: ["production", "latest"],
        tags: ["中文", "客服", "v2"],
        commitMessage: "加强事实约束和交易安全提示",
      },
      {
        id: DEMO_IDS.promptSafety,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        prompt:
          "判断回复是否存在夸大成色、绕过平台担保、诱导线下付款、辱骂买家等风险。输出安全、需复核或拦截。",
        name: "中文二手集市-内容审核",
        version: 1,
        type: "text",
        labels: ["production", "latest"],
        tags: ["中文", "审核", "风控"],
        commitMessage: "初始化内容审核提示词",
      },
    ],
  });

  await prisma.promptDependency.create({
    data: {
      id: DEMO_IDS.promptDependency,
      projectId: DEMO_PROJECT.id,
      parentId: DEMO_IDS.promptAssistantV2,
      childName: "中文二手集市-回复语气片段",
      childLabel: "production",
    },
  });

  await prisma.scoreConfig.createMany({
    data: [
      {
        id: SCORE_CONFIGS.replyQuality.id,
        projectId: DEMO_PROJECT.id,
        name: SCORE_CONFIGS.replyQuality.name,
        dataType: ScoreConfigDataType.NUMERIC,
        minValue: 0,
        maxValue: 1,
        description: "衡量中文回复是否准确、自然、可执行。",
      },
      {
        id: SCORE_CONFIGS.dealIntent.id,
        projectId: DEMO_PROJECT.id,
        name: SCORE_CONFIGS.dealIntent.name,
        dataType: ScoreConfigDataType.CATEGORICAL,
        categories: [
          { label: "低", value: 0 },
          { label: "中", value: 0.5 },
          { label: "高", value: 1 },
        ],
        description: "买家继续沟通或成交的可能性。",
      },
      {
        id: SCORE_CONFIGS.contentRisk.id,
        projectId: DEMO_PROJECT.id,
        name: SCORE_CONFIGS.contentRisk.name,
        dataType: ScoreConfigDataType.CATEGORICAL,
        categories: [
          { label: "拦截", value: 0 },
          { label: "需复核", value: 0.5 },
          { label: "安全", value: 1 },
        ],
        description: "识别交易安全、夸大描述和线下付款风险。",
      },
      {
        id: SCORE_CONFIGS.manualAdvice.id,
        projectId: DEMO_PROJECT.id,
        name: SCORE_CONFIGS.manualAdvice.name,
        dataType: ScoreConfigDataType.TEXT,
        description: "标注员给出的中文改进建议。",
      },
    ],
  });

  await prisma.dataset.create({
    data: {
      id: DEMO_IDS.dataset,
      projectId: DEMO_PROJECT.id,
      name: "中文二手集市客服闭环集",
      description: "覆盖议价、安全面交、配送、售后和发布优化的中文评测数据集。",
      metadata: {
        seed: SEED_MARKER,
        语言: "中文",
        场景: "二手交易",
      },
      inputSchema: {
        type: "object",
        properties: {
          场景: {
            type: "string",
            description: "客服需要处理的交易场景。",
          },
          商品: {
            type: "string",
            description: "当前咨询对应的二手商品。",
          },
          买家消息: {
            type: "string",
            description: "买家发来的原始中文消息。",
          },
          卖家约束: {
            type: "string",
            description: "卖家希望客服回复时遵守的约束。",
          },
        },
        required: ["场景", "商品", "买家消息", "卖家约束"],
        additionalProperties: false,
      },
      expectedOutputSchema: {
        type: "object",
        properties: {
          回复要点: {
            type: "array",
            items: {
              type: "string",
            },
            description: "客服回复应覆盖的关键要点。",
          },
          建议语气: {
            type: "string",
            description: "适合该场景的中文沟通语气。",
          },
        },
        required: ["回复要点", "建议语气"],
        additionalProperties: false,
      },
    },
  });

  await prisma.datasetItem.createMany({
    data: datasetItems,
  });

  await prisma.datasetRuns.createMany({
    data: [
      ...EVALUATION_RUNS.map((run, index) => ({
        id: run.id,
        projectId: DEMO_PROJECT.id,
        datasetId: DEMO_IDS.dataset,
        name: run.name,
        description: run.description,
        metadata: run.metadata,
        createdAt: addMinutes(baseTime, index * 4),
        updatedAt: addMinutes(baseTime, index * 4),
      })),
      ...PROMPTFOO_RUNS.map((run, index) => ({
        id: run.id,
        projectId: DEMO_PROJECT.id,
        datasetId: DEMO_IDS.dataset,
        name: buildPromptfooRunName(run),
        description: run.description,
        metadata: buildPromptfooRunMetadata(run),
        createdAt: addMinutes(baseTime, 100 + index * 4),
        updatedAt: addMinutes(baseTime, 100 + index * 4),
      })),
    ],
  });

  await prisma.datasetRunItems.createMany({
    data: datasetRunItems,
  });

  await prisma.traceSession.createMany({
    data: traceSessions,
  });

  await prisma.legacyPrismaTrace.createMany({
    data: traces,
  });

  await prisma.legacyPrismaObservation.createMany({
    data: observations,
  });

  await prisma.annotationQueue.create({
    data: {
      id: DEMO_IDS.annotationQueue,
      projectId: DEMO_PROJECT.id,
      name: "中文交易回复人工复核",
      description: "复核中文客服回复的风险、语气和可执行建议。",
      scoreConfigIds: [
        SCORE_CONFIGS.contentRisk.id,
        SCORE_CONFIGS.manualAdvice.id,
      ],
    },
  });

  await prisma.annotationQueueAssignment.create({
    data: {
      id: DEMO_IDS.annotationAssignment,
      projectId: DEMO_PROJECT.id,
      queueId: DEMO_IDS.annotationQueue,
      userId: DEMO_USER.id,
    },
  });

  await prisma.annotationQueueItem.createMany({
    data: [
      {
        id: "cn-marketplace-annotation-aftersale",
        projectId: DEMO_PROJECT.id,
        queueId: DEMO_IDS.annotationQueue,
        objectId: traceId(DEMO_CASES[3], "v2"),
        objectType: "TRACE",
        status: "COMPLETED",
        annotatorUserId: DEMO_USER.id,
        completedAt: addMinutes(baseTime, 95),
      },
      {
        id: "cn-marketplace-annotation-pickup",
        projectId: DEMO_PROJECT.id,
        queueId: DEMO_IDS.annotationQueue,
        objectId: traceId(DEMO_CASES[1], "v2"),
        objectType: "TRACE",
        status: "PENDING",
      },
      {
        id: "cn-marketplace-annotation-listing",
        projectId: DEMO_PROJECT.id,
        queueId: DEMO_IDS.annotationQueue,
        objectId: traceId(DEMO_CASES[4], "v2"),
        objectType: "TRACE",
        status: "PENDING",
      },
    ],
  });

  await prisma.legacyPrismaScore.createMany({
    data: scores,
  });

  await prisma.evalTemplate.create({
    data: {
      id: DEMO_IDS.evalTemplate,
      projectId: DEMO_PROJECT.id,
      name: "中文客服回复质量评估",
      version: 1,
      prompt:
        "请评估中文二手交易客服回复。输入：{{input}} 期望输出：{{expectedOutput}} 实际输出：{{output}}。给出 0 到 1 的质量分和一句中文理由。",
      model: MODEL_NAME,
      provider: LLM_PROVIDER,
      modelParams: EVAL_LLM_MODEL_PARAMS,
      vars: ["input", "expectedOutput", "output"],
      outputDefinition: {
        score: "0 到 1 的数值，越高代表回复越自然、准确且安全",
        reasoning: "一句中文理由",
      },
    },
  });

  await prisma.jobConfiguration.create({
    data: {
      id: DEMO_IDS.evalJobConfig,
      projectId: DEMO_PROJECT.id,
      jobType: JobType.EVAL,
      status: JobConfigState.ACTIVE,
      evalTemplateId: DEMO_IDS.evalTemplate,
      scoreName: SCORE_CONFIGS.replyQuality.name,
      filter: [
        {
          type: "string",
          column: "Tags",
          operator: "contains",
          value: "中文示例",
        },
      ],
      variableMapping: [
        {
          langfuseObject: "dataset_item",
          selectedColumnId: "input",
          templateVariable: "input",
        },
        {
          langfuseObject: "dataset_item",
          selectedColumnId: "expectedOutput",
          templateVariable: "expectedOutput",
        },
        {
          langfuseObject: "generation",
          objectName: "中文客服助手生成",
          selectedColumnId: "output",
          templateVariable: "output",
        },
      ],
      targetObject: "experiment",
      sampling: 1,
      delay: 5_000,
      timeScope: ["NEW", "EXISTING"],
    },
  });

  await prisma.jobExecution.createMany({
    data: jobExecutions,
  });

  await prisma.comment.create({
    data: {
      id: "cn-marketplace-comment-aftersale",
      projectId: DEMO_PROJECT.id,
      objectType: "TRACE",
      objectId: traceId(DEMO_CASES[3], "v2"),
      content: "这条售后回复已经先共情再收集证据，可以作为优化版示例。",
      authorUserId: DEMO_USER.id,
    },
  });

  await prisma.commentReaction.create({
    data: {
      id: "cn-marketplace-comment-reaction-aftersale",
      projectId: DEMO_PROJECT.id,
      commentId: "cn-marketplace-comment-aftersale",
      userId: DEMO_USER.id,
      emoji: "赞",
    },
  });

  await prisma.llmSchema.create({
    data: {
      id: DEMO_IDS.llmSchema,
      projectId: DEMO_PROJECT.id,
      name: "生成中文客服回复",
      description: "约束中文二手交易客服助手的结构化输出。",
      schema: {
        type: "object",
        properties: {
          reply: {
            type: "string",
            description: "面向买家或卖家的中文回复",
          },
          riskLevel: {
            type: "string",
            enum: ["安全", "需复核", "拦截"],
          },
          nextAction: {
            type: "string",
            description: "建议的下一步操作",
          },
        },
        required: ["reply", "riskLevel", "nextAction"],
      },
    },
  });

  await prisma.llmTool.create({
    data: {
      id: DEMO_IDS.llmTool,
      projectId: DEMO_PROJECT.id,
      name: "检查交易安全风险",
      description: "检查回复中是否包含线下付款、夸大成色或不安全面交建议。",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "待检查的中文回复",
          },
          scenario: {
            type: "string",
            description: "交易场景",
          },
        },
        required: ["message", "scenario"],
      },
    },
  });

  await seedDashboard();
}

async function seedPromptfooReports() {
  console.log("写入 Promptfoo 矩阵报告到事件存储...");

  const storageClient = getS3EventStorageClient(
    env.LANGFUSE_S3_EVENT_UPLOAD_BUCKET,
  );
  const reportSummary = buildPromptfooReportSummary();

  await storageClient.uploadJson(
    buildPromptfooReportObjectKey(PROMPTFOO_REPORT_JSON_FILE_NAME),
    [reportSummary],
  );
  await storageClient.uploadFile({
    fileName: buildPromptfooReportObjectKey(PROMPTFOO_REPORT_HTML_FILE_NAME),
    fileType: "text/html; charset=utf-8",
    data: buildPromptfooReportHtml(reportSummary),
  });
}

function buildPromptfooReportSummary(): Record<string, unknown> {
  const promptResults = PROMPTFOO_RUNS.map((run) => {
    const scores = DEMO_CASES.map((demoCase) => ({
      datasetItemId: datasetItemId(demoCase),
      title: demoCase.title,
      score: getVariantScores(demoCase, run.variant).replyQuality,
      output: getVariantOutput(demoCase, run.variant),
      expectedOutput: demoCase.expectedOutput,
      traceId: traceId(demoCase, run.variant),
      observationId: generationObservationId(demoCase, run.variant),
    }));

    return {
      datasetRunId: run.id,
      datasetRunName: buildPromptfooRunName(run),
      prompt: getPromptForVariant(run.variant),
      provider: LLM_PROVIDER,
      model: MODEL_NAME,
      passRate:
        scores.filter((item) => item.score >= 0.8).length / scores.length,
      averageScore:
        scores.reduce((total, item) => total + item.score, 0) / scores.length,
      cases: scores,
    };
  });

  return {
    matrixRunId: PROMPTFOO_MATRIX_RUN_ID,
    matrixName: PROMPTFOO_MATRIX_NAME,
    projectId: DEMO_PROJECT.id,
    datasetId: DEMO_IDS.dataset,
    generatedAt: new Date().toISOString(),
    promptfooVersion: PROMPTFOO_VERSION,
    assertions: PROMPTFOO_ASSERTIONS.map((assertion) => ({ ...assertion })),
    summary: {
      totalCases: DEMO_CASES.length,
      totalRuns: PROMPTFOO_RUNS.length,
      totalCalls: DEMO_CASES.length * PROMPTFOO_RUNS.length,
      bestRun: DEMO_IDS.promptfooRunAssistantV2,
    },
    results: promptResults,
  };
}

function buildPromptfooReportHtml(summary: Record<string, unknown>): string {
  const results = Array.isArray(summary.results) ? summary.results : [];
  const rows = PROMPTFOO_RUNS.map((run) => {
    const averageScore =
      DEMO_CASES.reduce(
        (total, demoCase) =>
          total + getVariantScores(demoCase, run.variant).replyQuality,
        0,
      ) / DEMO_CASES.length;

    return `<tr><td>${escapeHtml(buildPromptfooRunName(run))}</td><td>${escapeHtml(
      MODEL_NAME,
    )}</td><td>${Math.round(averageScore * 100)}%</td><td>${DEMO_CASES.length}</td></tr>`;
  }).join("");

  const caseRows = DEMO_CASES.map((demoCase) => {
    const v1 = getVariantScores(demoCase, "v1").replyQuality;
    const v2 = getVariantScores(demoCase, "v2").replyQuality;
    return `<tr><td>${escapeHtml(demoCase.title)}</td><td>${escapeHtml(
      demoCase.input.场景,
    )}</td><td>${Math.round(v1 * 100)}%</td><td>${Math.round(
      v2 * 100,
    )}%</td></tr>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(PROMPTFOO_MATRIX_NAME)}</title>
  <style>
    body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f7f8fa; }
    main { max-width: 1080px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    h2 { margin: 28px 0 12px; font-size: 18px; }
    p { color: #4b5563; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th, td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { color: #374151; background: #f3f4f6; font-weight: 600; }
    .meta { color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(PROMPTFOO_MATRIX_NAME)}</h1>
    <p class="meta">Matrix Run ID: ${PROMPTFOO_MATRIX_RUN_ID} · Promptfoo ${PROMPTFOO_VERSION} · ${results.length} 组结果</p>
    <p>这是随中文示例项目初始化的 Promptfoo 报告，用于演示从数据集、提示词、模型配置、矩阵运行到报告下载的闭环。</p>
    <h2>运行概览</h2>
    <table>
      <thead><tr><th>Dataset Run</th><th>模型</th><th>平均回复质量</th><th>用例数</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>中文用例对比</h2>
    <table>
      <thead><tr><th>用例</th><th>场景</th><th>v1</th><th>v2</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function buildPrismaScores(baseTime: Date) {
  const runScores = EVALUATION_RUNS.flatMap((run) =>
    DEMO_CASES.flatMap((demoCase, index) => {
      const timestamp = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 4 : 8),
      );
      const scores = getVariantScores(demoCase, run.variant);
      const currentTraceId = traceId(demoCase, run.variant);
      const currentObservationId = generationObservationId(
        demoCase,
        run.variant,
      );

      return [
        {
          id: scoreId(demoCase, run.variant, "quality"),
          timestamp,
          projectId: DEMO_PROJECT.id,
          name: SCORE_CONFIGS.replyQuality.name,
          value: scores.replyQuality,
          source: LegacyPrismaScoreSource.EVAL,
          authorUserId: DEMO_USER.id,
          comment: `自动评估：${run.name} 在“${demoCase.title}”中的中文回复质量。`,
          traceId: currentTraceId,
          observationId: currentObservationId,
          configId: SCORE_CONFIGS.replyQuality.id,
          dataType: ScoreConfigDataType.NUMERIC,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: scoreId(demoCase, run.variant, "intent"),
          timestamp,
          projectId: DEMO_PROJECT.id,
          name: SCORE_CONFIGS.dealIntent.name,
          value: scores.dealIntentValue,
          source: LegacyPrismaScoreSource.API,
          authorUserId: DEMO_USER.id,
          comment: "基于回复清晰度、下一步引导和买家阻力估算。",
          traceId: currentTraceId,
          observationId: currentObservationId,
          configId: SCORE_CONFIGS.dealIntent.id,
          stringValue: scores.dealIntent,
          dataType: ScoreConfigDataType.CATEGORICAL,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: scoreId(demoCase, run.variant, "risk"),
          timestamp,
          projectId: DEMO_PROJECT.id,
          name: SCORE_CONFIGS.contentRisk.name,
          value: scores.contentRiskValue,
          source: LegacyPrismaScoreSource.API,
          authorUserId: DEMO_USER.id,
          comment: "自动风控评分，关注线下付款、夸大成色和攻击性表达。",
          traceId: currentTraceId,
          observationId: currentObservationId,
          configId: SCORE_CONFIGS.contentRisk.id,
          stringValue: scores.contentRisk,
          dataType: ScoreConfigDataType.CATEGORICAL,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];
    }),
  );

  const manualScores = DEMO_CASES.map((demoCase, index) => {
    const timestamp = addMinutes(baseTime, index * 12 + 10);
    return {
      id: scoreId(demoCase, "v2", "manual"),
      timestamp,
      projectId: DEMO_PROJECT.id,
      name: SCORE_CONFIGS.manualAdvice.name,
      value: 0,
      source: LegacyPrismaScoreSource.ANNOTATION,
      authorUserId: DEMO_USER.id,
      comment: "人工标注建议",
      traceId: traceId(demoCase, "v2"),
      observationId: generationObservationId(demoCase, "v2"),
      configId: SCORE_CONFIGS.manualAdvice.id,
      stringValue: demoCase.manualAdvice,
      queueId: DEMO_IDS.annotationQueue,
      dataType: ScoreConfigDataType.TEXT,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const promptfooScores = PROMPTFOO_RUNS.flatMap((run) =>
    DEMO_CASES.flatMap((demoCase, index) => {
      const timestamp = addMinutes(
        baseTime,
        index * 12 + (run.variant === "v1" ? 9.5 : 11.5),
      );
      const replyQuality = getVariantScores(demoCase, run.variant).replyQuality;
      const currentTraceId = traceId(demoCase, run.variant);

      return [
        {
          id: promptfooScoreId(demoCase, run, "pass"),
          timestamp,
          projectId: DEMO_PROJECT.id,
          name: "promptfoo/pass",
          value: replyQuality >= 0.8 ? 1 : 0,
          source: LegacyPrismaScoreSource.EVAL,
          authorUserId: DEMO_USER.id,
          comment: "Promptfoo 断言是否通过。",
          traceId: currentTraceId,
          observationId: null,
          configId: null,
          stringValue: replyQuality >= 0.8 ? "true" : "false",
          dataType: ScoreConfigDataType.BOOLEAN,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: promptfooScoreId(demoCase, run, "score"),
          timestamp,
          projectId: DEMO_PROJECT.id,
          name: "promptfoo/score",
          value: replyQuality,
          source: LegacyPrismaScoreSource.EVAL,
          authorUserId: DEMO_USER.id,
          comment: "Promptfoo 中文回复质量归一化分数。",
          traceId: currentTraceId,
          observationId: null,
          configId: null,
          stringValue: null,
          dataType: ScoreConfigDataType.NUMERIC,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];
    }),
  );

  return [...runScores, ...manualScores, ...promptfooScores];
}

async function seedDashboard() {
  await prisma.dashboardWidget.createMany({
    data: [
      {
        id: DEMO_IDS.dashboardWidgetVolume,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        updatedBy: DEMO_USER.id,
        name: "中文会话量趋势",
        description: "按客服运行版本统计中文二手交易 trace 数量。",
        view: DashboardWidgetViews.TRACES,
        dimensions: [{ field: "name" }],
        metrics: [{ measure: "count", agg: "count" }],
        filters: [],
        chartType: DashboardWidgetChartType.BAR_TIME_SERIES,
        chartConfig: {
          type: "BAR_TIME_SERIES",
        },
        minVersion: 1,
      },
      {
        id: DEMO_IDS.dashboardWidgetQuality,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        updatedBy: DEMO_USER.id,
        name: "回复质量均值",
        description: "按评分名称展示中文回复质量的平均水平。",
        view: DashboardWidgetViews.SCORES_NUMERIC,
        dimensions: [{ field: "name" }],
        metrics: [{ measure: "value", agg: "avg" }],
        filters: [],
        chartType: DashboardWidgetChartType.VERTICAL_BAR,
        chartConfig: {
          type: "VERTICAL_BAR",
          row_limit: 20,
        },
        minVersion: 1,
      },
      {
        id: DEMO_IDS.dashboardWidgetRisk,
        projectId: DEMO_PROJECT.id,
        createdBy: DEMO_USER.id,
        updatedBy: DEMO_USER.id,
        name: "内容风险分布",
        description: "展示安全、需复核、拦截等中文内容风险分布。",
        view: DashboardWidgetViews.SCORES_CATEGORICAL,
        dimensions: [{ field: "stringValue" }],
        metrics: [{ measure: "count", agg: "count" }],
        filters: [],
        chartType: DashboardWidgetChartType.PIE,
        chartConfig: {
          type: "PIE",
          row_limit: 20,
        },
        minVersion: 1,
      },
    ],
  });

  await prisma.dashboard.create({
    data: {
      id: DEMO_IDS.dashboard,
      projectId: DEMO_PROJECT.id,
      createdBy: DEMO_USER.id,
      updatedBy: DEMO_USER.id,
      name: "中文二手集市客服概览",
      description: "中文交易客服回复、实验表现和内容风险的闭环看板。",
      filters: [],
      definition: {
        widgets: [
          {
            type: "widget",
            id: "cn-marketplace-dashboard-placement-volume",
            widgetId: DEMO_IDS.dashboardWidgetVolume,
            x: 0,
            y: 0,
            x_size: 6,
            y_size: 5,
          },
          {
            type: "widget",
            id: "cn-marketplace-dashboard-placement-quality",
            widgetId: DEMO_IDS.dashboardWidgetQuality,
            x: 6,
            y: 0,
            x_size: 6,
            y_size: 5,
          },
          {
            type: "widget",
            id: "cn-marketplace-dashboard-placement-risk",
            widgetId: DEMO_IDS.dashboardWidgetRisk,
            x: 0,
            y: 5,
            x_size: 6,
            y_size: 5,
          },
        ],
      },
    },
  });
}

function buildClickHouseArtifacts(): SeededArtifacts {
  const baseTime = addMinutes(new Date(), -180);
  const artifacts: SeededArtifacts = {
    traces: [],
    observations: [],
    scores: [],
    datasetRunItems: [],
    events: [],
  };

  for (const [caseIndex, demoCase] of DEMO_CASES.entries()) {
    const datasetItemCreatedAt = addMinutes(baseTime, caseIndex * 12);

    for (const run of EVALUATION_RUNS) {
      const timestamp = addMinutes(
        baseTime,
        caseIndex * 12 + (run.variant === "v1" ? 1 : 5),
      );
      const endTime = addMinutes(timestamp, 1);
      const prompt = getPromptForVariant(run.variant);
      const scores = getVariantScores(demoCase, run.variant);
      const output = getVariantOutput(demoCase, run.variant);
      const currentTraceId = traceId(demoCase, run.variant);
      const currentRootObservationId = rootObservationId(demoCase, run.variant);
      const currentGenerationObservationId = generationObservationId(
        demoCase,
        run.variant,
      );

      artifacts.traces.push({
        id: currentTraceId,
        name: `${run.name} / ${demoCase.title}`,
        user_id: demoCase.userId,
        metadata: asStringMap({
          ...demoCase.metadata,
          运行名称: run.name,
          模型版本: run.variant,
          数据来源: demoCase.source,
        }),
        release: RELEASE,
        version: run.variant,
        project_id: DEMO_PROJECT.id,
        environment: ENVIRONMENT,
        public: false,
        bookmarked: run.variant === "v2" && caseIndex === 0,
        tags: ["中文示例", "二手集市", run.variant, demoCase.metadata.业务阶段],
        input: serializeJson(demoCase.input),
        output: serializeJson({
          回复: output,
          版本: run.variant,
        }),
        session_id: demoCase.sessionId,
        timestamp: toMs(timestamp),
        created_at: toMs(timestamp),
        updated_at: toMs(endTime),
        event_ts: toMs(endTime),
        is_deleted: 0,
      });

      artifacts.observations.push(
        buildObservationRecord({
          demoCase,
          variant: run.variant,
          id: currentRootObservationId,
          type: "SPAN",
          name: "客服请求处理",
          traceId: currentTraceId,
          parentObservationId: null,
          startTime: timestamp,
          endTime,
          input: demoCase.input,
          output: { 回复质量: scores.replyQuality },
          metadata: {
            场景: demoCase.input.场景,
            运行名称: run.name,
          },
        }),
        buildObservationRecord({
          demoCase,
          variant: run.variant,
          id: currentGenerationObservationId,
          type: "GENERATION",
          name: "中文客服助手生成",
          traceId: currentTraceId,
          parentObservationId: currentRootObservationId,
          startTime: addMinutes(timestamp, 0.2),
          endTime,
          input: {
            messages: [
              {
                role: "user",
                content: demoCase.input.买家消息,
              },
            ],
          },
          output: {
            role: "assistant",
            content: output,
          },
          metadata: {
            提示词: prompt.name,
            运行名称: run.name,
            商品类目: demoCase.metadata.商品类目,
          },
          prompt,
        }),
      );

      artifacts.datasetRunItems.push({
        id: datasetRunItemId(demoCase, run.variant),
        project_id: DEMO_PROJECT.id,
        trace_id: currentTraceId,
        observation_id: currentGenerationObservationId,
        dataset_id: DEMO_IDS.dataset,
        dataset_run_id: run.id,
        dataset_item_id: datasetItemId(demoCase),
        dataset_run_name: run.name,
        dataset_run_description: run.description,
        dataset_run_metadata: asStringMap(run.metadata),
        dataset_item_input: serializeJson(demoCase.input),
        dataset_item_expected_output: serializeJson(demoCase.expectedOutput),
        dataset_item_metadata: asStringMap({
          ...demoCase.metadata,
          用例标题: demoCase.title,
          数据来源: demoCase.source,
        }),
        dataset_run_created_at: toMs(
          addMinutes(baseTime, run.variant === "v1" ? 0 : 4),
        ),
        dataset_item_version: toMs(datasetItemCreatedAt),
        created_at: toMs(addMinutes(timestamp, 1)),
        updated_at: toMs(addMinutes(timestamp, 1)),
        event_ts: toMs(addMinutes(timestamp, 1)),
        is_deleted: 0,
        error: null,
      });

      artifacts.scores.push(
        buildScoreRecord({
          id: scoreId(demoCase, run.variant, "quality"),
          demoCase,
          variant: run.variant,
          name: SCORE_CONFIGS.replyQuality.name,
          value: scores.replyQuality,
          source: "EVAL",
          dataType: "NUMERIC",
          stringValue: null,
          configId: SCORE_CONFIGS.replyQuality.id,
          timestamp: addMinutes(timestamp, 3),
          comment: `自动评估：${run.name} 在“${demoCase.title}”中的中文回复质量。`,
        }),
        buildScoreRecord({
          id: scoreId(demoCase, run.variant, "intent"),
          demoCase,
          variant: run.variant,
          name: SCORE_CONFIGS.dealIntent.name,
          value: scores.dealIntentValue,
          source: "API",
          dataType: "CATEGORICAL",
          stringValue: scores.dealIntent,
          configId: SCORE_CONFIGS.dealIntent.id,
          timestamp: addMinutes(timestamp, 3),
          comment: "基于回复清晰度、下一步引导和买家阻力估算。",
        }),
        buildScoreRecord({
          id: scoreId(demoCase, run.variant, "risk"),
          demoCase,
          variant: run.variant,
          name: SCORE_CONFIGS.contentRisk.name,
          value: scores.contentRiskValue,
          source: "API",
          dataType: "CATEGORICAL",
          stringValue: scores.contentRisk,
          configId: SCORE_CONFIGS.contentRisk.id,
          timestamp: addMinutes(timestamp, 3),
          comment: "自动风控评分，关注线下付款、夸大成色和攻击性表达。",
        }),
      );

      artifacts.events.push(
        buildEventRecord({
          demoCase,
          run,
          spanId: currentRootObservationId,
          parentSpanId: null,
          traceId: currentTraceId,
          type: "SPAN",
          name: "客服请求处理",
          startTime: timestamp,
          endTime,
          input: demoCase.input,
          output: { 回复质量: scores.replyQuality },
          prompt: null,
        }),
        buildEventRecord({
          demoCase,
          run,
          spanId: currentGenerationObservationId,
          parentSpanId: currentRootObservationId,
          traceId: currentTraceId,
          type: "GENERATION",
          name: "中文客服助手生成",
          startTime: addMinutes(timestamp, 0.2),
          endTime,
          input: {
            messages: [
              {
                role: "user",
                content: demoCase.input.买家消息,
              },
            ],
          },
          output: {
            role: "assistant",
            content: output,
          },
          prompt,
        }),
      );
    }

    for (const [promptfooIndex, promptfooRun] of PROMPTFOO_RUNS.entries()) {
      const timestamp = addMinutes(
        baseTime,
        caseIndex * 12 + (promptfooRun.variant === "v1" ? 9 : 11),
      );
      const replyQuality = getVariantScores(
        demoCase,
        promptfooRun.variant,
      ).replyQuality;

      artifacts.datasetRunItems.push({
        id: promptfooDatasetRunItemId(demoCase, promptfooRun),
        project_id: DEMO_PROJECT.id,
        trace_id: traceId(demoCase, promptfooRun.variant),
        observation_id: generationObservationId(demoCase, promptfooRun.variant),
        dataset_id: DEMO_IDS.dataset,
        dataset_run_id: promptfooRun.id,
        dataset_item_id: datasetItemId(demoCase),
        dataset_run_name: buildPromptfooRunName(promptfooRun),
        dataset_run_description: promptfooRun.description,
        dataset_run_metadata: asStringMap(
          buildPromptfooRunMetadata(promptfooRun),
        ),
        dataset_item_input: serializeJson(demoCase.input),
        dataset_item_expected_output: serializeJson(demoCase.expectedOutput),
        dataset_item_metadata: asStringMap({
          ...demoCase.metadata,
          用例标题: demoCase.title,
          数据来源: demoCase.source,
        }),
        dataset_run_created_at: toMs(
          addMinutes(baseTime, 100 + promptfooIndex * 4),
        ),
        dataset_item_version: toMs(datasetItemCreatedAt),
        created_at: toMs(timestamp),
        updated_at: toMs(timestamp),
        event_ts: toMs(timestamp),
        is_deleted: 0,
        error: null,
      });

      artifacts.scores.push(
        buildPromptfooScoreRecord({
          id: promptfooScoreId(demoCase, promptfooRun, "pass"),
          demoCase,
          run: promptfooRun,
          name: "promptfoo/pass",
          value: replyQuality >= 0.8 ? 1 : 0,
          dataType: "BOOLEAN",
          stringValue: replyQuality >= 0.8 ? "true" : "false",
          timestamp: addMinutes(timestamp, 0.5),
          comment: "Promptfoo 断言是否通过。",
        }),
        buildPromptfooScoreRecord({
          id: promptfooScoreId(demoCase, promptfooRun, "score"),
          demoCase,
          run: promptfooRun,
          name: "promptfoo/score",
          value: replyQuality,
          dataType: "NUMERIC",
          stringValue: null,
          timestamp: addMinutes(timestamp, 0.5),
          comment: "Promptfoo 中文回复质量归一化分数。",
        }),
      );
    }

    artifacts.scores.push(
      buildScoreRecord({
        id: scoreId(demoCase, "v2", "manual"),
        demoCase,
        variant: "v2",
        name: SCORE_CONFIGS.manualAdvice.name,
        value: 0,
        source: "ANNOTATION",
        dataType: "TEXT",
        stringValue: demoCase.manualAdvice,
        configId: SCORE_CONFIGS.manualAdvice.id,
        timestamp: addMinutes(baseTime, caseIndex * 12 + 10),
        comment: "人工标注建议",
        queueId: DEMO_IDS.annotationQueue,
      }),
    );
  }

  return artifacts;
}

function buildObservationRecord(params: {
  demoCase: DemoCase;
  variant: RunVariant;
  id: string;
  type: string;
  name: string;
  traceId: string;
  parentObservationId: string | null;
  startTime: Date;
  endTime: Date;
  input: unknown;
  output: unknown;
  metadata: Record<string, string>;
  prompt?: { id: string; name: string; version: number } | null;
}): ObservationRecordInsertType {
  const inputTokens = params.variant === "v1" ? 1380 : 1560;
  const outputTokens = params.variant === "v1" ? 128 : 180;
  const prompt = params.prompt ?? null;

  return {
    id: params.id,
    trace_id: params.traceId,
    project_id: DEMO_PROJECT.id,
    type: params.type,
    parent_observation_id: params.parentObservationId,
    environment: ENVIRONMENT,
    name: params.name,
    metadata: asStringMap(params.metadata),
    level: "DEFAULT",
    status_message: "处理完成",
    version: params.variant,
    input: serializeJson(params.input),
    output: serializeJson(params.output),
    provided_model_name: params.type === "GENERATION" ? MODEL_NAME : null,
    internal_model_id: params.type === "GENERATION" ? DEMO_IDS.model : null,
    model_parameters:
      params.type === "GENERATION"
        ? serializeJson({
            temperature: params.variant === "v1" ? 0.4 : 0.2,
            max_tokens: 600,
          })
        : null,
    total_cost: params.type === "GENERATION" ? 0.002 : 0,
    usage_pricing_tier_id: null,
    usage_pricing_tier_name: null,
    prompt_id: prompt?.id ?? null,
    prompt_name: prompt?.name ?? null,
    prompt_version: prompt?.version ?? null,
    tool_definitions:
      params.type === "GENERATION"
        ? {
            检查交易安全风险: serializeJson({
              description: "检查中文回复中的交易安全风险",
            }),
          }
        : {},
    tool_calls: [],
    tool_call_names: [],
    is_deleted: 0,
    provided_usage_details:
      params.type === "GENERATION"
        ? {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          }
        : {},
    provided_cost_details:
      params.type === "GENERATION"
        ? { input: 0.0012, output: 0.0008, total: 0.002 }
        : {},
    usage_details:
      params.type === "GENERATION"
        ? {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          }
        : {},
    cost_details:
      params.type === "GENERATION"
        ? { input: 0.0012, output: 0.0008, total: 0.002 }
        : {},
    created_at: toMs(params.startTime),
    updated_at: toMs(params.endTime),
    start_time: toMs(params.startTime),
    end_time: toMs(params.endTime),
    completion_start_time:
      params.type === "GENERATION"
        ? toMs(addMinutes(params.startTime, 0.2))
        : null,
    event_ts: toMs(params.endTime),
  };
}

function buildScoreRecord(params: {
  id: string;
  demoCase: DemoCase;
  variant: RunVariant;
  name: string;
  value: number;
  source: "API" | "EVAL" | "ANNOTATION";
  dataType: "NUMERIC" | "CATEGORICAL" | "TEXT";
  stringValue: string | null;
  configId: string;
  timestamp: Date;
  comment: string;
  queueId?: string | null;
}): ScoreRecordInsertType {
  return {
    id: params.id,
    project_id: DEMO_PROJECT.id,
    trace_id: traceId(params.demoCase, params.variant),
    session_id: params.demoCase.sessionId,
    observation_id: generationObservationId(params.demoCase, params.variant),
    dataset_run_id:
      params.variant === "v1" ? DEMO_IDS.runBaseline : DEMO_IDS.runOptimized,
    environment: ENVIRONMENT,
    name: params.name,
    value: params.value,
    source: params.source,
    comment: params.comment,
    metadata: asStringMap({
      用例标题: params.demoCase.title,
      模型版本: params.variant,
    }),
    author_user_id: DEMO_USER.id,
    config_id: params.configId,
    data_type: params.dataType,
    string_value: params.stringValue,
    long_string_value:
      params.dataType === "TEXT" ? (params.stringValue ?? "") : "",
    queue_id: params.queueId ?? null,
    execution_trace_id: null,
    created_at: toMs(params.timestamp),
    updated_at: toMs(params.timestamp),
    timestamp: toMs(params.timestamp),
    event_ts: toMs(params.timestamp),
    is_deleted: 0,
  };
}

function buildPromptfooScoreRecord(params: {
  id: string;
  demoCase: DemoCase;
  run: PromptfooRun;
  name: "promptfoo/pass" | "promptfoo/score";
  value: number;
  dataType: "BOOLEAN" | "NUMERIC";
  stringValue: string | null;
  timestamp: Date;
  comment: string;
}): ScoreRecordInsertType {
  const prompt = getPromptForVariant(params.run.variant);

  return {
    id: params.id,
    project_id: DEMO_PROJECT.id,
    trace_id: traceId(params.demoCase, params.run.variant),
    session_id: params.demoCase.sessionId,
    observation_id: null,
    dataset_run_id: params.run.id,
    environment: "langfuse-prompt-experiment",
    name: params.name,
    value: params.value,
    source: "EVAL",
    comment: params.comment,
    metadata: asStringMap({
      promptfoo_matrix_run_id: PROMPTFOO_MATRIX_RUN_ID,
      promptfoo_provider_id: buildPromptfooProviderId(params.run.modelIndex),
      prompt_id: prompt.id,
      provider: LLM_PROVIDER,
      model: MODEL_NAME,
      dataset_run_id: params.run.id,
      dataset_item_id: datasetItemId(params.demoCase),
      dataset_run_item_id: promptfooDatasetRunItemId(
        params.demoCase,
        params.run,
      ),
    }),
    author_user_id: DEMO_USER.id,
    config_id: null,
    data_type: params.dataType,
    string_value: params.stringValue,
    long_string_value: "",
    queue_id: null,
    execution_trace_id: traceId(params.demoCase, params.run.variant),
    created_at: toMs(params.timestamp),
    updated_at: toMs(params.timestamp),
    timestamp: toMs(params.timestamp),
    event_ts: toMs(params.timestamp),
    is_deleted: 0,
  };
}

function buildEventRecord(params: {
  demoCase: DemoCase;
  run: (typeof EVALUATION_RUNS)[number];
  spanId: string;
  parentSpanId: string | null;
  traceId: string;
  type: string;
  name: string;
  startTime: Date;
  endTime: Date;
  input: unknown;
  output: unknown;
  prompt: { id: string; name: string; version: number } | null;
}): EventRecordInsertType {
  const metadata = metadataArrays({
    ...params.demoCase.metadata,
    运行名称: params.run.name,
    模型版本: params.run.variant,
    数据来源: params.demoCase.source,
  });
  const experimentMetadata = metadataArrays(params.run.metadata);
  const datasetItemMetadata = metadataArrays({
    ...params.demoCase.metadata,
    用例标题: params.demoCase.title,
    数据来源: params.demoCase.source,
  });
  const inputTokens = params.run.variant === "v1" ? 1380 : 1560;
  const outputTokens = params.run.variant === "v1" ? 128 : 180;

  return {
    org_id: DEMO_ORG.id,
    project_id: DEMO_PROJECT.id,
    trace_id: params.traceId,
    span_id: params.spanId,
    id: params.spanId,
    parent_span_id: params.parentSpanId,
    name: params.name,
    type: params.type,
    environment: ENVIRONMENT,
    version: params.run.variant,
    release: RELEASE,
    trace_name: `${params.run.name} / ${params.demoCase.title}`,
    user_id: params.demoCase.userId,
    session_id: params.demoCase.sessionId,
    tags: [
      "中文示例",
      "二手集市",
      params.run.variant,
      params.demoCase.metadata.业务阶段,
    ],
    bookmarked: params.run.variant === "v2" && params.demoCase.id === "price",
    public: false,
    level: "DEFAULT",
    status_message: "处理完成",
    prompt_id: params.prompt?.id ?? null,
    prompt_name: params.prompt?.name ?? null,
    prompt_version: params.prompt?.version ?? null,
    model_id: params.type === "GENERATION" ? DEMO_IDS.model : null,
    provided_model_name: params.type === "GENERATION" ? MODEL_NAME : null,
    model_parameters:
      params.type === "GENERATION"
        ? serializeJson({
            temperature: params.run.variant === "v1" ? 0.4 : 0.2,
            max_tokens: 600,
          })
        : null,
    provided_usage_details:
      params.type === "GENERATION"
        ? {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          }
        : {},
    usage_details:
      params.type === "GENERATION"
        ? {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          }
        : {},
    provided_cost_details:
      params.type === "GENERATION"
        ? { input: 0.0012, output: 0.0008, total: 0.002 }
        : {},
    cost_details:
      params.type === "GENERATION"
        ? { input: 0.0012, output: 0.0008, total: 0.002 }
        : {},
    usage_pricing_tier_id: null,
    usage_pricing_tier_name: null,
    tool_definitions:
      params.type === "GENERATION"
        ? {
            检查交易安全风险: serializeJson({
              description: "检查中文回复中的交易安全风险",
            }),
          }
        : {},
    tool_calls: [],
    tool_call_names: [],
    input: serializeJson(params.input),
    output: serializeJson(params.output),
    metadata_names: metadata.names,
    metadata_values: metadata.values,
    experiment_id: params.run.id,
    experiment_name: params.run.name,
    experiment_metadata_names: experimentMetadata.names,
    experiment_metadata_values: experimentMetadata.values,
    experiment_description: params.run.description,
    experiment_dataset_id: DEMO_IDS.dataset,
    experiment_item_id: datasetItemId(params.demoCase),
    experiment_item_version: null,
    experiment_item_expected_output: serializeJson(
      params.demoCase.expectedOutput,
    ),
    experiment_item_metadata_names: datasetItemMetadata.names,
    experiment_item_metadata_values: datasetItemMetadata.values,
    experiment_item_root_span_id: rootObservationId(
      params.demoCase,
      params.run.variant,
    ),
    source: "API",
    service_name: "cn-marketplace-demo",
    service_version: params.run.variant,
    scope_name: SCRIPT_PATH,
    scope_version: SEED_MARKER,
    telemetry_sdk_language: "typescript",
    telemetry_sdk_name: "langfuse-seed-script",
    telemetry_sdk_version: "1",
    blob_storage_file_path: "",
    event_bytes: Buffer.byteLength(serializeJson(params.output)),
    is_deleted: 0,
    start_time: toMicro(params.startTime),
    end_time: toMicro(params.endTime),
    completion_start_time:
      params.type === "GENERATION"
        ? toMicro(addMinutes(params.startTime, 0.2))
        : null,
    created_at: toMicro(params.startTime),
    updated_at: toMicro(params.endTime),
    event_ts: toMicro(params.endTime),
  };
}

async function seedClickHouseData(artifacts: SeededArtifacts) {
  console.log(
    "写入 ClickHouse 示例 traces、observations、scores、dataset run items 和 events...",
  );

  await Promise.all([
    createTracesCh(artifacts.traces),
    createObservationsCh(artifacts.observations),
    createScoresCh(artifacts.scores),
    createDatasetRunItemsCh(artifacts.datasetRunItems),
    createEventsCh(artifacts.events),
  ]);
}

async function waitForClickHouseProjectDataDeleted() {
  const tables = [
    "traces",
    "observations",
    "scores",
    "dataset_run_items_rmt",
    "events_full",
    "events_core",
  ];

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const counts = await Promise.all(
      tables.map(async (table) => ({
        table,
        count: await countClickHouseRows(table),
      })),
    );
    const remaining = counts.filter((item) => item.count > 0);

    if (remaining.length === 0) {
      return;
    }

    if (attempt === 20) {
      throw new Error(
        `ClickHouse 旧演示数据未清理完成：${remaining
          .map((item) => `${item.table}=${item.count}`)
          .join(", ")}`,
      );
    }

    await sleep(500);
  }
}

async function validateSeed() {
  const postgresCounts = {
    project: await prisma.project.count({
      where: { id: DEMO_PROJECT.id },
    }),
    prompts: await prisma.prompt.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    scoreConfigs: await prisma.scoreConfig.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    datasetItems: await prisma.datasetItem.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    datasetRuns: await prisma.datasetRuns.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    datasetRunItems: await prisma.datasetRunItems.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    llmApiKeys: await prisma.llmApiKeys.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    defaultLlmModels: await prisma.defaultLlmModel.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    traces: await prisma.legacyPrismaTrace.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    observations: await prisma.legacyPrismaObservation.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    scores: await prisma.legacyPrismaScore.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    jobExecutions: await prisma.jobExecution.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    annotationQueueItems: await prisma.annotationQueueItem.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
    dashboardWidgets: await prisma.dashboardWidget.count({
      where: { projectId: DEMO_PROJECT.id },
    }),
  };

  const clickhouseCounts = {
    traces: await countClickHouseRows("traces"),
    observations: await countClickHouseRows("observations"),
    scores: await countClickHouseRows("scores"),
    datasetRunItems: await countClickHouseRows("dataset_run_items_rmt"),
    eventsFull: await countClickHouseRows("events_full"),
    eventsCore: await countClickHouseRows("events_core"),
  };
  const duplicateTraceIds = await findDuplicateClickHouseTraceIds();
  const promptfooReport = await validatePromptfooReportFiles();

  assertCount("Postgres project", postgresCounts.project, 1);
  assertCount("Postgres prompts", postgresCounts.prompts, EXPECTED.prompts);
  assertCount(
    "Postgres score configs",
    postgresCounts.scoreConfigs,
    EXPECTED.scoreConfigs,
  );
  assertCount(
    "Postgres dataset items",
    postgresCounts.datasetItems,
    EXPECTED.datasetItems,
  );
  assertCount(
    "Postgres dataset runs",
    postgresCounts.datasetRuns,
    EXPECTED.datasetRuns,
  );
  assertCount(
    "Postgres dataset run items",
    postgresCounts.datasetRunItems,
    EXPECTED.datasetRunItems,
  );
  assertCount(
    "Postgres LLM API keys",
    postgresCounts.llmApiKeys,
    EXPECTED.llmApiKeys,
  );
  assertCount(
    "Postgres default LLM models",
    postgresCounts.defaultLlmModels,
    EXPECTED.defaultLlmModels,
  );
  assertCount("Postgres traces", postgresCounts.traces, EXPECTED.traces);
  assertCount(
    "Postgres observations",
    postgresCounts.observations,
    EXPECTED.observations,
  );
  assertCount("Postgres scores", postgresCounts.scores, EXPECTED.scores);
  assertCount(
    "Postgres job executions",
    postgresCounts.jobExecutions,
    EXPECTED.jobExecutions,
  );
  assertCount(
    "Postgres annotation queue items",
    postgresCounts.annotationQueueItems,
    EXPECTED.annotationQueueItems,
  );
  assertCount(
    "Postgres dashboard widgets",
    postgresCounts.dashboardWidgets,
    EXPECTED.dashboardWidgets,
  );

  assertCount("ClickHouse traces", clickhouseCounts.traces, EXPECTED.traces);
  assertCount(
    "ClickHouse observations",
    clickhouseCounts.observations,
    EXPECTED.observations,
  );
  assertCount("ClickHouse scores", clickhouseCounts.scores, EXPECTED.scores);
  assertCount(
    "ClickHouse dataset run items",
    clickhouseCounts.datasetRunItems,
    EXPECTED.datasetRunItems,
  );
  assertCount(
    "ClickHouse events_full",
    clickhouseCounts.eventsFull,
    EXPECTED.events,
  );
  assertCount(
    "ClickHouse events_core",
    clickhouseCounts.eventsCore,
    EXPECTED.events,
  );

  if (duplicateTraceIds.length > 0) {
    throw new Error(
      `ClickHouse traces 存在重复 ID：${duplicateTraceIds.join(", ")}`,
    );
  }

  return {
    seed: SEED_MARKER,
    project: {
      id: DEMO_PROJECT.id,
      name: DEMO_PROJECT.name,
    },
    postgresCounts,
    clickhouseCounts,
    promptfooReport,
  };
}

async function countClickHouseRows(table: string) {
  const rows = await queryClickhouse<CountRow>({
    query: `
      SELECT count() AS count
      FROM ${table}
      WHERE project_id = {projectId: String}
    `,
    params: { projectId: DEMO_PROJECT.id },
    tags: {
      feature: "cn-marketplace-seed",
      type: table,
      kind: "validate",
      projectId: DEMO_PROJECT.id,
    },
  });

  return Number(rows[0]?.count ?? 0);
}

async function validatePromptfooReportFiles() {
  const promptfooRuns = await prisma.datasetRuns.findMany({
    where: {
      projectId: DEMO_PROJECT.id,
      datasetId: DEMO_IDS.dataset,
      metadata: {
        path: ["promptfoo_matrix_run_id"],
        equals: PROMPTFOO_MATRIX_RUN_ID,
      },
    },
    select: {
      id: true,
      metadata: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  assertCount(
    "Postgres Promptfoo dataset runs",
    promptfooRuns.length,
    PROMPTFOO_RUNS.length,
  );

  for (const datasetRun of promptfooRuns) {
    const metadata = PromptfooDatasetRunMetadataSchema.parse(
      datasetRun.metadata,
    );

    if (metadata.status !== PromptfooMatrixRunStatus.Completed) {
      throw new Error(`Promptfoo run ${datasetRun.id} 不是完成状态。`);
    }

    if (
      metadata.promptfoo_report_object_key !==
        buildPromptfooReportObjectKey(PROMPTFOO_REPORT_JSON_FILE_NAME) ||
      metadata.promptfoo_report_html_object_key !==
        buildPromptfooReportObjectKey(PROMPTFOO_REPORT_HTML_FILE_NAME)
    ) {
      throw new Error(`Promptfoo run ${datasetRun.id} 报告路径不符合预期。`);
    }
  }

  const storageClient = getS3EventStorageClient(
    env.LANGFUSE_S3_EVENT_UPLOAD_BUCKET,
  );
  const reportJson = await storageClient.download(
    buildPromptfooReportObjectKey(PROMPTFOO_REPORT_JSON_FILE_NAME),
  );
  const reportHtml = await storageClient.download(
    buildPromptfooReportObjectKey(PROMPTFOO_REPORT_HTML_FILE_NAME),
  );
  const parsedReport = JSON.parse(reportJson) as unknown;

  if (!Array.isArray(parsedReport) || parsedReport.length === 0) {
    throw new Error("Promptfoo JSON 报告为空或格式不符合预期。");
  }

  if (!reportHtml.includes(PROMPTFOO_MATRIX_RUN_ID)) {
    throw new Error("Promptfoo HTML 报告缺少 matrix run id。");
  }

  return {
    matrixRunId: PROMPTFOO_MATRIX_RUN_ID,
    datasetRunIds: promptfooRuns.map((run) => run.id),
    reportObjectKey: buildPromptfooReportObjectKey(
      PROMPTFOO_REPORT_JSON_FILE_NAME,
    ),
    reportHtmlObjectKey: buildPromptfooReportObjectKey(
      PROMPTFOO_REPORT_HTML_FILE_NAME,
    ),
    reportJsonBytes: Buffer.byteLength(reportJson),
    reportHtmlBytes: Buffer.byteLength(reportHtml),
  };
}

async function findDuplicateClickHouseTraceIds() {
  const rows = await queryClickhouse<DuplicateIdRow>({
    query: `
      SELECT id, count() AS count
      FROM traces
      WHERE project_id = {projectId: String}
      GROUP BY id
      HAVING count() > 1
      ORDER BY id
      LIMIT 20
    `,
    params: { projectId: DEMO_PROJECT.id },
    tags: {
      feature: "cn-marketplace-seed",
      type: "traces",
      kind: "validate-duplicates",
      projectId: DEMO_PROJECT.id,
    },
  });

  return rows.map((row) => `${row.id}(${row.count})`);
}

function assertCount(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(
      `${label} 数量不符合预期：实际 ${actual}，预期 ${expected}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("中文二手集市演示数据初始化失败。");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
