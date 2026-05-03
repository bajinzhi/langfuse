import { z } from "zod";
import { ZodModelConfig } from "../../server/llm/types";

export const PROMPTFOO_MATRIX_CALL_LIMIT_DEFAULT = 1_000;
export const PROMPTFOO_MATRIX_CONCURRENCY_DEFAULT = 3;
export const PROMPTFOO_MATRIX_CONCURRENCY_MAX = 10;
export const PROMPTFOO_REPORT_JSON_FORMAT = "promptfoo-evaluate-summary-json";
export const PROMPTFOO_REPORT_HTML_FORMAT = "promptfoo-evaluate-report-html";

export const PromptfooAssertionType = {
  Equals: "equals",
  Contains: "contains",
  IContains: "icontains",
  Regex: "regex",
  IsJson: "is-json",
} as const;

export const PromptfooAssertionTypeSchema = z.enum(
  Object.values(PromptfooAssertionType),
);

export type PromptfooAssertionType =
  (typeof PromptfooAssertionType)[keyof typeof PromptfooAssertionType];

export const PromptfooAssertionSchema = z.object({
  type: PromptfooAssertionTypeSchema,
  value: z.string().optional(),
  metricName: z.string().optional(),
});

export type PromptfooAssertion = z.infer<typeof PromptfooAssertionSchema>;

export const PROMPTFOO_DATASET_ITEM_ID_VAR = "__langfuse_dataset_item_id";
export const PROMPTFOO_DATASET_ITEM_VERSION_VAR =
  "__langfuse_dataset_item_version";
export const PROMPTFOO_EXPECTED_OUTPUT_VAR = "expected_output";
export const PROMPTFOO_RESERVED_PROMPT_VARIABLES = [
  PROMPTFOO_EXPECTED_OUTPUT_VAR,
  PROMPTFOO_DATASET_ITEM_ID_VAR,
  PROMPTFOO_DATASET_ITEM_VERSION_VAR,
] as const;

const PROMPTFOO_EXPECTED_OUTPUT_TEMPLATE_REGEX = /{{\s*expected_output\s*}}/;
const PROMPTFOO_RESERVED_PROMPT_VARIABLE_SET = new Set<string>(
  PROMPTFOO_RESERVED_PROMPT_VARIABLES,
);

export function getPromptfooReservedPromptVariableConflicts(
  variables: string[],
) {
  return Array.from(
    new Set(
      variables.filter((variable) =>
        PROMPTFOO_RESERVED_PROMPT_VARIABLE_SET.has(variable),
      ),
    ),
  ).sort();
}

export function formatPromptfooReservedPromptVariableError(
  variables: string[],
) {
  return `Promptfoo matrix prompts cannot use reserved variables: ${variables.join(", ")}. Rename these prompt variables before running a matrix.`;
}

export function promptfooAssertionRequiresExpectedOutput(
  assertion: PromptfooAssertion,
) {
  if (assertion.type === PromptfooAssertionType.IsJson) {
    return false;
  }

  return (
    assertion.value == null ||
    PROMPTFOO_EXPECTED_OUTPUT_TEMPLATE_REGEX.test(assertion.value)
  );
}

export function promptfooAssertionsRequireExpectedOutput(
  assertions: PromptfooAssertion[],
) {
  return assertions.some(promptfooAssertionRequiresExpectedOutput);
}

export const PromptfooModelConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  modelParams: ZodModelConfig.optional().default({}),
});

export type PromptfooModelConfig = z.infer<typeof PromptfooModelConfigSchema>;

export const PromptfooMatrixRunStatus = {
  Pending: "PENDING",
  Running: "RUNNING",
  Completed: "COMPLETED",
  Failed: "FAILED",
} as const;

export const PromptfooMatrixRunStatusSchema = z.enum(
  Object.values(PromptfooMatrixRunStatus),
);

export type PromptfooMatrixRunStatus =
  (typeof PromptfooMatrixRunStatus)[keyof typeof PromptfooMatrixRunStatus];

export const PromptfooDatasetRunMetadataSchema = z.object({
  execution_mode: z.literal("promptfoo"),
  promptfoo_matrix_run_id: z.string(),
  promptfoo_report_object_key: z.string().optional(),
  promptfoo_report_format: z.literal(PROMPTFOO_REPORT_JSON_FORMAT).optional(),
  promptfoo_report_html_object_key: z.string().optional(),
  promptfoo_report_html_format: z
    .literal(PROMPTFOO_REPORT_HTML_FORMAT)
    .optional(),
  promptfoo_version: z.string().optional(),
  prompt_id: z.string(),
  prompt_name: z.string(),
  prompt_version: z.number(),
  promptfoo_prompt_index: z.number().int().nonnegative(),
  promptfoo_provider_id: z.string(),
  provider: z.string(),
  model: z.string(),
  model_params: ZodModelConfig.optional().default({}),
  assertions: z.array(PromptfooAssertionSchema),
  dataset_version: z.string().optional(),
  status: PromptfooMatrixRunStatusSchema,
  error: z.string().optional(),
});

export type PromptfooDatasetRunMetadata = z.infer<
  typeof PromptfooDatasetRunMetadataSchema
>;

export const PromptfooMatrixConfigSchema = z.object({
  projectId: z.string(),
  datasetId: z.string(),
  datasetVersion: z.coerce.date().optional(),
  promptIds: z.array(z.string()).min(1).max(20),
  modelConfigs: z.array(PromptfooModelConfigSchema).min(1).max(20),
  assertions: z.array(PromptfooAssertionSchema).min(1).max(20),
  concurrency: z.coerce
    .number()
    .int()
    .positive()
    .max(PROMPTFOO_MATRIX_CONCURRENCY_MAX)
    .default(PROMPTFOO_MATRIX_CONCURRENCY_DEFAULT),
});

export type PromptfooMatrixConfig = z.infer<typeof PromptfooMatrixConfigSchema>;

export const CreatePromptfooMatrixExperimentInputSchema =
  PromptfooMatrixConfigSchema.extend({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(1_000).optional(),
  });

export type CreatePromptfooMatrixExperimentInput = z.infer<
  typeof CreatePromptfooMatrixExperimentInputSchema
>;
