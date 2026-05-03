import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type {
  EvaluateOptions,
  EvaluateSummaryV2,
  EvaluateSummaryV3,
  EvaluateTestSuite,
} from "promptfoo";

export type PromptfooEvaluateSummary = EvaluateSummaryV3 | EvaluateSummaryV2;

const PROMPTFOO_TELEMETRY_FETCH_GUARD = Symbol.for(
  "langfuse.promptfoo.telemetry.fetchGuard",
);
const PROMPTFOO_TELEMETRY_URL_PREFIXES = [
  "https://r.promptfoo.app/",
  "https://a.promptfoo.app",
  "https://api.promptfoo.dev/consent",
];

type PromptfooTelemetryFetchGuardState = {
  guardedFetch: typeof fetch;
};

function getFetchUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return null;
}

export function isPromptfooTelemetryUrl(input: Parameters<typeof fetch>[0]) {
  const url = getFetchUrl(input);
  return Boolean(
    url &&
    PROMPTFOO_TELEMETRY_URL_PREFIXES.some((prefix) => url.startsWith(prefix)),
  );
}

export function disablePromptfooTelemetry() {
  process.env.PROMPTFOO_DISABLE_TELEMETRY = "true";
  process.env.PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS = "true";

  if (typeof globalThis.fetch !== "function") {
    return;
  }

  const globalWithGuard = globalThis as typeof globalThis & {
    [PROMPTFOO_TELEMETRY_FETCH_GUARD]?:
      | PromptfooTelemetryFetchGuardState
      | undefined;
  };
  const existingGuard = globalWithGuard[PROMPTFOO_TELEMETRY_FETCH_GUARD];
  if (existingGuard?.guardedFetch === globalThis.fetch) {
    return;
  }

  const fetchBeforeGuard = globalThis.fetch;
  const guardedFetch: typeof fetch = (async (input, init) => {
    if (isPromptfooTelemetryUrl(input)) {
      return new Response(null, { status: 204, statusText: "No Content" });
    }

    return fetchBeforeGuard(input, init);
  }) as typeof fetch;

  globalWithGuard[PROMPTFOO_TELEMETRY_FETCH_GUARD] = { guardedFetch };
  globalThis.fetch = guardedFetch;
}

export class PromptfooRunner {
  async evaluate(params: {
    testSuite: EvaluateTestSuite;
    options: EvaluateOptions;
    includeHtmlReport?: boolean;
  }): Promise<{
    eval: { toEvaluateSummary: () => Promise<PromptfooEvaluateSummary> };
    summary: PromptfooEvaluateSummary;
    htmlReport?: string;
  }> {
    let reportTempDir: string | undefined;

    try {
      let testSuite = params.testSuite;
      let htmlReportPath: string | undefined;

      if (params.includeHtmlReport) {
        reportTempDir = await mkdtemp(
          join(tmpdir(), "langfuse-promptfoo-report-"),
        );
        htmlReportPath = join(reportTempDir, "evaluate-report.html");
        testSuite = {
          ...params.testSuite,
          outputPath: htmlReportPath,
        };
      }

      disablePromptfooTelemetry();
      const promptfooModule = await import("promptfoo");
      const promptfoo = promptfooModule.default ?? promptfooModule;
      const evalResult = await promptfoo.evaluate(testSuite, params.options);
      const summary = await evalResult.toEvaluateSummary();
      const htmlReport = htmlReportPath
        ? await readFile(htmlReportPath, "utf-8")
        : undefined;

      return {
        eval: evalResult,
        summary,
        htmlReport,
      };
    } finally {
      if (reportTempDir) {
        await rm(reportTempDir, { recursive: true, force: true }).catch(
          () => undefined,
        );
      }
    }
  }
}
