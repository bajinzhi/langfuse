import { describe, expect, it, vi } from "vitest";
import type { EvaluateTestSuite } from "promptfoo";
import {
  disablePromptfooTelemetry,
  isPromptfooTelemetryUrl,
  PromptfooRunner,
} from "./promptfooRunner";

describe("PromptfooRunner", () => {
  it("forces Promptfoo telemetry off and blocks Promptfoo telemetry fetches", async () => {
    const previousTelemetryEnv = process.env.PROMPTFOO_DISABLE_TELEMETRY;
    const previousTemplateEnv = process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS;
    const previousFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    process.env.PROMPTFOO_DISABLE_TELEMETRY = "false";
    process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS = "false";
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      disablePromptfooTelemetry();

      expect(process.env.PROMPTFOO_DISABLE_TELEMETRY).toBe("true");
      expect(process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS).toBe("true");
      expect(isPromptfooTelemetryUrl("https://r.promptfoo.app/")).toBe(true);
      expect(isPromptfooTelemetryUrl("https://a.promptfoo.app/capture")).toBe(
        true,
      );
      expect(isPromptfooTelemetryUrl("https://api.promptfoo.dev/consent")).toBe(
        true,
      );
      expect(isPromptfooTelemetryUrl("https://example.com/")).toBe(false);

      const blockedResponse = await globalThis.fetch(
        "https://r.promptfoo.app/",
      );
      expect(blockedResponse.status).toBe(204);
      expect(fetchMock).not.toHaveBeenCalled();

      await globalThis.fetch("https://example.com/");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousTelemetryEnv === undefined) {
        delete process.env.PROMPTFOO_DISABLE_TELEMETRY;
      } else {
        process.env.PROMPTFOO_DISABLE_TELEMETRY = previousTelemetryEnv;
      }
      if (previousTemplateEnv === undefined) {
        delete process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS;
      } else {
        process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS = previousTemplateEnv;
      }
    }
  });

  it("generates the original Promptfoo HTML report when requested", async () => {
    const runner = new PromptfooRunner();
    const provider = {
      id: () => "test-provider",
      callApi: async () => ({ output: "Paris" }),
    };
    const testSuite: EvaluateTestSuite = {
      description: "Promptfoo HTML report test",
      prompts: ["What is the capital of {{country}}?"],
      providers: [provider],
      tests: [
        {
          vars: { country: "France" },
          assert: [{ type: "contains", value: "Paris" }],
        },
      ],
      writeLatestResults: false,
    };

    const result = await runner.evaluate({
      testSuite,
      options: {
        cache: false,
        showProgressBar: false,
        silent: true,
      },
      includeHtmlReport: true,
    });

    expect(result.summary.results).toHaveLength(1);
    expect(result.htmlReport).toContain("<!doctype html>");
    expect(result.htmlReport).toContain("Promptfoo HTML report test");
    expect(result.htmlReport).toContain("Paris");
  });
});
