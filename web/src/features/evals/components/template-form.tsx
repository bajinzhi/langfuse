import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { api } from "@/src/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBooleanEvalOutputDefinition,
  createCategoricalEvalOutputDefinition,
  createNumericEvalOutputDefinition,
  EvalOutputDataTypeSchema,
  getCategoricalCategoryRuleViolations,
  MinimumCategoricalCategoryCount,
  type PersistedEvalOutputDefinition,
  PersistedEvalOutputDefinitionSchema,
  ScoreDataTypeEnum,
  extractVariables,
  getIsCharOrUnderscore,
  resolvePersistedEvalOutputDefinition,
} from "@langfuse/shared";
import router from "next/router";
import { type EvalTemplate } from "@langfuse/shared";
import { ModelParameters } from "@/src/components/ModelParameters";
import { type ModelParams, ZodModelConfig } from "@langfuse/shared";
import { PromptVariableListPreview } from "@/src/features/prompts/components/PromptVariableListPreview";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { getFinalModelParams } from "@/src/utils/getFinalModelParams";
import { useModelParams } from "@/src/features/playground/page/hooks/useModelParams";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { EvalReferencedEvaluators } from "@/src/features/evals/types";
import {
  getDefaultOutputDefinitionFormValues,
  getLocalizedDefaultOutputDefinitionFormValues,
  shouldReplaceDefaultOutputDefinitionField,
} from "@/src/features/evals/utils/template-form-defaults";
import { CodeMirrorEditor } from "@/src/components/editor";
import { Card, CardContent } from "@/src/components/ui/card";
import { type RouterInput } from "@/src/utils/types";
import { useEvaluationModel } from "@/src/features/evals/hooks/useEvaluationModel";
import { Checkbox } from "@/src/components/ui/checkbox";
import { ManageDefaultEvalModel } from "@/src/features/evals/components/manage-default-eval-model";
import { DialogFooter, DialogBody } from "@/src/components/ui/dialog";
import { AlertCircle, PlusIcon, Trash } from "lucide-react";
import { useValidateCustomModel } from "@/src/features/evals/hooks/useValidateCustomModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { useI18n } from "@/src/features/i18n";

type PartialEvalTemplate = Omit<
  EvalTemplate,
  "id" | "version" | "createdAt" | "updatedAt"
> & { id?: string };

export const EvalTemplateForm = (props: {
  projectId: string;
  useDialog: boolean;
  existingEvalTemplate?: PartialEvalTemplate;
  onFormSuccess?: (template?: EvalTemplate) => void;
  onBeforeSubmit?: (
    template: RouterInput["evals"]["createTemplate"],
  ) => boolean;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  preventRedirect?: boolean;
  cloneSourceId?: string | null;
}) => {
  return (
    <div className="max-w-6xl">
      <InnerEvalTemplateForm
        key={props.existingEvalTemplate?.id ?? "new"}
        {...props}
        existingEvalTemplateId={props.existingEvalTemplate?.id}
        existingEvalTemplateName={props.existingEvalTemplate?.name}
        cloneSourceId={props.cloneSourceId}
        onBeforeSubmit={props.onBeforeSubmit}
        preFilledFormValues={
          // if a langfuse template is selected, use that, else use the existing template
          // no langfuse template is selected if there is already an existing template
          props.existingEvalTemplate
            ? {
                name: props.existingEvalTemplate.name,
                prompt: props.existingEvalTemplate.prompt,
                vars: props.existingEvalTemplate.vars,
                outputDefinition: props.existingEvalTemplate
                  .outputDefinition as PersistedEvalOutputDefinition,
                selectedModel: props.existingEvalTemplate.provider
                  ? {
                      provider: props.existingEvalTemplate.provider as string,
                      model: props.existingEvalTemplate.model as string,
                      modelParams: props.existingEvalTemplate
                        .modelParams as ModelParams & {
                        maxTemperature: number;
                      },
                    }
                  : undefined,
              }
            : undefined
        }
      />
    </div>
  );
};

