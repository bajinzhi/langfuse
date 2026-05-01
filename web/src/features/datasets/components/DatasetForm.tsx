import { Button } from "@/src/components/ui/button";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  useMemo,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Input } from "@/src/components/ui/input";
import { CodeMirrorEditor } from "@/src/components/editor";
import {
  DatasetNameSchema,
  isValidJSONSchema,
  type Prisma,
} from "@langfuse/shared";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { Label } from "@/src/components/ui/label";
import { useRouter } from "next/router";
import { useUniqueNameValidation } from "@/src/hooks/useUniqueNameValidation";
import { DialogBody, DialogFooter } from "@/src/components/ui/dialog";
import { DatasetSchemaInput } from "./DatasetSchemaInput";
import { DatasetSchemaValidationError } from "./DatasetSchemaValidationError";
import { useI18n } from "@/src/features/i18n";

type ServerSideSchemaValidationErrors = {
  datasetItemId: string;
  field: "input" | "expectedOutput";
  errors: Array<{
    path: string;
    message: string;
    keyword?: string;
  }>;
}[];

// Ref interface for imperative form submission
export interface DatasetFormRef {
  submit: () => void;
}

interface BaseDatasetFormProps {
  mode: "create" | "update" | "delete";
  projectId: string;
  onFormSuccess?: () => void;
  onCreateDatasetSuccess?: (params: {
    id: string;
    name: string;
    inputSchema: unknown;
    expectedOutputSchema: unknown;
  }) => void;
  className?: string;
  redirectOnSuccess?: boolean;
  showFooter?: boolean;
  onValidationChange?: (isValid: boolean, isSubmitting: boolean) => void;
}

interface CreateDatasetFormProps extends BaseDatasetFormProps {
  mode: "create";
  folderPrefix?: string;
}

interface DeleteDatasetFormProps extends BaseDatasetFormProps {
  mode: "delete";
  datasetName: string;
  datasetId: string;
}

interface UpdateDatasetFormProps extends BaseDatasetFormProps {
  mode: "update";
  datasetId: string;
  datasetName: string;
  datasetDescription?: string;
  datasetMetadata?: Prisma.JsonValue;
  datasetInputSchema?: Prisma.JsonValue;
  datasetExpectedOutputSchema?: Prisma.JsonValue;
}

type DatasetFormProps =
  | CreateDatasetFormProps
  | UpdateDatasetFormProps
  | DeleteDatasetFormProps;

const isValidJsonSchemaString = (value: string) => {
  if (value === "") return true; // Empty is valid (means no schema)

  try {
    const parsed = JSON.parse(value);

    return isValidJSONSchema(parsed);
  } catch {
    return false;
  }
};

const isValidJsonInput = (value: string) => {
  if (value === "") return true;
  try {
    JSON.parse(value);

    return true;
  } catch {
    return false;
  }
};

const createFormSchema = (messages: {
  invalidJson: string;
  invalidJsonSchema: string;
}) =>
  z.object({
    name: DatasetNameSchema,
    description: z.string(),
    metadata: z.string().refine(isValidJsonInput, {
      message: messages.invalidJson,
    }),
    inputSchema: z.string().refine(isValidJsonSchemaString, {
      message: messages.invalidJsonSchema,
    }),
    expectedOutputSchema: z.string().refine(isValidJsonSchemaString, {
      message: messages.invalidJsonSchema,
    }),
  });

type DatasetFormValues = z.infer<ReturnType<typeof createFormSchema>>;

