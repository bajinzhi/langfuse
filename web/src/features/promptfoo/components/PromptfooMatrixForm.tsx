import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { ModelParameters } from "@/src/components/ModelParameters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import type { ExperimentRunCallbackData } from "@/src/features/experiments/types";
import { useI18n } from "@/src/features/i18n";
import { useModelParams } from "@/src/features/playground/page/hooks/useModelParams";
import { getFinalModelParams } from "@/src/utils/getFinalModelParams";
import { api } from "@/src/utils/api";
import {
  PROMPTFOO_MATRIX_CONCURRENCY_DEFAULT,
  PromptfooAssertionType,
  type CreatePromptfooMatrixExperimentInput,
  type PromptfooMatrixConfig,
  type PromptfooModelConfig,
} from "@langfuse/shared";

type PromptfooMatrixFormProps = {
  projectId: string;
  setFormOpen: (open: boolean) => void;
  defaultValues?: Partial<
    Pick<CreatePromptfooMatrixExperimentInput, "promptIds" | "datasetId">
  >;
  handleExperimentSuccess?: (data?: ExperimentRunCallbackData) => Promise<void>;
  handleExperimentSettled?: (data?: ExperimentRunCallbackData) => Promise<void>;
};

function modelConfigKey(modelConfig: PromptfooModelConfig) {
  return `${modelConfig.provider}:${modelConfig.model}:${JSON.stringify(
    modelConfig.modelParams,
  )}`;
}

