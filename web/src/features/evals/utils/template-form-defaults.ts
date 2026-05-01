import { ScoreDataTypeEnum } from "@langfuse/shared";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const numericOutputDefinitionDefaults = {
  scoreDataType: ScoreDataTypeEnum.NUMERIC,
  reasoningDescription: "Explain the assigned score in one concise sentence.",
  scoreDescription:
    "Return a numeric score between 0 and 1, where 0 is the worst outcome and 1 is the best outcome.",
  categories: [] as Array<{ value: string }>,
  shouldAllowMultipleMatches: false,
};

export const booleanOutputDefinitionDefaults = {
  scoreDataType: ScoreDataTypeEnum.BOOLEAN,
  reasoningDescription:
    "Explain briefly why the answer does or does not satisfy the criteria.",
  scoreDescription:
    "Return true if the answer satisfies the criteria, otherwise return false.",
  categories: [] as Array<{ value: string }>,
  shouldAllowMultipleMatches: false,
};

export const categoricalSingleOutputDefinitionDefaults = {
  scoreDataType: ScoreDataTypeEnum.CATEGORICAL,
  reasoningDescription: "Explain why the selected category is the best match.",
  scoreDescription: "Choose exactly one category from the provided list.",
  categories: [] as Array<{ value: string }>,
  shouldAllowMultipleMatches: false,
};

export const categoricalMultiOutputDefinitionDefaults = {
  scoreDataType: ScoreDataTypeEnum.CATEGORICAL,
  reasoningDescription: "Explain why each selected category applies.",
  scoreDescription:
    "Choose one or more categories from the provided list. Only return categories that clearly apply.",
  categories: [] as Array<{ value: string }>,
  shouldAllowMultipleMatches: true,
};

export const getDefaultOutputDefinitionFormValues = (params?: {
  scoreDataType?:
    | typeof ScoreDataTypeEnum.NUMERIC
    | typeof ScoreDataTypeEnum.BOOLEAN
    | typeof ScoreDataTypeEnum.CATEGORICAL;
  shouldAllowMultipleMatches?: boolean;
}) => {
  if (params?.scoreDataType === ScoreDataTypeEnum.CATEGORICAL) {
    return params.shouldAllowMultipleMatches
      ? categoricalMultiOutputDefinitionDefaults
      : categoricalSingleOutputDefinitionDefaults;
  }

  if (params?.scoreDataType === ScoreDataTypeEnum.BOOLEAN) {
    return booleanOutputDefinitionDefaults;
  }

  return numericOutputDefinitionDefaults;
};

const getDefaultDescriptionKeys = (params?: {
  scoreDataType?:
    | typeof ScoreDataTypeEnum.NUMERIC
    | typeof ScoreDataTypeEnum.BOOLEAN
    | typeof ScoreDataTypeEnum.CATEGORICAL;
  shouldAllowMultipleMatches?: boolean;
}): { reasoningDescription: MessageKey; scoreDescription: MessageKey } => {
  if (params?.scoreDataType === ScoreDataTypeEnum.CATEGORICAL) {
    return params.shouldAllowMultipleMatches
      ? {
          reasoningDescription:
            "evals.templateForm.defaults.categoricalMultiReasoning",
          scoreDescription: "evals.templateForm.defaults.categoricalMultiScore",
        }
      : {
          reasoningDescription:
            "evals.templateForm.defaults.categoricalSingleReasoning",
          scoreDescription:
            "evals.templateForm.defaults.categoricalSingleScore",
        };
  }

  if (params?.scoreDataType === ScoreDataTypeEnum.BOOLEAN) {
    return {
      reasoningDescription: "evals.templateForm.defaults.booleanReasoning",
      scoreDescription: "evals.templateForm.defaults.booleanScore",
    };
  }

  return {
    reasoningDescription: "evals.templateForm.defaults.numericReasoning",
    scoreDescription: "evals.templateForm.defaults.numericScore",
  };
};

export const getLocalizedDefaultOutputDefinitionFormValues = (
  params: Parameters<typeof getDefaultOutputDefinitionFormValues>[0],
  t: Translate,
) => {
  const defaults = getDefaultOutputDefinitionFormValues(params);
  const keys = getDefaultDescriptionKeys(params);

  return {
    ...defaults,
    reasoningDescription: t(keys.reasoningDescription),
    scoreDescription: t(keys.scoreDescription),
  };
};

const defaultReasoningDescriptions = new Set(
  [
    numericOutputDefinitionDefaults.reasoningDescription,
    booleanOutputDefinitionDefaults.reasoningDescription,
    categoricalSingleOutputDefinitionDefaults.reasoningDescription,
    categoricalMultiOutputDefinitionDefaults.reasoningDescription,
    "One sentence reasoning for the score",
  ].map((value) => value.trim()),
);

const defaultScoreDescriptions = new Set(
  [
    numericOutputDefinitionDefaults.scoreDescription,
    booleanOutputDefinitionDefaults.scoreDescription,
    categoricalSingleOutputDefinitionDefaults.scoreDescription,
    categoricalMultiOutputDefinitionDefaults.scoreDescription,
    "Score between 0 and 1. Score 0 if false or negative and 1 if true or positive.",
  ].map((value) => value.trim()),
);

export const shouldReplaceDefaultOutputDefinitionField = (params: {
  currentValue?: string;
  field: "reasoningDescription" | "scoreDescription";
  knownDefaults?: string[];
}) => {
  const trimmedValue = params.currentValue?.trim() ?? "";

  if (!trimmedValue) {
    return true;
  }

  return params.field === "reasoningDescription"
    ? defaultReasoningDescriptions.has(trimmedValue) ||
        Boolean(params.knownDefaults?.includes(trimmedValue))
    : defaultScoreDescriptions.has(trimmedValue) ||
        Boolean(params.knownDefaults?.includes(trimmedValue));
};