export const DatasetForm = forwardRef<DatasetFormRef, DatasetFormProps>(
  (props, ref) => {
    const { t } = useI18n();
    const formSchema = useMemo(
      () =>
        createFormSchema({
          invalidJson: t("datasets.invalidJson"),
          invalidJsonSchema: t("datasets.invalidJsonSchema"),
        }),
      [t],
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [
      serverSideSchemaValidationErrors,
      setServerSideSchemaValidationErrors,
    ] = useState<ServerSideSchemaValidationErrors | null>(null);
    const capture = usePostHogClientCapture();
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

    const inputSchemaString =
      props.mode === "update" && props.datasetInputSchema
        ? JSON.stringify(props.datasetInputSchema, null, 2)
        : "";
    const expectedOutputSchemaString =
      props.mode === "update" && props.datasetExpectedOutputSchema
        ? JSON.stringify(props.datasetExpectedOutputSchema, null, 2)
        : "";

    const form = useForm({
      resolver: zodResolver(formSchema),
      defaultValues:
        props.mode === "update"
          ? {
              name: props.datasetName,
              description: props.datasetDescription ?? "",
              metadata: props.datasetMetadata
                ? JSON.stringify(props.datasetMetadata, null, 2)
                : "",
              inputSchema: inputSchemaString,
              expectedOutputSchema: expectedOutputSchemaString,
            }
          : {
              name:
                props.mode === "create" && props.folderPrefix
                  ? `${props.folderPrefix}/`
                  : "",
              description: "",
              metadata: "",
              inputSchema: "",
              expectedOutputSchema: "",
            },
    });

    const utils = api.useUtils();
    const router = useRouter();
    const createMutation = api.datasets.createDataset.useMutation();
    const updateMutation = api.datasets.updateDataset.useMutation();
    const deleteMutation = api.datasets.deleteDataset.useMutation();

    const allDatasets = api.datasets.allDatasetMeta.useQuery(
      { projectId: props.projectId },
      {
        enabled: props.mode === "create" || props.mode === "update",
      },
    );

    const allDatasetNames = useMemo(() => {
      return (
        allDatasets.data?.map((dataset) => ({ value: dataset.name })) ?? []
      );
    }, [allDatasets.data]);

    useUniqueNameValidation({
      currentName: form.watch("name"),
      allNames: allDatasetNames,
      form,
      errorMessage: t("datasets.nameAlreadyExists"),
      whitelistedName: props.mode === "update" ? props.datasetName : undefined,
    });

    // Track previous validation state to avoid redundant callbacks
    const prevValidationRef = useRef<{
      isValid: boolean;
      isSubmitting: boolean;
    } | null>(null);

    // Report validation state to parent (only when values actually change)
    const { onValidationChange, mode } = props;
    useEffect(() => {
      if (onValidationChange) {
        const isValid = form.formState.isValid && !form.formState.errors.name;
        const isSubmitting =
          (mode === "create" && createMutation.isPending) ||
          (mode === "update" && updateMutation.isPending) ||
          (mode === "delete" && deleteMutation.isPending);

        const prev = prevValidationRef.current;
        if (
          !prev ||
          prev.isValid !== isValid ||
          prev.isSubmitting !== isSubmitting
        ) {
          prevValidationRef.current = { isValid, isSubmitting };
          onValidationChange(isValid, isSubmitting);
        }
      }
    }, [
      form.formState.isValid,
      form.formState.errors.name,
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      mode,
      onValidationChange,
    ]);

    // Expose submit method via ref for external triggering
    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          if (props.mode !== "delete") {
            form.handleSubmit(onSubmit)();
          }
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.mode],
    );

    function onSubmit(values: DatasetFormValues) {
      // Parse schemas if they're not empty (tRPC expects objects for DatasetJSONSchema)
      const inputSchema =
        values.inputSchema === "" ? null : JSON.parse(values.inputSchema);
      const expectedOutputSchema =
        values.expectedOutputSchema === ""
          ? null
          : JSON.parse(values.expectedOutputSchema);

      const trimmedValues = {
        name: values.name.trim(),
        description:
          values.description !== "" ? values.description.trim() : null,
        // Keep metadata as string - resolveMetadata in tRPC will parse it
        metadata: values.metadata !== "" ? values.metadata : null,
        inputSchema,
        expectedOutputSchema,
      };

      if (props.mode === "create") {
        capture("datasets:new_form_submit");
        createMutation
          .mutateAsync({
            ...trimmedValues,
            projectId: props.projectId,
          })
          .then((result) => {
            if (result.success) {
              // Success - navigate to dataset items
              void utils.datasets.invalidate();
              props.onCreateDatasetSuccess?.(result.dataset);
              props.onFormSuccess?.();
              form.reset();
              if (props.redirectOnSuccess !== false) {
                router.push(
                  `/project/${props.projectId}/datasets/${result.dataset.id}/items`,
                );
              }
            } else {
              // Validation failed - show errors
              setServerSideSchemaValidationErrors(result.validationErrors);
              setFormError(null);
            }
          })
          .catch((error: Error) => {
            // System error (not validation)
            setFormError(error.message);
            setServerSideSchemaValidationErrors(null);
            console.error(error);
          });
      } else if (props.mode === "update") {
        capture("datasets:update_form_submit");
        updateMutation
          .mutateAsync({
            ...trimmedValues,
            projectId: props.projectId,
            datasetId: props.datasetId,
          })
          .then((result) => {
            if (result.success) {
              // Success - close dialog
              void utils.datasets.invalidate();
              props.onFormSuccess?.();
              form.reset();
            } else {
              // Validation failed - show errors
              setServerSideSchemaValidationErrors(result.validationErrors);
              setFormError(null);
            }
          })
          .catch((error: Error) => {
            // System error (not validation)
            setFormError(error.message);
            setServerSideSchemaValidationErrors(null);
            console.error(error);
          });
      }
    }

    const handleDelete = (e: React.SyntheticEvent) => {
      e.preventDefault();

      // helps with type safety
      if (props.mode !== "delete") return;

      if (deleteConfirmationInput !== props.datasetName) {
        setFormError(t("datasets.nameDeleteConfirmationMismatch"));
        return;
      }

      capture("datasets:delete_form_submit");
      deleteMutation
        .mutateAsync({
          projectId: props.projectId,
          datasetId: props.datasetId,
        })
        .then(() => {
          void utils.datasets.invalidate();
          form.reset();
        })
        .catch((error: Error) => {
          setFormError(error.message);
          console.error(error);
        });
    };

    return (
      <Form {...form}>
        <form
          onSubmit={
            props.mode === "delete" ? handleDelete : form.handleSubmit(onSubmit)
          }
          className="flex h-full min-h-0 flex-col"
        >
          <DialogBody
            className={props.showFooter === false ? "p-0" : undefined}
          >
            {props.mode === "delete" ? (
              <div className="mb-8 grid w-full gap-1.5">
                <Label htmlFor="delete-confirmation">
                  {t("datasets.typeToConfirmDelete", {
                    name: props.datasetName,
                  })}
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                />
              </div>
            ) : (
              <div className="mb-8 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("datasets.name")}</FormLabel>
                      <FormDescription>
                        {t("datasets.nameDescription")}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("datasets.descriptionOptional")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metadata"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("datasets.metadataOptional")}</FormLabel>
                      <FormControl>
                        <CodeMirrorEditor
                          mode="json"
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inputSchema"
                  render={({ field }) => (
                    <DatasetSchemaInput
                      label={t("datasets.inputSchema")}
                      description={t("datasets.inputSchemaDescription")}
                      value={field.value}
                      onChange={field.onChange}
                      initialValue={inputSchemaString}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedOutputSchema"
                  render={({ field }) => (
                    <DatasetSchemaInput
                      label={t("datasets.expectedOutputSchema")}
                      description={t(
                        "datasets.expectedOutputSchemaDescription",
                      )}
                      value={field.value}
                      onChange={field.onChange}
                      initialValue={expectedOutputSchemaString}
                    />
                  )}
                />

                {/* Show validation errors inline with form */}
                {serverSideSchemaValidationErrors && (
                  <DatasetSchemaValidationError
                    projectId={props.projectId}
                    datasetId={
                      props.mode === "update" ? props.datasetId : "unknown"
                    }
                    errors={serverSideSchemaValidationErrors}
                  />
                )}
              </div>
            )}
          </DialogBody>
          {props.showFooter !== false && (
            <DialogFooter>
              <div className="flex w-full flex-col gap-4">
                <Button
                  type="submit"
                  variant={props.mode === "delete" ? "destructive" : "default"}
                  disabled={!!form.formState.errors.name}
                  loading={
                    (props.mode === "create" && createMutation.isPending) ||
                    (props.mode === "update" && updateMutation.isPending) ||
                    (props.mode === "delete" && deleteMutation.isPending)
                  }
                  className="w-full"
                >
                  {props.mode === "create"
                    ? t("datasets.createDataset")
                    : props.mode === "delete"
                      ? t("datasets.deleteDataset")
                      : t("datasets.updateDataset")}
                </Button>
                {formError && (
                  <p className="mt-4 text-center text-sm text-red-500">
                    <span className="font-bold">{t("common.error")}:</span>{" "}
                    {formError}
                  </p>
                )}
              </div>
            </DialogFooter>
          )}
        </form>
      </Form>
    );
  },
);

DatasetForm.displayName = "DatasetForm";
