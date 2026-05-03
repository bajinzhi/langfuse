import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetItemDomain } from "@langfuse/shared";
import { PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX } from "./constants";
import type { LangfusePromptForPromptfoo } from "./promptAdapter";
import {
  getRetryablePromptfooProviderFailure,
  LangfuseProviderAdapter,
  PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE,
  resolvePromptIndex,
} from "./providerAdapter";

const {
  mockFetchLLMCompletion,
  mockFetchValidModelConfig,
  mockProcessEventBatch,
  mockQueryClickhouse,
} = vi.hoisted(() => ({
  mockFetchLLMCompletion: vi.fn(),
  mockFetchValidModelConfig: vi.fn(),
  mockProcessEventBatch: vi.fn(),
  mockQueryClickhouse: vi.fn(),
}));

vi.mock("@langfuse/shared/src/server", async () => {
  const actual = await vi.importActual("@langfuse/shared/src/server");
  return {
    ...actual,
    DefaultEvalModelService: {
      fetchValidModelConfig: mockFetchValidModelConfig,
    },
    fetchLLMCompletion: mockFetchLLMCompletion,
    processEventBatch: mockProcessEventBatch,
    queryClickhouse: mockQueryClickhouse,
  };
});

const prompts: LangfusePromptForPromptfoo[] = [
  {
    id: "prompt-direct",
    name: "direct",
    version: 1,
    type: "text",
    prompt: "Direct {{country}}",
    variables: ["country"],
    placeholderNames: [],
  },
  {
    id: "prompt-strict",
    name: "strict",
    version: 1,
    type: "text",
    prompt: "Strict {{country}}",
    variables: ["country"],
    placeholderNames: [],
  },
];

const datasetItem = {
  id: "item-1",
  projectId: "project-1",
  datasetId: "dataset-1",
  input: { country: "France" },
  expectedOutput: "Paris",
  metadata: {},
  sourceTraceId: null,
  sourceObservationId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  status: "ACTIVE",
} as DatasetItemDomain;

const secondDatasetItem = {
  ...datasetItem,
  id: "item-2",
  input: { country: "Germany" },
  expectedOutput: "Berlin",
} as DatasetItemDomain;

const datasetRun = {
  id: "run-1",
  name: "run",
  description: null,
  metadata: {
    execution_mode: "promptfoo" as const,
    promptfoo_matrix_run_id: "matrix-1",
    prompt_id: "prompt-direct",
    prompt_name: "direct",
    prompt_version: 1,
    promptfoo_prompt_index: 0,
    promptfoo_provider_id: "langfuse:0:openai:gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    model_params: {},
    assertions: [],
    status: "RUNNING" as const,
  },
};

