import { describe, expect, it } from "vitest";

import { buildRunName } from "./promptfoo-service";

const prompt = {
  id: "prompt-1",
  name: "capital-answer",
  version: 3,
  variables: ["country"],
};

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
