import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatasetItemDomain } from "@langfuse/shared";

const { mockGetDatasetItems, mockGetDatasetItemsCount } = vi.hoisted(() => ({
  mockGetDatasetItems: vi.fn(),
  mockGetDatasetItemsCount: vi.fn(),
}));

vi.mock("@langfuse/shared/src/server", async () => {
  const actual = await vi.importActual("@langfuse/shared/src/server");
  return {
    ...actual,
    createDatasetItemFilterState: vi.fn((filterState: unknown) => filterState),
    getDatasetItems: mockGetDatasetItems,
    getDatasetItemsCount: mockGetDatasetItemsCount,
  };
});

import {
  buildRunName,
  getPromptfooMatrixDatasetItemCounts,
} from "./promptfoo-service";

const prompt = {
  id: "prompt-1",
  name: "capital-answer",
  version: 3,
  variables: ["country"],
};

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildRunName", () => {
  it("keeps run names unique for duplicate provider/model configurations", () => {
    const firstRunName = buildRunName({
      matrixName: "Capital matrix",
      matrixRunId: "12345678-1234-5678-9234-123456789abc",
      prompt,
      promptIndex: 0,
      modelIndex: 0,
      provider: "openai",
      model: "gpt-4o-mini",
    });
    const secondRunName = buildRunName({
      matrixName: "Capital matrix",
      matrixRunId: "12345678-1234-5678-9234-123456789abc",
      prompt,
      promptIndex: 0,
      modelIndex: 1,
      provider: "openai",
      model: "gpt-4o-mini",
    });

    expect(firstRunName).not.toBe(secondRunName);
    expect(firstRunName).toContain("model 1: openai/gpt-4o-mini");
    expect(secondRunName).toContain("model 2: openai/gpt-4o-mini");
  });
});

describe("getPromptfooMatrixDatasetItemCounts", () => {
  it("does not fetch item IO when the active dataset is empty", async () => {
    mockGetDatasetItemsCount.mockResolvedValue(0);

    const counts = await getPromptfooMatrixDatasetItemCounts({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
      maxValidItems: 1,
    });

    expect(counts).toEqual({
      totalItems: 0,
      validItems: 0,
      exceedsMaxValidItems: false,
    });
    expect(mockGetDatasetItems).not.toHaveBeenCalled();
  });

  it("fetches dataset items in bounded pages and stops once max valid items is exceeded", async () => {
    mockGetDatasetItemsCount.mockResolvedValue(3);
    mockGetDatasetItems.mockResolvedValueOnce([
      createDatasetItem({ id: "item-1" }),
      createDatasetItem({ id: "item-2", input: { country: "Germany" } }),
    ]);

    const counts = await getPromptfooMatrixDatasetItemCounts({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
      maxValidItems: 1,
    });

    expect(counts).toEqual({
      totalItems: 3,
      validItems: 2,
      exceedsMaxValidItems: true,
    });
    expect(mockGetDatasetItems).toHaveBeenCalledTimes(1);
    expect(mockGetDatasetItems).toHaveBeenCalledWith(
      expect.objectContaining({
        includeIO: true,
        limit: 100,
        page: 0,
      }),
    );
  });

  it("counts valid items exactly when the limit is not exceeded", async () => {
    mockGetDatasetItemsCount.mockResolvedValue(2);
    mockGetDatasetItems
      .mockResolvedValueOnce([
        createDatasetItem({ id: "matching-item" }),
        createDatasetItem({
          id: "missing-expected-output",
          expectedOutput: null,
        }),
      ])
      .mockResolvedValueOnce([]);

    const counts = await getPromptfooMatrixDatasetItemCounts({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: true,
      maxValidItems: 10,
    });

    expect(counts).toEqual({
      totalItems: 2,
      validItems: 1,
      exceedsMaxValidItems: false,
    });
  });

  it("continues counting after a short page from repository-level deduplication", async () => {
    mockGetDatasetItemsCount.mockResolvedValue(2);
    mockGetDatasetItems
      .mockResolvedValueOnce([createDatasetItem({ id: "short-page-item" })])
      .mockResolvedValueOnce([
        createDatasetItem({
          id: "later-page-item",
          input: { country: "Germany" },
        }),
      ])
      .mockResolvedValueOnce([]);

    const counts = await getPromptfooMatrixDatasetItemCounts({
      projectId: "project-1",
      datasetId: "dataset-1",
      variables: ["country"],
      requiresExpectedOutput: false,
      maxValidItems: 10,
    });

    expect(counts).toEqual({
      totalItems: 2,
      validItems: 2,
      exceedsMaxValidItems: false,
    });
    expect(mockGetDatasetItems).toHaveBeenCalledTimes(3);
    expect(mockGetDatasetItems).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 1 }),
    );
  });
});
