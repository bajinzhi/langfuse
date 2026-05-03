import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetItemDomain } from "@langfuse/shared";
import {
  PROMPTFOO_DATASET_ITEM_ID_VAR,
  PROMPTFOO_EXPECTED_OUTPUT_VAR,
} from "./constants";
import { LangfuseDatasetAdapter } from "./datasetAdapter";

const { mockGetDatasetItems } = vi.hoisted(() => ({
  mockGetDatasetItems: vi.fn(),
}));

vi.mock("@langfuse/shared/src/server", async () => {
  const actual = await vi.importActual("@langfuse/shared/src/server");
  return {
    ...actual,
    createDatasetItemFilterState: vi.fn((filterState) => filterState),
    getDatasetItems: mockGetDatasetItems,
  };
});

function createDatasetItem(
  overrides: Partial<DatasetItemDomain>,
): DatasetItemDomain {
  return {
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
    ...overrides,
  } as DatasetItemDomain;
}

describe("LangfuseDatasetAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reserved Promptfoo variables before expected output can override prompt inputs", async () => {
    await expect(
      new LangfuseDatasetAdapter().getTests({
        projectId: "project-1",
        datasetId: "dataset-1",
        variables: [PROMPTFOO_EXPECTED_OUTPUT_VAR],
        requiresExpectedOutput: true,
      }),
    ).rejects.toThrow(
      "Promptfoo matrix prompts cannot use reserved variables: expected_output",
    );
    expect(mockGetDatasetItems).not.toHaveBeenCalled();
  });

  it("excludes matching dataset items without expected output when assertions require it", async () => {
    mockGetDatasetItems
      .mockResolvedValueOnce([
        createDatasetItem({
          id: "item-without-output",
          expectedOutput: null,
        }),
        createDatasetItem({
          id: "item-with-output",
          expectedOutput: "Paris",
        }),
      ])
      .mockResolvedValueOnce([]);

    const tests = await new LangfuseDatasetAdapter().getTests({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: true,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0]?.datasetItem.id).toBe("item-with-output");
    expect(tests[0]?.vars).toMatchObject({
      country: "France",
      [PROMPTFOO_DATASET_ITEM_ID_VAR]: "item-with-output",
      [PROMPTFOO_EXPECTED_OUTPUT_VAR]: "Paris",
    });
  });

  it("keeps matching dataset items without expected output when assertions do not require it", async () => {
    mockGetDatasetItems
      .mockResolvedValueOnce([
        createDatasetItem({
          id: "item-without-output",
          expectedOutput: null,
        }),
        createDatasetItem({
          id: "item-with-output",
          expectedOutput: "Paris",
        }),
      ])
      .mockResolvedValueOnce([]);

    const tests = await new LangfuseDatasetAdapter().getTests({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
    });

    expect(tests).toHaveLength(2);
    expect(tests[0]?.datasetItem.id).toBe("item-without-output");
    expect(tests[0]?.vars).not.toHaveProperty(PROMPTFOO_EXPECTED_OUTPUT_VAR);
    expect(tests[1]?.vars).toHaveProperty(
      PROMPTFOO_EXPECTED_OUTPUT_VAR,
      "Paris",
    );
  });

  it("stops collecting tests once the caller's max test count is exceeded", async () => {
    mockGetDatasetItems.mockResolvedValue([
      createDatasetItem({
        id: "item-1",
        input: { country: "France" },
      }),
      createDatasetItem({
        id: "item-2",
        input: { country: "Germany" },
        expectedOutput: "Berlin",
      }),
    ]);

    const tests = await new LangfuseDatasetAdapter().getTests({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
      maxTests: 1,
    });

    expect(tests).toHaveLength(2);
    expect(mockGetDatasetItems).toHaveBeenCalledTimes(1);
    expect(mockGetDatasetItems).toHaveBeenCalledWith(
      expect.objectContaining({
        includeIO: true,
        limit: 100,
        page: 0,
      }),
    );
  });

  it("continues scanning after a short page from repository-level deduplication", async () => {
    mockGetDatasetItems
      .mockResolvedValueOnce([createDatasetItem({ id: "short-page-item" })])
      .mockResolvedValueOnce([
        createDatasetItem({
          id: "later-page-item",
          input: { country: "Germany" },
        }),
      ])
      .mockResolvedValueOnce([]);

    const tests = await new LangfuseDatasetAdapter().getTests({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
    });

    expect(tests.map((test) => test.datasetItem.id)).toEqual([
      "short-page-item",
      "later-page-item",
    ]);
    expect(mockGetDatasetItems).toHaveBeenCalledTimes(3);
    expect(mockGetDatasetItems).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 1 }),
    );
  });
});