type TemplateFormValidationMessages = {
  categoriesUnique: string;
  enterCategoryValue: string;
  enterName: string;
  enterPrompt: string;
  enterReasoningFunction: string;
  enterScoreFunction: string;
  minimumCategories: string;
  selectModel: string;
  selectProvider: string;
  variableRequired: string;
  variablesLettersUnderscores: string;
};

const createSelectedModelSchema = (messages: TemplateFormValidationMessages) =>
  z.object({
    provider: z.string().min(1, messages.selectProvider),
    model: z.string().min(1, messages.selectModel),
    modelParams: ZodModelConfig,
  });

const createCategoricalOptionSchema = (
  messages: TemplateFormValidationMessages,
) =>
  z.object({
    value: z.string().trim().min(1, messages.enterCategoryValue),
  });

const createFormSchema = (messages: TemplateFormValidationMessages) =>
  z
    .object({
      name: z.string().min(1, messages.enterName),
      prompt: z
        .string()
        .min(1, messages.enterPrompt)
        .refine((val) => {
          const variables = extractVariables(val);
          const matches = variables.map((variable) => {
            // check regex here
            if (variable.match(/^[A-Za-z_]+$/)) {
              return true;
            }
            return false;
          });
          return !matches.includes(false);
        }, messages.variablesLettersUnderscores),

      variables: z.array(z.string().min(1, messages.variableRequired)),
      scoreDataType: EvalOutputDataTypeSchema.default(
        ScoreDataTypeEnum.NUMERIC,
      ),
      scoreDescription: z.string().min(1, messages.enterScoreFunction),
      reasoningDescription: z.string().min(1, messages.enterReasoningFunction),
      categories: z.array(createCategoricalOptionSchema(messages)).default([]),
      shouldAllowMultipleMatches: z.boolean().default(false),
      referencedEvaluators: z
        .enum(EvalReferencedEvaluators)
        .optional()
        .default(EvalReferencedEvaluators.PERSIST),
      shouldUseDefaultModel: z.boolean().default(true),
    })
    .superRefine((value, ctx) => {
      if (value.scoreDataType !== ScoreDataTypeEnum.CATEGORICAL) {
        return;
      }

      getCategoricalCategoryRuleViolations(
        value.categories.map((category) => category.value),
      ).forEach((violation) => {
        switch (violation.type) {
          case "minimum_count":
            ctx.addIssue({
              code: "custom",
              message: messages.minimumCategories,
              path: ["categories"],
            });
            return;
          case "duplicate_value":
            ctx.addIssue({
              code: "custom",
              message: messages.categoriesUnique,
              path: ["categories", violation.index, "value"],
            });
            return;
        }
      });
    });

type TemplateFormValues = z.infer<ReturnType<typeof createFormSchema>>;

const toOutputDefinitionFormValues = (
  outputDefinition?: PersistedEvalOutputDefinition,
) => {
  if (!outputDefinition) {
    return getDefaultOutputDefinitionFormValues();
  }

  const resolvedOutputDefinition = resolvePersistedEvalOutputDefinition(
    PersistedEvalOutputDefinitionSchema.parse(outputDefinition),
  );

  return {
    scoreDataType: resolvedOutputDefinition.dataType,
    reasoningDescription: resolvedOutputDefinition.reasoningDescription,
    scoreDescription: resolvedOutputDefinition.scoreDescription,
    shouldAllowMultipleMatches:
      resolvedOutputDefinition.dataType === ScoreDataTypeEnum.CATEGORICAL
        ? resolvedOutputDefinition.shouldAllowMultipleMatches
        : false,
    categories:
      resolvedOutputDefinition.dataType === ScoreDataTypeEnum.CATEGORICAL
        ? resolvedOutputDefinition.categories.map((category) => ({
            value: category,
          }))
        : [],
  };
};

