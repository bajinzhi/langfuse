import React, { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Code2, Wand2, Cog, Zap, Table2 } from "lucide-react";
import { api } from "@/src/utils/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/src/components/ui/card";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/src/components/ui/dialog";
import Link from "next/link";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import {
  type CreateExperiment,
  type ExperimentRunCallbackData,
} from "@/src/features/experiments/types";
import { MultiStepExperimentForm } from "@/src/features/experiments/components/MultiStepExperimentForm";
import { PromptfooMatrixForm } from "@/src/features/promptfoo/components/PromptfooMatrixForm";
import { RemoteExperimentUpsertForm } from "@/src/features/experiments/components/RemoteExperimentUpsertForm";
import { RemoteExperimentTriggerModal } from "@/src/features/experiments/components/RemoteExperimentTriggerModal";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useI18n } from "@/src/features/i18n";

export const CreateExperimentsForm = ({
  projectId,
  setFormOpen,
  defaultValues = {},
  promptDefault,
  handleExperimentSettled,
  handleExperimentSuccess,
  showSDKRunInfoPage = false,
}: {
  projectId: string;
  setFormOpen: (open: boolean) => void;
  defaultValues?: Partial<Pick<CreateExperiment, "promptId" | "datasetId">>;
  promptDefault?: {
    name: string;
    version: number;
  };
  handleExperimentSuccess?: (data?: ExperimentRunCallbackData) => Promise<void>;
  handleExperimentSettled?: (data?: ExperimentRunCallbackData) => Promise<void>;
  showSDKRunInfoPage?: boolean;
}) => {
  const capture = usePostHogClientCapture();
  const { t } = useI18n();
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [showPromptfooMatrixForm, setShowPromptfooMatrixForm] = useState(false);
  const [showRemoteExperimentUpsertForm, setShowRemoteExperimentUpsertForm] =
    useState(false);
  const [
    showRemoteExperimentTriggerModal,
    setShowRemoteExperimentTriggerModal,
  ] = useState(false);

  const hasExperimentWriteAccess = useHasProjectAccess({
    projectId,
    scope: "promptExperiments:CUD",
  });
  const datasetId = defaultValues.datasetId;

  const existingRemoteExperiment = api.datasets.getRemoteExperiment.useQuery(
    {
      projectId,
      datasetId: datasetId as string,
    },
    {
      enabled: !!datasetId,
    },
  );

  if (!hasExperimentWriteAccess) {
    return null;
  }

  if (existingRemoteExperiment.isLoading && !!datasetId) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (
    showSDKRunInfoPage &&
    !showPromptForm &&
    !showPromptfooMatrixForm &&
    !showRemoteExperimentUpsertForm &&
    !showRemoteExperimentTriggerModal
  ) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("experiments.run.title")}</DialogTitle>
          <DialogDescription>
            {t("experiments.entry.descriptionBeforeLink")}{" "}
            <Link
              href="https://langfuse.com/docs/evaluation/dataset-runs/datasets"
              target="_blank"
              className="underline"
            >
              {t("common.here")}
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-8">
          <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
            <Card className="flex flex-1 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wand2 className="size-4" />
                  {t("experiments.entry.viaUi")}
                </CardTitle>
                <CardDescription>
                  {t("experiments.entry.uiDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                  <li>{t("experiments.entry.uiComparePrompts")}</li>
                  <li>{t("experiments.entry.uiCompareModels")}</li>
                  <li>{t("experiments.entry.uiNoCode")}</li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto flex flex-row gap-2">
                <Button
                  className="w-full"
                  onClick={() => setShowPromptForm(true)}
                >
                  {t("experiments.evaluators.configure")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                  onClick={() =>
                    capture("dataset_run:view_prompt_experiment_docs")
                  }
                >
                  <Link href="https://langfuse.com/docs/evaluation/dataset-runs/native-run">
                    {t("experiments.entry.viewDocs")}
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="flex flex-1 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Table2 className="size-4" />
                  {t("experiments.entry.viaPromptfoo")}
                </CardTitle>
                <CardDescription>
                  {t("experiments.entry.promptfooDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                  <li>{t("experiments.entry.promptfooMatrix")}</li>
                  <li>{t("experiments.entry.promptfooAssertions")}</li>
                  <li>{t("experiments.entry.promptfooReport")}</li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  className="w-full"
                  onClick={() => setShowPromptfooMatrixForm(true)}
                >
                  {t("experiments.entry.configureMatrix")}
                </Button>
              </CardFooter>
            </Card>

            <Card className="flex flex-1 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code2 className="size-4" />
                  {t("experiments.entry.viaSdkApi")}
                </CardTitle>
                <CardDescription>
                  {t("experiments.entry.sdkDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground list-disc space-y-2 pl-4 text-sm">
                  <li>{t("experiments.entry.sdkFullControl")}</li>
                  <li>{t("experiments.entry.sdkCustomEvaluation")}</li>
                  <li>{t("experiments.entry.sdkIntegration")}</li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto flex flex-row gap-2">
                {!!existingRemoteExperiment.data && datasetId && (
                  <div className="flex items-start">
                    <Button
                      className="rounded-r-none"
                      disabled={existingRemoteExperiment.data.enabled === false}
                      title={
                        existingRemoteExperiment.data.enabled === false
                          ? t("experiments.entry.enableInSettings")
                          : undefined
                      }
                      onClick={() => setShowRemoteExperimentTriggerModal(true)}
                    >
                      {t("experiments.entry.run")}
                    </Button>
                    <Button
                      className="rounded-l-none rounded-r-md border-l-2 px-2"
                      title={t("experiments.entry.editRemoteTrigger")}
                      onClick={() => setShowRemoteExperimentUpsertForm(true)}
                    >
                      <span className="relative mr-1 text-xs">
                        <Cog className="h-3 w-3" />
                      </span>
                    </Button>
                  </div>
                )}
                <Button
                  className="flex-1"
                  variant="outline"
                  asChild
                  onClick={() =>
                    capture("dataset_run:view_custom_experiment_docs")
                  }
                >
                  <Link
                    href="https://langfuse.com/docs/evaluation/dataset-runs/remote-run"
                    target="_blank"
                  >
                    {t("experiments.entry.viewDocs")}
                  </Link>
                </Button>
                {!existingRemoteExperiment.data && (
                  <Button
                    variant="outline"
                    title={t("experiments.entry.setupRemoteTrigger")}
                    className="h-8 w-8 shrink-0"
                    size="icon"
                    onClick={() => setShowRemoteExperimentUpsertForm(true)}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </DialogBody>
      </>
    );
  }

  if (
    showRemoteExperimentTriggerModal &&
    datasetId &&
    existingRemoteExperiment.data
  ) {
    return (
      <RemoteExperimentTriggerModal
        projectId={projectId}
        datasetId={datasetId}
        remoteExperimentConfig={existingRemoteExperiment.data}
        setShowTriggerModal={setShowRemoteExperimentTriggerModal}
      />
    );
  }

  if (showRemoteExperimentUpsertForm && datasetId) {
    return (
      <RemoteExperimentUpsertForm
        projectId={projectId}
        datasetId={datasetId}
        existingRemoteExperiment={existingRemoteExperiment.data}
        setShowRemoteExperimentUpsertForm={setShowRemoteExperimentUpsertForm}
      />
    );
  }

  if (showPromptfooMatrixForm) {
    return (
      <PromptfooMatrixForm
        projectId={projectId}
        setFormOpen={setFormOpen}
        defaultValues={{
          datasetId: defaultValues.datasetId,
          promptIds: defaultValues.promptId ? [defaultValues.promptId] : [],
        }}
        handleExperimentSettled={handleExperimentSettled}
        handleExperimentSuccess={handleExperimentSuccess}
      />
    );
  }

  return (
    <MultiStepExperimentForm
      projectId={projectId}
      setFormOpen={setFormOpen}
      defaultValues={defaultValues}
      promptDefault={promptDefault}
      handleExperimentSettled={handleExperimentSettled}
      handleExperimentSuccess={handleExperimentSuccess}
    />
  );
};
