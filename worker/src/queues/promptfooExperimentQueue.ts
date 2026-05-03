import type { Job } from "bullmq";
import {
  logger,
  QueueName,
  traceException,
  type TQueueJobTypes,
} from "@langfuse/shared/src/server";
import { PromptfooMatrixService } from "../features/promptfoo/promptfooMatrixService";

const promptfooMatrixService = new PromptfooMatrixService();

export const promptfooExperimentCreateQueueProcessor = async (
  job: Job<TQueueJobTypes[QueueName.PromptfooExperimentCreate]>,
) => {
  try {
    const result = await promptfooMatrixService.runMatrixJob({
      event: job.data.payload,
    });

    if (!result.success) {
      logger.warn("Promptfoo matrix evaluation completed with failure status", {
        projectId: job.data.payload.projectId,
        datasetId: job.data.payload.datasetId,
        matrixRunId: job.data.payload.matrixRunId,
        error: result.error,
        retryable: result.retryable,
      });

      if (result.retryable) {
        throw new Error(result.error ?? "Promptfoo matrix evaluation failed");
      }

      return true;
    }

    return true;
  } catch (error) {
    logger.error("Failed to process Promptfoo experiment create job", {
      error,
      projectId: job.data.payload.projectId,
      datasetId: job.data.payload.datasetId,
      matrixRunId: job.data.payload.matrixRunId,
    });
    traceException(error);
    throw error;
  }
};