export type EvalTemplateFormPreFill = {
  name: string;
  prompt: string;
  vars: string[];
  outputDefinition: PersistedEvalOutputDefinition;
  selectedModel?: {
    provider: string;
    model: string;
    modelParams: ModelParams & {
      maxTemperature: number;
    };
  };
};

export const InnerEvalTemplateForm = (props: {
  projectId: string;
  useDialog: boolean;
  // pre-filled values from langfuse-defined template or template from db
  preFilledFormValues?: EvalTemplateFormPreFill;
  // template to be updated
  existingEvalTemplateId?: string;
  existingEvalTemplateName?: string;
  onFormSuccess?: (template?: EvalTemplate) => void;
  onBeforeSubmit?: (template: any) => boolean;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  preventRedirect?: boolean;
  cloneSourceId?: string | null;
}) => {
  const capture = usePostHogClientCapture();
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const validationMessages = useMemo(
    () => ({
      categoriesUnique: t("evals.templateForm.validation.categoriesUnique"),
      enterCategoryValue: t("evals.templateForm.validation.enterCategoryValue"),
      enterName: t("evals.templateForm.validation.enterName"),
      enterPrompt: t("evals.templateForm.validation.enterPrompt"),
      enterReasoningFunction: t(
        "evals.templateForm.validation.enterReasoningFunction",
      ),
      enterScoreFunction: t("evals.templateForm.validation.enterScoreFunction"),
      minimumCategories: t("evals.templateForm.validation.minimumCategories", {
        count: MinimumCategoricalCategoryCount,
      }),
      selectModel: t("evals.templateForm.validation.selectModel"),
      selectProvider: t("evals.templateForm.validation.selectProvider"),
      variableRequired: t("evals.templateForm.validation.variableRequired"),
      variablesLettersUnderscores: t(
        "evals.templateForm.validation.variablesLettersUnderscores",
      ),
    }),
    [t],
  );
  const formSchema = useMemo(
    () => createFormSchema(validationMessages),
    [validationMessages],
  );
  const selectedModelSchema = useMemo(
    () => createSelectedModelSchema(validationMessages),
    [validationMessages],
  );

  // Determine if we should use default model or custom model
  // If existing template has no provider, it was using default model
  const isExistingUsingDefault = props.preFilledFormValues?.selectedModel
    ? false
    : true;

  const { data: defaultModel } = api.defaultLlmModel.fetchDefaultModel.useQuery(
    { projectId: props.projectId },
    { enabled: !!props.projectId },
  );

  // updates the model params based on the pre-filled data
  // either form update or from langfuse-generated template
  const {
    modelParams,
    setModelParams,
    updateModelParamValue,
    setModelParamEnabled,
    availableModels,
    providerModelCombinations,
    availableProviders,
  } = useModelParams();

  useEvaluationModel(
    props.projectId,
    setModelParams,
    props.preFilledFormValues?.selectedModel,
  );

  const { isCustomModelValid } = useValidateCustomModel(
    availableProviders,
    props.preFilledFormValues?.selectedModel,
  );

  const outputDefinitionFormValues = props.preFilledFormValues?.outputDefinition
    ? toOutputDefinitionFormValues(props.preFilledFormValues.outputDefinition)
    : getLocalizedDefaultOutputDefinitionFormValues(undefined, t);
  const localizedDefaultOutputDefinitions = useMemo(
    () => [
      getLocalizedDefaultOutputDefinitionFormValues(
        { scoreDataType: ScoreDataTypeEnum.NUMERIC },
        t,
      ),
      getLocalizedDefaultOutputDefinitionFormValues(
        { scoreDataType: ScoreDataTypeEnum.BOOLEAN },
        t,
      ),
      getLocalizedDefaultOutputDefinitionFormValues(
        {
          scoreDataType: ScoreDataTypeEnum.CATEGORICAL,
          shouldAllowMultipleMatches: false,
        },
        t,
      ),
      getLocalizedDefaultOutputDefinitionFormValues(
        {
          scoreDataType: ScoreDataTypeEnum.CATEGORICAL,
          shouldAllowMultipleMatches: true,
        },
        t,
      ),
    ],
    [t],
  );

  // updates the form based on the pre-filled data
  // either form update or from langfuse-generated template
  const form = useForm({
    resolver: zodResolver(formSchema),
    disabled: !props.isEditing,
    defaultValues: {
      name:
        props.existingEvalTemplateName ?? props.preFilledFormValues?.name ?? "",
      prompt: props.preFilledFormValues?.prompt ?? undefined,
      variables: props.preFilledFormValues?.vars ?? [],
      scoreDataType: outputDefinitionFormValues.scoreDataType,
      reasoningDescription: outputDefinitionFormValues.reasoningDescription,
      scoreDescription: outputDefinitionFormValues.scoreDescription,
      categories: outputDefinitionFormValues.categories,
      shouldAllowMultipleMatches:
        outputDefinitionFormValues.shouldAllowMultipleMatches,
      shouldUseDefaultModel: isExistingUsingDefault,
    },
  });

  const {
    fields: categoryFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const useDefaultModel = form.watch("shouldUseDefaultModel");
  const scoreDataType = form.watch("scoreDataType");
  const isCategoricalOutput = scoreDataType === ScoreDataTypeEnum.CATEGORICAL;
  const isBooleanOutput = scoreDataType === ScoreDataTypeEnum.BOOLEAN;
  const shouldAllowMultipleMatches = form.watch("shouldAllowMultipleMatches");
  const categoriesError = form.formState.errors.categories;
  const categoriesErrorMessage =
    typeof categoriesError?.message === "string"
      ? categoriesError.message
      : typeof categoriesError?.root?.message === "string"
        ? categoriesError.root.message
        : undefined;

  const applyDefaultOutputDefinitionCopy = (params: {
    scoreDataType:
      | typeof ScoreDataTypeEnum.NUMERIC
      | typeof ScoreDataTypeEnum.BOOLEAN
      | typeof ScoreDataTypeEnum.CATEGORICAL;
    shouldAllowMultipleMatches: boolean;
  }) => {
    const defaults = getLocalizedDefaultOutputDefinitionFormValues(params, t);

    if (
      shouldReplaceDefaultOutputDefinitionField({
        currentValue: form.getValues("reasoningDescription"),
        field: "reasoningDescription",
        knownDefaults: localizedDefaultOutputDefinitions.map(
          (defaultValues) => defaultValues.reasoningDescription,
        ),
      })
    ) {
      form.setValue("reasoningDescription", defaults.reasoningDescription);
    }

    if (
      shouldReplaceDefaultOutputDefinitionField({
        currentValue: form.getValues("scoreDescription"),
        field: "scoreDescription",
        knownDefaults: localizedDefaultOutputDefinitions.map(
          (defaultValues) => defaultValues.scoreDescription,
        ),
      })
    ) {
      form.setValue("scoreDescription", defaults.scoreDescription);
    }
  };

  const extractedVariables = form.watch("prompt")
    ? extractVariables(form.watch("prompt")).filter(getIsCharOrUnderscore)
    : undefined;

  const utils = api.useUtils();
  const createEvalTemplateMutation = api.evals.createTemplate.useMutation({
    onSuccess: () => {
      utils.models.invalidate();
      if (
        form.getValues("referencedEvaluators") ===
          EvalReferencedEvaluators.UPDATE &&
        props.existingEvalTemplateId
      ) {
        showSuccessToast({
          title: t("evals.templateForm.updatedReferencedTitle"),
          description: t("evals.templateForm.updatedReferencedDescription"),
        });
      }
    },
    onError: (error) => setFormError(error.message),
  });

  const evaluatorsByTemplateNameQuery =
    api.evals.jobConfigsByTemplateName.useQuery(
      {
        projectId: props.projectId,
        evalTemplateName: props.existingEvalTemplateName as string,
      },
      {
        enabled: !!props.existingEvalTemplateName,
      },
    );

  useEffect(() => {
    if (evaluatorsByTemplateNameQuery.data) {
      form.setValue(
        "referencedEvaluators",
        Boolean(evaluatorsByTemplateNameQuery.data.evaluators.length)
          ? EvalReferencedEvaluators.UPDATE
          : EvalReferencedEvaluators.PERSIST,
      );
    }
  }, [evaluatorsByTemplateNameQuery.data, form]);

  function onSubmit(values: TemplateFormValues) {
    capture(
      props.isEditing
        ? "eval_templates:update_form_submit"
        : "eval_templates:new_form_submit",
    );

    const outputDefinition =
      values.scoreDataType === ScoreDataTypeEnum.CATEGORICAL
        ? createCategoricalEvalOutputDefinition({
            scoreDescription: values.scoreDescription,
            reasoningDescription: values.reasoningDescription,
            categories: values.categories.map((category) => category.value),
            shouldAllowMultipleMatches: values.shouldAllowMultipleMatches,
          })
        : values.scoreDataType === ScoreDataTypeEnum.BOOLEAN
          ? createBooleanEvalOutputDefinition({
              scoreDescription: values.scoreDescription,
              reasoningDescription: values.reasoningDescription,
            })
          : createNumericEvalOutputDefinition({
              scoreDescription: values.scoreDescription,
              reasoningDescription: values.reasoningDescription,
            });

    const evalTemplate = {
      name: values.name,
      projectId: props.projectId,
      prompt: values.prompt,
      // Only include model details if not using default model
      provider: values.shouldUseDefaultModel
        ? undefined
        : modelParams.provider.value,
      model: values.shouldUseDefaultModel ? undefined : modelParams.model.value,
      modelParams: values.shouldUseDefaultModel
        ? undefined
        : getFinalModelParams(modelParams),
      vars: extractedVariables ?? [],
      outputDefinition,
      referencedEvaluators: values.referencedEvaluators,
      sourceTemplateId: props.cloneSourceId ?? undefined,
    };

    // Only validate model if not using default
    if (!values.shouldUseDefaultModel) {
      const parsedModel = selectedModelSchema.safeParse({
        provider: evalTemplate.provider,
        model: evalTemplate.model,
        modelParams: evalTemplate.modelParams,
      });

      if (!parsedModel.success) {
        setFormError(
          `${parsedModel.error.issues[0].path}: ${parsedModel.error.issues[0].message}`,
        );
        return;
      }
    } else {
      if (!defaultModel) {
        setFormError(t("evals.templateForm.noDefaultModelError"));
        return;
      }
    }

    // Check if we need to perform any pre-submission validation or confirmation
    if (props.onBeforeSubmit && !props.onBeforeSubmit(evalTemplate)) {
      return; // Stop submission - the parent will handle it
    }

    createEvalTemplateMutation
      .mutateAsync(evalTemplate)
      .then((res) => {
        props.onFormSuccess?.(res);
        form.reset();
        props.setIsEditing?.(false);
        if (props.preventRedirect) {
          return;
        }
        void router.push(
          `/project/${props.projectId}/evals/templates/${res.id}`,
        );
      })
      .catch((error) => {
        if ("message" in error && typeof error.message === "string") {
          setFormError(error.message as string);
          return;
        } else {
          setFormError(JSON.stringify(error));
          console.error(error);
        }
      });
  }

  const formBody = (
    <>
      {!props.existingEvalTemplateId ? (
        <>
          <div className="col-span-1 row-span-1 lg:col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <>
                  <FormItem>
                    <FormLabel>{t("evals.templateForm.name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          "evals.templateForm.templateNamePlaceholder",
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </>
              )}
            />
          </div>
          <div className="col-span-1 row-span-1 lg:col-span-0"></div>
        </>
      ) : undefined}

      {/* Model Selection Section */}
      <Card>
        <CardContent>
          <p className="my-2 font-semibold">
            {t("experiments.promptModel.model")}
          </p>
          <FormField
            control={form.control}
            name="shouldUseDefaultModel"
            render={({ field }) => (
              <FormItem className="mt-3 flex flex-row items-center space-y-0 space-x-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!props.isEditing}
                  />
                </FormControl>
                <div className="space-y-0 leading-none">
                  <FormLabel>
                    {t("evals.templateForm.useDefaultModel")}
                  </FormLabel>
                  <FormDescription className="text-xs">
                    <ManageDefaultEvalModel
                      projectId={props.projectId}
                      variant="color-coded"
                      setUpMessage={
                        <>
                          {t("evals.defaultModel.setupMessage")}{" "}
                          <a
                            href="https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge#how-llm-as-a-judge-works"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {t("common.learnMore")}
                          </a>
                        </>
                      }
                      className="text-sm font-normal"
                    />
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          {/* Only show model parameters if using custom model */}
          {!useDefaultModel &&
            (!props.isEditing && !isCustomModelValid ? (
              <div className="text-destructive mt-2 flex items-center space-x-1 text-sm">
                <AlertCircle className="h-4 w-4" />
                <p>
                  {t("evals.templateForm.missingApiKeyForProvider", {
                    provider: modelParams.provider.value,
                  })}
                </p>
              </div>
            ) : (
              <ModelParameters
                customHeader={
                  <p className="text-sm leading-none font-medium">
                    {t("evals.templateForm.customModelConfig")}
                  </p>
                }
                {...{
                  modelParams,
                  availableModels,
                  providerModelCombinations,
                  availableProviders,
                  updateModelParamValue: updateModelParamValue,
                  setModelParamEnabled,
                  modelParamsDescription: t(
                    "evals.defaultModel.functionCallingHint",
                  ),
                }}
                formDisabled={!props.isEditing}
              />
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="my-2 font-semibold">{t("prompts.prompt")}</p>
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <>
                  <FormItem>
                    <FormLabel>
                      {t("evals.templateForm.evaluationPrompt")}
                    </FormLabel>
                    <FormDescription>
                      {t("evals.templateForm.evaluationPromptDescription", {
                        input: "{{input}}",
                      })}
                    </FormDescription>
                    <FormControl>
                      <CodeMirrorEditor
                        value={field.value}
                        onChange={field.onChange}
                        editable={props.isEditing}
                        mode="prompt"
                        minHeight={200}
                        maxHeight="50dvh"
                      />
                    </FormControl>
                    <FormMessage />
                    <PromptVariableListPreview
                      variables={extractedVariables ?? []}
                    />
                  </FormItem>
                </>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="scoreDataType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("evals.templateForm.scoreType")}</FormLabel>
                <FormDescription>
                  {t("evals.templateForm.scoreTypeDescription")}
                </FormDescription>
                <Select
                  value={field.value}
                  disabled={!props.isEditing}
                  onValueChange={(value) => {
                    const nextScoreDataType = value as
                      | typeof ScoreDataTypeEnum.NUMERIC
                      | typeof ScoreDataTypeEnum.BOOLEAN
                      | typeof ScoreDataTypeEnum.CATEGORICAL;
                    const shouldEnableMultipleMatches =
                      nextScoreDataType === ScoreDataTypeEnum.CATEGORICAL
                        ? form.getValues("shouldAllowMultipleMatches")
                        : false;

                    field.onChange(nextScoreDataType);

                    if (
                      nextScoreDataType === ScoreDataTypeEnum.CATEGORICAL &&
                      (form.getValues("categories") ?? []).length === 0
                    ) {
                      replace(
                        Array.from(
                          { length: MinimumCategoricalCategoryCount },
                          () => ({ value: "" }),
                        ),
                      );
                    }

                    if (nextScoreDataType !== ScoreDataTypeEnum.CATEGORICAL) {
                      form.setValue("shouldAllowMultipleMatches", false);
                    }

                    applyDefaultOutputDefinitionCopy({
                      scoreDataType: nextScoreDataType,
                      shouldAllowMultipleMatches:
                        shouldEnableMultipleMatches ?? false,
                    });
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("evals.templateForm.selectScoreType")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ScoreDataTypeEnum.NUMERIC}>
                      {t("evals.templateForm.scoreType.numeric")}
                    </SelectItem>
                    <SelectItem value={ScoreDataTypeEnum.BOOLEAN}>
                      {t("evals.templateForm.scoreType.boolean")}
                    </SelectItem>
                    <SelectItem value={ScoreDataTypeEnum.CATEGORICAL}>
                      {t("evals.templateForm.scoreType.categorical")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {isCategoricalOutput ? (
            <FormField
              control={form.control}
              name="categories"
              render={() => (
                <FormItem>
                  <div>
                    <FormLabel>{t("evals.templateForm.categories")}</FormLabel>
                    <FormDescription>
                      {t("evals.templateForm.categoriesDescription")}
                    </FormDescription>
                  </div>
                  <div className="space-y-3">
                    {categoryFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <FormField
                          control={form.control}
                          name={`categories.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-xs">
                                {t("evals.templateForm.category")}
                              </FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!props.isEditing}
                            onClick={() => remove(index)}
                          >
                            <Trash className="text-muted-foreground h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-muted-foreground"
                    disabled={!props.isEditing}
                    onClick={() => append({ value: "" })}
                  >
                    <PlusIcon className="mr-1.5 h-4 w-4" />
                    {t("evals.templateForm.addCategory")}
                  </Button>
                  <FormField
                    control={form.control}
                    name="shouldAllowMultipleMatches"
                    render={({ field }) => (
                      <FormItem className="mt-3 flex flex-row items-center space-y-0 space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              applyDefaultOutputDefinitionCopy({
                                scoreDataType: ScoreDataTypeEnum.CATEGORICAL,
                                shouldAllowMultipleMatches: Boolean(checked),
                              });
                            }}
                            disabled={!props.isEditing}
                          />
                        </FormControl>
                        <div className="space-y-0.5 leading-none">
                          <FormLabel>
                            {t("evals.templateForm.allowMultipleMatches")}
                          </FormLabel>
                          <FormDescription>
                            {t(
                              "evals.templateForm.allowMultipleMatchesDescription",
                            )}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  {categoriesErrorMessage ? (
                    <p className="text-destructive text-sm font-medium">
                      {categoriesErrorMessage}
                    </p>
                  ) : null}
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="reasoningDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("evals.templateForm.scoreReasoningPrompt")}
                </FormLabel>
                <FormDescription>
                  {t("evals.templateForm.scoreReasoningPromptDescription")}
                </FormDescription>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scoreDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isCategoricalOutput
                    ? t("evals.templateForm.categorySelectionPrompt")
                    : isBooleanOutput
                      ? t("evals.templateForm.booleanVerdictPrompt")
                      : t("evals.templateForm.scoreOutputPrompt")}
                </FormLabel>
                <FormDescription>
                  {isCategoricalOutput
                    ? shouldAllowMultipleMatches
                      ? t(
                          "evals.templateForm.categorySelectionDescriptionMulti",
                        )
                      : t(
                          "evals.templateForm.categorySelectionDescriptionSingle",
                        )
                    : isBooleanOutput
                      ? t("evals.templateForm.booleanVerdictDescription")
                      : t("evals.templateForm.scoreOutputDescription")}
                </FormDescription>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  );

  const formFooter = (
    <div className="flex w-full flex-col items-end gap-4">
      {props.isEditing && (
        <Button
          type="submit"
          loading={createEvalTemplateMutation.isPending}
          className="w-full"
        >
          {t("common.save")}
        </Button>
      )}
      {formError ? (
        <p className="text-red w-full text-center">
          <span className="font-bold">{t("common.error")}:</span> {formError}
        </p>
      ) : null}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-4">
        {props.useDialog ? <DialogBody>{formBody}</DialogBody> : formBody}

        {props.useDialog ? (
          <DialogFooter>{formFooter}</DialogFooter>
        ) : (
          formFooter
        )}
      </form>
    </Form>
  );
};
