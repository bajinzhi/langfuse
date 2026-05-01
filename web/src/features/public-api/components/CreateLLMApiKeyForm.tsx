import { useFieldArray, useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type BedrockApiKey,
  type BedrockAccessKeys,
  type BedrockConfig,
  type VertexAIConfig,
  LLMAdapter,
  BEDROCK_USE_DEFAULT_CREDENTIALS,
  VERTEXAI_USE_DEFAULT_CREDENTIALS,
} from "@langfuse/shared";
import { ChevronDown, PlusIcon, TrashIcon } from "lucide-react";
import { z } from "zod";
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
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { api, type RouterOutputs } from "@/src/utils/api";
import { cn } from "@/src/utils/tailwind";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { type useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { DialogFooter } from "@/src/components/ui/dialog";
import { DialogBody } from "@/src/components/ui/dialog";
import { env } from "@/src/env.mjs";
import {
  AuthMethod,
  BedrockAuthMethodSchema,
  type BedrockAuthMethod,
} from "@/src/features/llm-api-key/types";
import { useI18n } from "@/src/features/i18n";

const isLangfuseCloud = Boolean(env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION);

const isCustomModelsRequired = (adapter: LLMAdapter) =>
  adapter === LLMAdapter.Azure || adapter === LLMAdapter.Bedrock;

const hasText = (value?: string) => Boolean(value?.trim());

/**
 * Whether the selected auth method matches the existing one (i.e. credentials
 * can be preserved on update). DefaultCredentials is grouped with AccessKeys
 * because both use SigV4-based authentication via the AWS SDK.
 */
const isMatchingBedrockAuthMethod = (
  newAuthMethod: BedrockAuthMethod,
  existingAuthMethod?: BedrockAuthMethod,
): boolean =>
  (newAuthMethod === AuthMethod.ApiKey &&
    existingAuthMethod === AuthMethod.ApiKey) ||
  (newAuthMethod === AuthMethod.AccessKeys &&
    (existingAuthMethod === AuthMethod.AccessKeys ||
      existingAuthMethod === AuthMethod.DefaultCredentials));

type LlmApiKeyListItem = RouterOutputs["llmApiKey"]["all"]["data"][number];

const getInitialBedrockAuthMethod = (params: {
  mode: "create" | "update";
  existingAuthMethod?: BedrockAuthMethod;
}): BedrockAuthMethod => {
  if (params.mode === "update") {
    return params.existingAuthMethod === AuthMethod.ApiKey
      ? AuthMethod.ApiKey
      : AuthMethod.AccessKeys;
  }

  return AuthMethod.AccessKeys;
};

const createFormSchema = (params: {
  mode: "create" | "update";
  existingAuthMethod?: BedrockAuthMethod;
  t: ReturnType<typeof useI18n>["t"];
}) =>
  z
    .object({
      secretKey: z.string().optional(),
      provider: z
        .string()
        .min(1, params.t("publicApi.validation.providerNameRequired"))
        .regex(/^[^:]+$/, params.t("publicApi.validation.providerNameNoColon")),
      adapter: z.enum(LLMAdapter),
      baseURL: z.union([z.literal(""), z.url()]),
      withDefaultModels: z.boolean(),
      customModels: z.array(z.object({ value: z.string().min(1) })),
      awsAccessKeyId: z.string().optional(),
      awsSecretAccessKey: z.string().optional(),
      bedrockApiKey: z.string().optional(),
      authMethod: BedrockAuthMethodSchema,
      awsRegion: z.string().optional(),
      vertexAILocation: z.string().optional(),
      extraHeaders: z.array(
        z.object({
          key: z.string().min(1),
          value:
            params.mode === "create"
              ? z.string().min(1)
              : z.string().optional(),
        }),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.adapter !== LLMAdapter.Bedrock) return;

      const hasRegion = hasText(data.awsRegion);
      const hasAccessKeyId = hasText(data.awsAccessKeyId);
      const hasSecretAccessKey = hasText(data.awsSecretAccessKey);
      const hasBedrockApiKey = hasText(data.bedrockApiKey);
      const hasAnyAccessKeys = hasAccessKeyId || hasSecretAccessKey;
      const { authMethod } = data;
      const isUpdatingCurrentAuthMethod =
        params.mode === "update" &&
        isMatchingBedrockAuthMethod(authMethod, params.existingAuthMethod);

      if (!hasRegion) {
        ctx.addIssue({
          code: "custom",
          message: params.t("publicApi.validation.awsRegionRequired"),
          path: ["awsRegion"],
        });
      }

      if (authMethod === AuthMethod.AccessKeys) {
        if (isUpdatingCurrentAuthMethod && !hasAnyAccessKeys) {
          return;
        }

        if (!isLangfuseCloud && !hasAnyAccessKeys) {
          return;
        }

        if (!hasAccessKeyId) {
          ctx.addIssue({
            code: "custom",
            message: params.t("publicApi.validation.awsAccessKeyIdRequired"),
            path: ["awsAccessKeyId"],
          });
        }

        if (!hasSecretAccessKey) {
          ctx.addIssue({
            code: "custom",
            message: params.t(
              "publicApi.validation.awsSecretAccessKeyRequired",
            ),
            path: ["awsSecretAccessKey"],
          });
        }
        return;
      }

      if (isUpdatingCurrentAuthMethod && !hasBedrockApiKey) {
        return;
      }

      if (!hasBedrockApiKey) {
        ctx.addIssue({
          code: "custom",
          message: params.t("publicApi.validation.bedrockApiKeyRequired"),
          path: ["bedrockApiKey"],
        });
      }
    })
    .refine(
      (data) => {
        if (isCustomModelsRequired(data.adapter)) {
          return data.customModels.length > 0;
        }
        return true;
      },
      {
        message: params.t("publicApi.validation.customModelRequired"),
        path: ["customModels"],
      },
    )
    // 2) For adapters that support defaults, require default models or at least one custom model
    .refine(
      (data) => {
        if (isCustomModelsRequired(data.adapter)) {
          return true;
        }
        return data.withDefaultModels || data.customModels.length > 0;
      },
      {
        message: params.t("publicApi.validation.customModelOrDefaultRequired"),
        path: ["withDefaultModels"],
      },
    )
    // Vertex AI validation - service account key or ADC sentinel value required
    .refine(
      (data) => {
        if (data.adapter !== LLMAdapter.VertexAI) return true;

        // In update mode, credentials are optional (existing ones are preserved)
        if (params.mode === "update") return true;

        // secretKey is required (either JSON key or VERTEXAI_USE_DEFAULT_CREDENTIALS sentinel)
        return !!data.secretKey;
      },
      {
        message: isLangfuseCloud
          ? params.t("publicApi.validation.vertexJsonRequired")
          : params.t("publicApi.validation.vertexJsonOrAdcRequired"),
        path: ["secretKey"],
      },
    )
    .refine(
      (data) =>
        data.adapter === LLMAdapter.Bedrock ||
        data.adapter === LLMAdapter.VertexAI ||
        params.mode === "update" ||
        data.secretKey,
      {
        message: params.t("publicApi.validation.secretKeyRequired"),
        path: ["secretKey"],
      },
    )
    .refine(
      (data) => {
        if (data.adapter !== LLMAdapter.Azure) return true;
        return data.baseURL && data.baseURL.trim() !== "";
      },
      {
        message: params.t("publicApi.validation.azureBaseUrlRequired"),
        path: ["baseURL"],
      },
    );

interface CreateLLMApiKeyFormProps {
  projectId?: string;
  onSuccess: () => void;
  customization: ReturnType<typeof useUiCustomization>;
  mode?: "create" | "update";
  existingKey?: LlmApiKeyListItem;
}

export function CreateLLMApiKeyForm({
  projectId,
  onSuccess,
  customization,
  mode = "create",
  existingKey,
}: CreateLLMApiKeyFormProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const utils = api.useUtils();
  const capture = usePostHogClientCapture();
  const { t } = useI18n();

  const existingKeys = api.llmApiKey.all.useQuery(
    {
      projectId: projectId as string,
    },
    { enabled: Boolean(projectId) },
  );

  const mutCreateLlmApiKey = api.llmApiKey.create.useMutation({
    onSuccess: () => utils.llmApiKey.invalidate(),
  });

  const mutUpdateLlmApiKey = api.llmApiKey.update.useMutation({
    onSuccess: () => utils.llmApiKey.invalidate(),
  });

  const mutTestLLMApiKey = api.llmApiKey.test.useMutation();
  const mutTestUpdateLLMApiKey = api.llmApiKey.testUpdate.useMutation();

  const defaultAdapter: LLMAdapter = customization?.defaultModelAdapter
    ? LLMAdapter[customization.defaultModelAdapter]
    : LLMAdapter.OpenAI;

  const getCustomizedBaseURL = (adapter: LLMAdapter) => {
    switch (adapter) {
      case LLMAdapter.OpenAI:
        return customization?.defaultBaseUrlOpenAI ?? "";
      case LLMAdapter.Azure:
        return customization?.defaultBaseUrlAzure ?? "";
      case LLMAdapter.Anthropic:
        return customization?.defaultBaseUrlAnthropic ?? "";
      default:
        return "";
    }
  };

  const formSchema = createFormSchema({
    mode,
    existingAuthMethod: existingKey?.authMethod,
    t,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues:
      mode === "update" && existingKey
        ? {
            adapter: existingKey.adapter as LLMAdapter,
            provider: existingKey.provider,
            secretKey:
              existingKey.adapter === LLMAdapter.VertexAI &&
              existingKey.displaySecretKey === "Default GCP credentials (ADC)"
                ? VERTEXAI_USE_DEFAULT_CREDENTIALS
                : "",
            baseURL:
              existingKey.baseURL ??
              getCustomizedBaseURL(existingKey.adapter as LLMAdapter),
            withDefaultModels: existingKey.withDefaultModels,
            customModels: existingKey.customModels.map((value) => ({ value })),
            extraHeaders:
              existingKey.extraHeaderKeys?.map((key) => ({ key, value: "" })) ??
              [],
            vertexAILocation:
              existingKey.adapter === LLMAdapter.VertexAI && existingKey.config
                ? ((existingKey.config as VertexAIConfig).location ?? "")
                : "",
            awsRegion:
              existingKey.adapter === LLMAdapter.Bedrock && existingKey.config
                ? ((existingKey.config as BedrockConfig).region ?? "")
                : "",
            awsAccessKeyId: "",
            awsSecretAccessKey: "",
            bedrockApiKey: "",
            authMethod: getInitialBedrockAuthMethod({
              mode,
              existingAuthMethod: existingKey.authMethod,
            }),
          }
        : {
            adapter: defaultAdapter,
            provider: "",
            secretKey: "",
            baseURL: getCustomizedBaseURL(defaultAdapter),
            withDefaultModels: true,
            customModels: [],
            extraHeaders: [],
            vertexAILocation: "global",
            awsRegion: "",
            awsAccessKeyId: "",
            awsSecretAccessKey: "",
            bedrockApiKey: "",
            authMethod: getInitialBedrockAuthMethod({
              mode,
            }),
          },
  });

  const currentAdapter = form.watch("adapter");
  const currentAuthMethod = form.watch("authMethod");
  const isKeepingCurrentBedrockAuthMethod =
    mode === "update" &&
    currentAdapter === LLMAdapter.Bedrock &&
    isMatchingBedrockAuthMethod(currentAuthMethod, existingKey?.authMethod);
  const isUsingDefaultAwsCredentialsForCurrentAuthMethod =
    currentAuthMethod === AuthMethod.AccessKeys &&
    existingKey?.authMethod === AuthMethod.DefaultCredentials;

  const hasAdvancedSettings = (adapter: LLMAdapter) =>
    adapter === LLMAdapter.OpenAI ||
    adapter === LLMAdapter.Anthropic ||
    adapter === LLMAdapter.VertexAI ||
    adapter === LLMAdapter.GoogleAIStudio;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customModels",
  });

  const {
    fields: headerFields,
    append: appendHeader,
    remove: removeHeader,
  } = useFieldArray({
    control: form.control,
    name: "extraHeaders",
  });

  const renderCustomModelsField = () => (
    <FormField
      control={form.control}
      name="customModels"
      render={() => (
        <FormItem>
          <FormLabel>{t("publicApi.customModels")}</FormLabel>
          <FormDescription>
            {t("publicApi.customModelsDescription")}
          </FormDescription>
          {currentAdapter === LLMAdapter.Azure && (
            <FormDescription className="text-dark-yellow">
              {t("publicApi.azureCustomModelsDescription")}
            </FormDescription>
          )}

          {currentAdapter === LLMAdapter.Bedrock && (
            <FormDescription className="text-dark-yellow">
              {t("publicApi.bedrockCustomModelsDescription")}
            </FormDescription>
          )}

          {fields.map((customModel, index) => (
            <span key={customModel.id} className="flex flex-row space-x-2">
              <Input
                {...form.register(`customModels.${index}.value`)}
                placeholder={t("publicApi.customModelName", {
                  index: index + 1,
                })}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => remove(index)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => append({ value: "" })}
            className="w-full"
          >
            <PlusIcon className="mr-1.5 -ml-0.5 h-5 w-5" aria-hidden="true" />
            {t("publicApi.addCustomModelName")}
          </Button>
        </FormItem>
      )}
    />
  );

  const renderExtraHeadersField = () => (
    <FormField
      control={form.control}
      name="extraHeaders"
      render={() => (
        <FormItem>
          <FormLabel>{t("publicApi.extraHeaders")}</FormLabel>
          <FormDescription>
            {isLangfuseCloud
              ? t("publicApi.extraHeadersDescriptionServers")
              : t("publicApi.extraHeadersDescriptionDatabase")}
          </FormDescription>

          {headerFields.map((header, index) => (
            <div key={header.id} className="flex flex-row space-x-2">
              <Input
                {...form.register(`extraHeaders.${index}.key`)}
                placeholder={t("publicApi.headerName")}
              />
              <Input
                {...form.register(`extraHeaders.${index}.value`)}
                placeholder={
                  mode === "update" &&
                  existingKey?.extraHeaderKeys &&
                  existingKey.extraHeaderKeys[index]
                    ? "***"
                    : t("publicApi.headerValue")
                }
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeHeader(index)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            onClick={() => appendHeader({ key: "", value: "" })}
            className="w-full"
          >
            <PlusIcon className="mr-1.5 -ml-0.5 h-5 w-5" aria-hidden="true" />
            {t("publicApi.addHeader")}
          </Button>
        </FormItem>
      )}
    />
  );

  // Disable provider and adapter fields in update mode
  const isFieldDisabled = (fieldName: string) => {
    if (mode !== "update") return false;
    return ["provider", "adapter"].includes(fieldName);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!projectId) return console.error("No project ID found.");

    if (mode === "create") {
      if (
        existingKeys?.data?.data
          .map((k) => k.provider)
          .includes(values.provider)
      ) {
        form.setError("provider", {
          type: "manual",
          message: t("publicApi.validation.providerKeyExists"),
        });
        return;
      }
      capture("project_settings:llm_api_key_create", {
        provider: values.provider,
      });
    } else {
      capture("project_settings:llm_api_key_update", {
        provider: values.provider,
      });
    }

    let secretKey = values.secretKey;
    let config: BedrockConfig | VertexAIConfig | undefined;

    if (currentAdapter === LLMAdapter.Bedrock) {
      const shouldPreserveExistingBedrockCredentials =
        mode === "update" &&
        isMatchingBedrockAuthMethod(values.authMethod, existingKey?.authMethod);

      switch (values.authMethod) {
        case AuthMethod.ApiKey:
          secretKey =
            shouldPreserveExistingBedrockCredentials && !values.bedrockApiKey
              ? undefined
              : JSON.stringify({
                  apiKey: values.bedrockApiKey!,
                } satisfies BedrockApiKey);
          break;
        case AuthMethod.AccessKeys:
          if (!values.awsAccessKeyId && !values.awsSecretAccessKey) {
            secretKey = shouldPreserveExistingBedrockCredentials
              ? undefined
              : BEDROCK_USE_DEFAULT_CREDENTIALS;
          } else {
            secretKey = JSON.stringify({
              accessKeyId: values.awsAccessKeyId!,
              secretAccessKey: values.awsSecretAccessKey!,
            } satisfies BedrockAccessKeys);
          }
          break;
      }

      config = {
        region: values.awsRegion ?? "",
      };
    } else if (currentAdapter === LLMAdapter.VertexAI) {
      // Handle Vertex AI credentials
      // secretKey already contains either JSON key or VERTEXAI_USE_DEFAULT_CREDENTIALS sentinel
      if (mode === "update") {
        // In update mode, only update secretKey if a new one is provided
        if (values.secretKey) {
          secretKey = values.secretKey;
        } else {
          // Keep existing credentials by not setting secretKey
          secretKey = undefined;
        }
      }
      // In create mode, secretKey is already set from values.secretKey

      // Build config with location only (projectId removed for security - ADC auto-detects)
      config = {};
      if (values.vertexAILocation?.trim()) {
        config.location = values.vertexAILocation.trim();
      }
      // If config is empty, set to undefined
      if (Object.keys(config).length === 0) {
        config = undefined;
      }
    }

    const extraHeaders =
      values.extraHeaders.length > 0
        ? values.extraHeaders.reduce(
            (acc, header) => {
              acc[header.key] = header.value ?? "";
              return acc;
            },
            {} as Record<string, string>,
          )
        : undefined;

    const newLlmApiKey = {
      id: existingKey?.id ?? "",
      projectId,
      secretKey: secretKey ?? "",
      provider: values.provider,
      adapter: values.adapter,
      baseURL: values.baseURL || undefined,
      withDefaultModels: isCustomModelsRequired(currentAdapter)
        ? false
        : values.withDefaultModels,
      config,
      customModels: values.customModels
        .map((m) => m.value.trim())
        .filter(Boolean),
      extraHeaders,
    };

    try {
      const testResult =
        mode === "create"
          ? await mutTestLLMApiKey.mutateAsync(newLlmApiKey)
          : await mutTestUpdateLLMApiKey.mutateAsync(newLlmApiKey);

      if (!testResult.success) throw new Error(testResult.error);
    } catch (error) {
      form.setError("root", {
        type: "manual",
        message:
          error instanceof Error
            ? error.message
            : t("publicApi.validation.verifyApiKeyFailed"),
      });

      return;
    }

    return (mode === "create" ? mutCreateLlmApiKey : mutUpdateLlmApiKey)
      .mutateAsync(newLlmApiKey)
      .then(() => {
        form.reset();
        onSuccess();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return (
    <Form {...form}>
      <form
        className={cn("flex flex-col gap-4 overflow-auto")}
        onSubmit={(e) => {
          e.stopPropagation(); // Prevent event bubbling to parent forms
          form.handleSubmit(onSubmit)(e);
        }}
      >
        <DialogBody>
          {/* LLM adapter */}
          <FormField
            control={form.control}
            name="adapter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("publicApi.llmAdapter")}</FormLabel>
                <FormDescription>
                  {t("publicApi.llmAdapterDescription")}
                </FormDescription>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => {
                    field.onChange(value as LLMAdapter);
                    form.setValue(
                      "baseURL",
                      getCustomizedBaseURL(value as LLMAdapter),
                    );
                  }}
                  disabled={isFieldDisabled("adapter")}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("publicApi.selectLlmProvider")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(LLMAdapter).map((provider) => (
                      <SelectItem value={provider} key={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Provider name */}
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("publicApi.providerName")}</FormLabel>
                <FormDescription>
                  {t("publicApi.providerNameDescription")}
                </FormDescription>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={`e.g. ${currentAdapter}`}
                    disabled={isFieldDisabled("provider")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API Key or AWS Credentials or Vertex AI Credentials */}
          {currentAdapter === LLMAdapter.Bedrock ? (
            <>
              <FormField
                control={form.control}
                name="authMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicApi.authenticationMethod")}</FormLabel>
                    <FormDescription>
                      {t("publicApi.bedrockAuthDescription")}
                    </FormDescription>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as BedrockAuthMethod)
                        }
                        className="w-full"
                      >
                        <TabsList
                          className={cn(
                            "grid h-auto w-full gap-1",
                            "grid-cols-2",
                          )}
                        >
                          <TabsTrigger
                            value={AuthMethod.AccessKeys}
                            className="text-xs"
                          >
                            {t("publicApi.awsAccessKeys")}
                          </TabsTrigger>
                          <TabsTrigger
                            value={AuthMethod.ApiKey}
                            className="text-xs"
                          >
                            {t("publicApi.apiKeyLower")}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="awsRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicApi.awsRegion")}</FormLabel>
                    <FormDescription>
                      {mode === "update" &&
                        existingKey?.config &&
                        (existingKey.config as BedrockConfig).region && (
                          <span className="text-sm">
                            Current:{" "}
                            <code className="bg-muted rounded px-1 py-0.5">
                              {(existingKey.config as BedrockConfig).region}
                            </code>
                          </span>
                        )}
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          mode === "update" && existingKey?.config
                            ? ((existingKey.config as BedrockConfig).region ??
                              "")
                            : "e.g., us-east-1"
                        }
                        data-1p-ignore
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentAuthMethod === AuthMethod.ApiKey && (
                <FormField
                  control={form.control}
                  name="bedrockApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("publicApi.bedrockApiKey")}</FormLabel>
                      <FormDescription>
                        {mode === "update" ? (
                          <>
                            Use{" "}
                            <a
                              href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              Amazon Bedrock API keys
                            </a>{" "}
                            to replace the current authentication.
                          </>
                        ) : (
                          <>
                            {t("publicApi.useBedrockApiKeysPrefix")}{" "}
                            <a
                              href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              {t("publicApi.amazonBedrockApiKeys")}
                            </a>
                            .
                          </>
                        )}
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={
                            mode === "update"
                              ? isKeepingCurrentBedrockAuthMethod &&
                                existingKey?.displaySecretKey
                                ? t(
                                    "publicApi.placeholder.preservedUnlessReplaced",
                                    {
                                      value: existingKey.displaySecretKey,
                                    },
                                  )
                                : t("publicApi.placeholder.enterBedrockApiKey")
                              : undefined
                          }
                          autoComplete="new-password"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {currentAuthMethod === AuthMethod.AccessKeys && (
                <>
                  <FormField
                    control={form.control}
                    name="awsAccessKeyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("publicApi.awsAccessKeyId")}
                          {!isLangfuseCloud && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              ({t("common.optional")})
                            </span>
                          )}
                        </FormLabel>
                        <FormDescription>
                          {mode === "update"
                            ? isKeepingCurrentBedrockAuthMethod
                              ? t(
                                  "publicApi.awsAccessKeysKeepExistingDescription",
                                )
                              : t("publicApi.awsAccessKeysProvideBoth")
                            : isLangfuseCloud
                              ? t("publicApi.awsLongLivedCredentials")
                              : t("publicApi.awsOptionalCredentials")}
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={
                              mode === "update"
                                ? isUsingDefaultAwsCredentialsForCurrentAuthMethod
                                  ? t("publicApi.placeholder.usingDefaultAws")
                                  : isKeepingCurrentBedrockAuthMethod
                                    ? t(
                                        "publicApi.placeholder.existingCredentialsPreserved",
                                      )
                                    : t(
                                        "publicApi.placeholder.enterAwsAccessKeyId",
                                      )
                                : undefined
                            }
                            autoComplete="off"
                            data-1p-ignore
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="awsSecretAccessKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("publicApi.awsSecretAccessKey")}
                          {!isLangfuseCloud && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              ({t("common.optional")})
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder={
                              mode === "update"
                                ? isUsingDefaultAwsCredentialsForCurrentAuthMethod
                                  ? t("publicApi.placeholder.usingDefaultAws")
                                  : isKeepingCurrentBedrockAuthMethod &&
                                      existingKey?.displaySecretKey
                                    ? t(
                                        "publicApi.placeholder.preservedIfEmpty",
                                        {
                                          value: existingKey.displaySecretKey,
                                        },
                                      )
                                    : t(
                                        "publicApi.placeholder.enterAwsSecretAccessKey",
                                      )
                                : undefined
                            }
                            autoComplete="new-password"
                            data-1p-ignore
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {!isLangfuseCloud &&
                currentAuthMethod === AuthMethod.AccessKeys && (
                  <div className="text-muted-foreground space-y-2 border-l-2 border-blue-200 pl-4 text-sm">
                    <p>
                      <strong>
                        {t("publicApi.defaultCredentialProviderChain")}
                      </strong>{" "}
                      {t("publicApi.defaultCredentialProviderChainDescription")}
                    </p>
                    <ul className="ml-2 list-inside list-disc space-y-1">
                      <li>{t("publicApi.awsEnvironmentVariables")}</li>
                      <li>{t("publicApi.awsCredentialsFile")}</li>
                      <li>{t("publicApi.iamRolesEc2")}</li>
                      <li>{t("publicApi.iamRolesEcs")}</li>
                    </ul>
                    <p>
                      <a
                        href="https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {t("publicApi.learnMoreAwsCredentialProviders")}
                      </a>
                    </p>
                  </div>
                )}
            </>
          ) : currentAdapter === LLMAdapter.VertexAI ? (
            <>
              {/* Vertex AI ADC option for self-hosted only, create mode only */}
              {!isLangfuseCloud && mode === "create" && (
                <FormItem>
                  <span className="row flex">
                    <span className="flex-1">
                      <FormLabel>{t("publicApi.useAdc")}</FormLabel>
                      <FormDescription>
                        {t("publicApi.useAdcDescription")}
                      </FormDescription>
                    </span>
                    <FormControl>
                      <Switch
                        checked={
                          form.watch("secretKey") ===
                          VERTEXAI_USE_DEFAULT_CREDENTIALS
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            form.setValue(
                              "secretKey",
                              VERTEXAI_USE_DEFAULT_CREDENTIALS,
                            );
                          } else {
                            form.setValue("secretKey", "");
                          }
                        }}
                      />
                    </FormControl>
                  </span>
                </FormItem>
              )}

              {/* Service Account Key - hidden when ADC is enabled */}
              {(isLangfuseCloud ||
                form.watch("secretKey") !==
                  VERTEXAI_USE_DEFAULT_CREDENTIALS) && (
                <FormField
                  control={form.control}
                  name="secretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("publicApi.gcpServiceAccountKeyJson")}
                      </FormLabel>
                      <FormDescription>
                        {isLangfuseCloud
                          ? t("publicApi.keysStoredServers")
                          : t("publicApi.keysStoredDatabase")}
                      </FormDescription>
                      <FormDescription className="text-dark-yellow">
                        {t("publicApi.gcpServiceAccountJsonDescription")}
                        <pre className="text-xs">
                          {`{
  "type": "service_account",
  "project_id": "<project_id>",
  "private_key_id": "<private_key_id>",
  "private_key": "<private_key>",
  "client_email": "<client_email>",
  "client_id": "<client_id>",
  "auth_uri": "<auth_uri>",
  "token_uri": "<token_uri>",
  "auth_provider_x509_cert_url": "<auth_provider_x509_cert_url>",
  "client_x509_cert_url": "<client_x509_cert_url>",
}`}
                        </pre>
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            mode === "update"
                              ? existingKey?.displaySecretKey
                              : '{"type": "service_account", ...}'
                          }
                          autoComplete="off"
                          spellCheck="false"
                          autoCapitalize="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* ADC info box for self-hosted */}
              {!isLangfuseCloud &&
                form.watch("secretKey") ===
                  VERTEXAI_USE_DEFAULT_CREDENTIALS && (
                  <div className="text-muted-foreground space-y-2 border-l-2 border-blue-200 pl-4 text-sm">
                    <p>
                      <strong>{t("publicApi.useAdc")}</strong>{" "}
                      {t("publicApi.defaultCredentialProviderChainDescription")}
                    </p>
                    <ul className="ml-2 list-inside list-disc space-y-1">
                      <li>
                        Environment variable (GOOGLE_APPLICATION_CREDENTIALS)
                      </li>
                      <li>
                        gcloud CLI credentials (gcloud auth application-default
                        login)
                      </li>
                      <li>{t("publicApi.gkeWorkloadIdentity")}</li>
                      <li>{t("publicApi.cloudRunServiceAccount")}</li>
                      <li>{t("publicApi.gceInstanceServiceAccount")}</li>
                    </ul>
                    <p>
                      <a
                        href="https://cloud.google.com/docs/authentication/application-default-credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        Learn more about GCP Application Default Credentials →
                      </a>
                    </p>
                  </div>
                )}
            </>
          ) : (
            <FormField
              control={form.control}
              name="secretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("publicApi.apiKey")}</FormLabel>
                  <FormDescription>
                    {isLangfuseCloud
                      ? t("publicApi.keysStoredServers")
                      : t("publicApi.keysStoredDatabase")}
                  </FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        mode === "update"
                          ? existingKey?.displaySecretKey
                          : undefined
                      }
                      autoComplete="off"
                      spellCheck="false"
                      autoCapitalize="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Azure Base URL - Always required for Azure */}
          {currentAdapter === LLMAdapter.Azure && (
            <FormField
              control={form.control}
              name="baseURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("publicApi.apiBaseUrl")}</FormLabel>
                  <FormDescription>
                    {t("publicApi.azureBaseUrlDescription", {
                      instanceName: "{instanceName}",
                    })}
                  </FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("publicApi.placeholder.azureBaseUrl")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Custom models: top-level for Azure/Bedrock */}
          {isCustomModelsRequired(currentAdapter) && renderCustomModelsField()}

          {/* Extra headers - show for Azure in main section (Azure has no advanced settings) */}
          {currentAdapter === LLMAdapter.Azure && renderExtraHeadersField()}

          {hasAdvancedSettings(currentAdapter) && (
            <div className="flex items-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="flex items-center pl-0"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              >
                <span>
                  {showAdvancedSettings
                    ? t("publicApi.hideAdvancedSettings")
                    : t("publicApi.showAdvancedSettings")}
                </span>
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform ${showAdvancedSettings ? "rotate-180" : "rotate-0"}`}
                />
              </Button>
            </div>
          )}

          {hasAdvancedSettings(currentAdapter) && showAdvancedSettings && (
            <div className="space-y-4 border-t pt-4">
              {/* baseURL */}
              <FormField
                control={form.control}
                name="baseURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicApi.apiBaseUrl")}</FormLabel>
                    <FormDescription>
                      {t("publicApi.advancedBaseUrlDescription")}{" "}
                      {currentAdapter === LLMAdapter.OpenAI && (
                        <span>{t("publicApi.openAiDefaultBaseUrl")}</span>
                      )}
                      {currentAdapter === LLMAdapter.Anthropic && (
                        <span>{t("publicApi.anthropicDefaultBaseUrl")}</span>
                      )}
                    </FormDescription>

                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("publicApi.placeholder.default")}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VertexAI Location */}
              {currentAdapter === LLMAdapter.VertexAI && (
                <FormField
                  control={form.control}
                  name="vertexAILocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("publicApi.locationOptional")}</FormLabel>
                      <FormDescription>
                        {t("publicApi.vertexLocationDescription")}
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("publicApi.placeholder.global")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Extra Headers */}
              {[LLMAdapter.OpenAI, LLMAdapter.Anthropic].includes(
                currentAdapter,
              ) && renderExtraHeadersField()}

              {/* With default models */}
              <FormField
                control={form.control}
                name="withDefaultModels"
                render={({ field }) => (
                  <FormItem>
                    <span className="row flex">
                      <span className="flex-1">
                        <FormLabel>
                          {t("publicApi.enableDefaultModels")}
                        </FormLabel>
                        <FormDescription>
                          {t("publicApi.defaultModelsDescription")}
                        </FormDescription>
                      </span>

                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </span>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom model names */}
              {!isCustomModelsRequired(currentAdapter) &&
                renderCustomModelsField()}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <div className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              loading={form.formState.isSubmitting}
            >
              {mode === "create"
                ? t("publicApi.createConnection")
                : t("publicApi.saveChanges")}
            </Button>
            {form.formState.errors.root && (
              <FormMessage>{form.formState.errors.root.message}</FormMessage>
            )}
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