export function PromptfooMatrixForm({
  projectId,
  setFormOpen,
  defaultValues,
  handleExperimentSuccess,
  handleExperimentSettled,
}: PromptfooMatrixFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(t("promptfoo.matrix.defaultName"));
  const [description, setDescription] = useState("");
  const [datasetId, setDatasetId] = useState(defaultValues?.datasetId ?? "");
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>(
    defaultValues?.promptIds ?? [],
  );
  const [modelConfigs, setModelConfigs] = useState<PromptfooModelConfig[]>([]);
  const [assertionType, setAssertionType] = useState<
    (typeof PromptfooAssertionType)[keyof typeof PromptfooAssertionType]
  >(PromptfooAssertionType.Equals);
  const [assertionValue, setAssertionValue] = useState("");
  const [metricName, setMetricName] = useState("expected-output");
  const [concurrency, setConcurrency] = useState(
    PROMPTFOO_MATRIX_CONCURRENCY_DEFAULT,
  );

  const prompts = api.prompts.allPromptMeta.useQuery({ projectId });
  const datasets = api.datasets.allDatasetMeta.useQuery({ projectId });
  const createMutation = api.promptfoo.createMatrixExperiment.useMutation();

  const {
    modelParams,
    updateModelParamValue,
    setModelParamEnabled,
    availableModels,
    providerModelCombinations,
    availableProviders,
  } = useModelParams("promptfoo-matrix");

  const currentModelConfig = useMemo<PromptfooModelConfig | null>(() => {
    if (!modelParams.provider.value || !modelParams.model.value) {
      return null;
    }

    return {
      provider: modelParams.provider.value,
      model: modelParams.model.value,
      modelParams: getFinalModelParams(modelParams),
    };
  }, [modelParams]);

  const selectedModelConfigs = useMemo<PromptfooModelConfig[]>(() => {
    if (modelConfigs.length > 0) {
      return modelConfigs;
    }

    return currentModelConfig ? [currentModelConfig] : [];
  }, [currentModelConfig, modelConfigs]);

  const validationInput = useMemo<PromptfooMatrixConfig | null>(() => {
    if (
      !datasetId ||
      selectedPromptIds.length === 0 ||
      selectedModelConfigs.length === 0
    ) {
      return null;
    }

    return {
      projectId,
      datasetId,
      promptIds: selectedPromptIds,
      modelConfigs: selectedModelConfigs,
      assertions: [
        {
          type: assertionType,
          ...(assertionValue ? { value: assertionValue } : {}),
        },
      ],
      concurrency,
    };
  }, [
    assertionType,
    assertionValue,
    concurrency,
    datasetId,
    projectId,
    selectedModelConfigs,
    selectedPromptIds,
  ]);

  const requestInput =
    useMemo<CreatePromptfooMatrixExperimentInput | null>(() => {
      const trimmedName = name.trim();
      if (!trimmedName || !validationInput) {
        return null;
      }

      return {
        ...validationInput,
        projectId,
        name: trimmedName,
        description: description || undefined,
        assertions: [
          {
            type: assertionType,
            ...(assertionValue ? { value: assertionValue } : {}),
            ...(metricName ? { metricName } : {}),
          },
        ],
      };
    }, [
      assertionType,
      assertionValue,
      description,
      metricName,
      name,
      projectId,
      validationInput,
    ]);

  const validation = api.promptfoo.validateConfig.useQuery(validationInput!, {
    enabled: Boolean(validationInput),
  });

  const promptOptions = useMemo(
    () =>
      (prompts.data ?? []).map((prompt) => ({
        id: prompt.id,
        label: `${prompt.name} v${prompt.version}`,
      })),
    [prompts.data],
  );

  const togglePrompt = (promptId: string) => {
    setSelectedPromptIds((current) =>
      current.includes(promptId)
        ? current.filter((id) => id !== promptId)
        : [...current, promptId],
    );
  };

  const addCurrentModel = () => {
    if (!currentModelConfig) return;
    setModelConfigs((current) => {
      const key = modelConfigKey(currentModelConfig);
      if (current.some((modelConfig) => modelConfigKey(modelConfig) === key)) {
        return current;
      }
      return [...current, currentModelConfig];
    });
  };

  const onSubmit = async () => {
    if (!requestInput) return;

    try {
      const result = await createMutation.mutateAsync(requestInput);
      const callbackPayload = {
        success: result.success,
        datasetId: result.datasetId,
        runId: result.runIds[0] ?? result.matrixRunId,
        runIds: result.runIds,
        runName: result.runName,
      };

      await handleExperimentSuccess?.(callbackPayload);
      await handleExperimentSettled?.(callbackPayload);
      setFormOpen(false);
    } catch {
      showErrorToast(
        t("promptfoo.matrix.createFailed"),
        t("experiments.error.tryAgain"),
      );
      await handleExperimentSettled?.();
    }
  };

  const canSubmit = Boolean(
    requestInput && validation.data?.isValid && !createMutation.isPending,
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("promptfoo.matrix.title")}</DialogTitle>
        <DialogDescription>
          {t("promptfoo.matrix.description")}
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promptfoo-name">
                {t("promptfoo.matrix.name")}
              </Label>
              <Input
                id="promptfoo-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("promptfoo.matrix.dataset")}</Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("experiments.dataset.selectDataset")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(datasets.data ?? []).map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("promptfoo.matrix.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>{t("promptfoo.matrix.prompts")}</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
              {promptOptions.map((prompt) => (
                <label
                  key={prompt.id}
                  className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={selectedPromptIds.includes(prompt.id)}
                    onCheckedChange={() => togglePrompt(prompt.id)}
                  />
                  <span>{prompt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("promptfoo.matrix.models")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCurrentModel}
                disabled={!currentModelConfig}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("promptfoo.matrix.addModel")}
              </Button>
            </div>
            <ModelParameters
              modelParams={modelParams}
              availableModels={availableModels}
              providerModelCombinations={providerModelCombinations}
              availableProviders={availableProviders}
              updateModelParamValue={updateModelParamValue}
              setModelParamEnabled={setModelParamEnabled}
              layout="compact"
              isEmbedded
            />
            {modelConfigs.length > 0 && (
              <div className="space-y-1">
                {modelConfigs.map((modelConfig) => (
                  <div
                    key={modelConfigKey(modelConfig)}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {modelConfig.provider}: {modelConfig.model}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setModelConfigs((current) =>
                          current.filter(
                            (item) =>
                              modelConfigKey(item) !==
                              modelConfigKey(modelConfig),
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("promptfoo.matrix.assertion")}</Label>
              <Select
                value={assertionType}
                onValueChange={(value) =>
                  setAssertionType(value as typeof assertionType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PromptfooAssertionType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("promptfoo.matrix.assertionValue")}</Label>
              <Input
                value={assertionValue}
                placeholder="{{ expected_output }}"
                onChange={(event) => setAssertionValue(event.target.value)}
                disabled={assertionType === PromptfooAssertionType.IsJson}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("promptfoo.matrix.concurrency")}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={concurrency}
                onChange={(event) =>
                  setConcurrency(Number(event.target.value) || 1)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("promptfoo.matrix.metricName")}</Label>
            <Input
              value={metricName}
              onChange={(event) => setMetricName(event.target.value)}
            />
          </div>

          {validation.data && (
            <p
              className={
                validation.data.isValid
                  ? "text-muted-foreground text-sm"
                  : "text-destructive text-sm"
              }
            >
              {validation.data.isValid
                ? t("promptfoo.matrix.validationOk", {
                    calls: validation.data.totalCalls,
                    items: validation.data.validItems,
                  })
                : t(validation.data.messageKey, validation.data.values)}
            </p>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormOpen(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          loading={createMutation.isPending}
        >
          {t("promptfoo.matrix.run")}
        </Button>
      </DialogFooter>
    </>
  );
}
