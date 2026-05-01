import { ZodModelConfig } from "@langfuse/shared";
import type { MessageKey, MessageValues } from "@/src/features/i18n";
import z from "zod";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const createExperimentDataSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .min(1, t("experiments.validation.nameRequired"))
      .transform((str) => str.trim()),
    runName: z.string().min(1, t("experiments.validation.runNameRequired")),
    promptId: z.string().min(1, t("experiments.validation.promptRequired")),
    datasetId: z.string().min(1, t("experiments.validation.datasetRequired")),
    datasetVersion: z.coerce.date().optional(),
    description: z.string().max(1000).optional(),
    modelConfig: z.object({
      provider: z.string().min(1, t("experiments.validation.providerRequired")),
      model: z.string().min(1, t("experiments.validation.modelRequired")),
      modelParams: ZodModelConfig,
    }),
    structuredOutputSchema: z.record(z.string(), z.unknown()).optional(),
  });

export type CreateExperiment = z.infer<
  ReturnType<typeof createExperimentDataSchema>
>;
