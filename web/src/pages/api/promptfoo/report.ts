import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "@langfuse/shared/src/server";

import { hasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { promptfooService } from "@/src/features/promptfoo/server/promptfoo-service";
import { getServerAuthSession } from "@/src/server/auth";

type ErrorResponse = {
  message: string;
};

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ReportFormat = "html" | "json";

function getReportFormat(value: string | string[] | undefined): ReportFormat {
  const format = getQueryValue(value);
  return format === "html" ? "html" : "json";
}

function isSupportedReportFormat(value: string | string[] | undefined) {
  const format = getQueryValue(value);
  return !format || format === "html" || format === "json";
}

function getReportFileName(matrixRunId: string, format: ReportFormat) {
  return `promptfoo-report-${matrixRunId}.${format}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | ErrorResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerAuthSession({ req, res });
  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const projectId = getQueryValue(req.query.projectId);
  const datasetRunId = getQueryValue(req.query.datasetRunId);
  const matrixRunId = getQueryValue(req.query.matrixRunId);
  const format = getReportFormat(req.query.format);

  if (!projectId || (!datasetRunId && !matrixRunId)) {
    return res.status(400).json({
      message: "projectId and one of datasetRunId or matrixRunId are required",
    });
  }
  if (!isSupportedReportFormat(req.query.format)) {
    return res.status(400).json({ message: "Unsupported report format" });
  }

  if (
    !hasProjectAccess({
      session,
      projectId,
      scope: "promptExperiments:read",
    })
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    if (format === "html") {
      const report = await promptfooService.getReportHtml({
        projectId,
        datasetRunId,
        matrixRunId,
      });

      if (!report) {
        return res.status(404).json({ message: "Promptfoo report not found" });
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${getReportFileName(report.metadata.matrixRunId, format)}"`,
      );
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      );

      return res.status(200).send(report.reportHtml);
    }

    const report = await promptfooService.getReportJson({
      projectId,
      datasetRunId,
      matrixRunId,
    });

    if (!report) {
      return res.status(404).json({ message: "Promptfoo report not found" });
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${getReportFileName(report.metadata.matrixRunId, format)}"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(report.reportJson);
  } catch (error) {
    logger.error("Failed to open Promptfoo report", {
      error: error instanceof Error ? error.message : String(error),
      projectId,
      datasetRunId,
      matrixRunId,
    });

    return res.status(500).json({ message: "Failed to open Promptfoo report" });
  }
}
