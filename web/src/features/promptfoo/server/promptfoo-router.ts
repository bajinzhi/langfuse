import { z } from "zod/v4";
import {
  CreatePromptfooMatrixExperimentInputSchema,
  PromptfooMatrixConfigSchema,
  PromptfooMatrixRunStatusSchema,
} from "@langfuse/shared";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  PromptfooMatrixValidationMessageKey,
  promptfooService,
} from "./promptfoo-service";
import { TRPCError } from "@trpc/server";

const PromptfooMatrixValidationMessageKeySchema = z.enum(
  Object.values(PromptfooMatrixValidationMessageKey),
);
const PromptfooMatrixValidationMessageValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const PromptfooConfigResponse = z.discriminatedUnion("isValid", [
  z.object({
    isValid: z.literal(true),
    totalItems: z.number(),
    validItems: z.number(),
    totalCalls: z.number(),
    variables: z.array(z.string()),
  }),
  z.object({
    isValid: z.literal(false),
    messageKey: PromptfooMatrixValidationMessageKeySchema,
    values: PromptfooMatrixValidationMessageValuesSchema.optional(),
  }),
]);

const PromptfooReportInput = z
  .object({
    projectId: z.string(),
    matrixRunId: z.string().optional(),
    datasetRunId: z.string().optional(),
  })
  .refine((input) => input.matrixRunId || input.datasetRunId, {
    message: "matrixRunId or datasetRunId is required",
  });

export const promptfooRouter = createTRPCRouter({
  validateConfig: protectedProjectProcedure
    .input(PromptfooMatrixConfigSchema)
    .output(PromptfooConfigResponse)
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "promptExperiments:CUD",
      });

      return promptfooService.validateMatrixConfig(input);
    }),

  createMatrixExperiment: protectedProjectProcedure
    .input(CreatePromptfooMatrixExperimentInputSchema)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "promptExperiments:CUD",
      });

      try {
        return await promptfooService.createMatrixExperiment(input);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Promptfoo matrix experiment could not be created.",
        });
      }
    }),

  reportMetadata: protectedProjectProcedure
    .input(PromptfooReportInput)
    .output(
      z
        .object({
          datasetRunId: z.string(),
          matrixRunId: z.string(),
          status: PromptfooMatrixRunStatusSchema,
          reportObjectKey: z.string().nullable(),
          reportHtmlObjectKey: z.string().nullable(),
          reportFormat: z.string().nullable(),
          reportHtmlFormat: z.string().nullable(),
          promptfooVersion: z.string().nullable(),
          error: z.string().nullable(),
        })
        .nullable(),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "promptExperiments:read",
      });

      return promptfooService.getReportMetadata(input);
    }),
});