function createProviderAdapter(
  datasetItems: DatasetItemDomain[] = [datasetItem],
) {
  return new LangfuseProviderAdapter().createProviders({
    projectId: "project-1",
    datasetId: "dataset-1",
    prompts: [prompts[0]!],
    datasetRuns: [datasetRun],
    datasetItemsById: new Map(datasetItems.map((item) => [item.id, item])),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchLLMCompletion.mockResolvedValue("Fresh Paris");
  mockFetchValidModelConfig.mockResolvedValue({
    valid: true,
    config: {
      apiKey: {
        secretKey: "encrypted",
        adapter: "openai",
      },
      adapter: "openai",
    },
  });
  mockProcessEventBatch.mockResolvedValue({ successes: [], errors: [] });
});

describe("resolvePromptIndex", () => {
  it("uses a valid Promptfoo prompt index", () => {
    expect(
      resolvePromptIndex({
        contextPromptIdx: 1,
        renderedPrompt: "",
        prompts,
      }),
    ).toBe(1);
  });

  it("falls back to the rendered Langfuse prompt id marker", () => {
    expect(
      resolvePromptIndex({
        contextPromptIdx: undefined,
        renderedPrompt: [
          "Langfuse prompt: strict v1",
          `${PROMPTFOO_LANGFUSE_PROMPT_ID_PREFIX} prompt-strict`,
          "",
          "Strict {{country}}",
        ].join("\n"),
        prompts,
      }),
    ).toBe(1);
  });

  it("does not default unresolved prompts to the first prompt", () => {
    expect(
      resolvePromptIndex({
        contextPromptIdx: 99,
        renderedPrompt: "No prompt marker",
        prompts,
      }),
    ).toBeNull();
  });
});

describe("LangfuseProviderAdapter idempotency", () => {
  it("returns an existing Promptfoo cell output without creating another run item or LLM call", async () => {
    mockQueryClickhouse
      .mockResolvedValueOnce([{ id: "run-item-1", trace_id: "trace-1" }])
      .mockResolvedValueOnce([
        { output: "Paris", level: "DEFAULT", status_message: null },
      ]);

    const [provider] = await createProviderAdapter();
    const response = await provider!.callApi("Direct France", {
      promptIdx: 0,
      vars: {
        __langfuse_dataset_item_id: datasetItem.id,
      },
    });

    expect(response.output).toBe("Paris");
    expect(response.metadata).toMatchObject({
      runItemId: "run-item-1",
      traceId: "trace-1",
      datasetRunId: "run-1",
      datasetItemId: datasetItem.id,
    });
    expect(mockProcessEventBatch).not.toHaveBeenCalled();
    expect(mockFetchLLMCompletion).not.toHaveBeenCalled();
  });

  it("reuses an unfinished run item instead of creating a duplicate before calling the LLM", async () => {
    mockQueryClickhouse
      .mockResolvedValueOnce([{ id: "run-item-1", trace_id: "trace-1" }])
      .mockResolvedValueOnce([]);

    const [provider] = await createProviderAdapter();
    const response = await provider!.callApi("Direct France", {
      promptIdx: 0,
      vars: {
        __langfuse_dataset_item_id: datasetItem.id,
      },
    });

    expect(response.output).toBe("Fresh Paris");
    expect(response.metadata).toMatchObject({
      runItemId: "run-item-1",
      traceId: "trace-1",
    });
    expect(mockProcessEventBatch).not.toHaveBeenCalled();
    expect(mockFetchLLMCompletion).toHaveBeenCalledTimes(1);
  });

  it("caches validated model config across Promptfoo cells for the same run", async () => {
    mockQueryClickhouse.mockResolvedValue([]);

    const [provider] = await createProviderAdapter([
      datasetItem,
      secondDatasetItem,
    ]);
    const [firstResponse, secondResponse] = await Promise.all([
      provider!.callApi("Direct France", {
        promptIdx: 0,
        vars: {
          __langfuse_dataset_item_id: datasetItem.id,
        },
      }),
      provider!.callApi("Direct Germany", {
        promptIdx: 0,
        vars: {
          __langfuse_dataset_item_id: secondDatasetItem.id,
        },
      }),
    ]);

    expect(firstResponse.output).toBe("Fresh Paris");
    expect(secondResponse.output).toBe("Fresh Paris");
    expect(mockFetchValidModelConfig).toHaveBeenCalledTimes(1);
    expect(mockFetchLLMCompletion).toHaveBeenCalledTimes(2);
  });

  it("marks run item ingestion failures as retryable pre-model errors without calling the LLM", async () => {
    mockQueryClickhouse.mockResolvedValueOnce([]);
    mockProcessEventBatch.mockResolvedValueOnce({
      successes: [],
      errors: [
        {
          id: "run-item-1",
          status: 500,
          message: "Internal ingestion error",
        },
      ],
    });

    const [provider] = await createProviderAdapter();
    const response = await provider!.callApi("Direct France", {
      promptIdx: 0,
      vars: {
        __langfuse_dataset_item_id: datasetItem.id,
      },
    });

    expect(response.error).toContain(
      "Failed to create Promptfoo dataset run item",
    );
    expect(response.metadata).toMatchObject({
      retryableErrorSource: PROMPTFOO_RETRYABLE_PRE_MODEL_ERROR_SOURCE,
      retryableErrorMessage: response.error,
    });
    expect(mockFetchLLMCompletion).not.toHaveBeenCalled();
    expect(
      getRetryablePromptfooProviderFailure([
        { response } as Parameters<
          typeof getRetryablePromptfooProviderFailure
        >[0][number],
      ]),
    ).toBe(response.error);
  });
});
