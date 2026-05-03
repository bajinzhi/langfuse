import { Queue } from "bullmq";
import { logger } from "../logger";
import { QueueName, TQueueJobTypes } from "../queues";
import {
  createNewRedisInstance,
  getQueuePrefix,
  redisQueueRetryOptions,
} from "./redis";

export class PromptfooExperimentCreateQueue {
  private static instance: Queue<
    TQueueJobTypes[QueueName.PromptfooExperimentCreate]
  > | null = null;

  public static getInstance(): Queue<
    TQueueJobTypes[QueueName.PromptfooExperimentCreate]
  > | null {
    if (PromptfooExperimentCreateQueue.instance) {
      return PromptfooExperimentCreateQueue.instance;
    }

    const newRedis = createNewRedisInstance({
      enableOfflineQueue: false,
      ...redisQueueRetryOptions,
    });

    PromptfooExperimentCreateQueue.instance = newRedis
      ? new Queue<TQueueJobTypes[QueueName.PromptfooExperimentCreate]>(
          QueueName.PromptfooExperimentCreate,
          {
            connection: newRedis,
            prefix: getQueuePrefix(QueueName.PromptfooExperimentCreate),
            defaultJobOptions: {
              removeOnComplete: true,
              removeOnFail: 10_000,
              // The processor only rethrows failures that happen before any
              // Promptfoo provider/model calls can run.
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 10_000,
              },
            },
          },
        )
      : null;

    PromptfooExperimentCreateQueue.instance?.on("error", (err) => {
      logger.error("PromptfooExperimentCreateQueue error", err);
    });

    return PromptfooExperimentCreateQueue.instance;
  }
}
