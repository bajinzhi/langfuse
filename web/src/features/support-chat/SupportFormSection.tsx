"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import {
  MESSAGE_TYPES,
  SEVERITIES,
  INTEGRATION_TYPES,
  TopicGroups,
  createSupportFormSchema,
  type IntegrationType,
  type MessageType,
  type Severity,
  type SupportFormSchema,
  type Topic,
} from "./formConstants";

import { api } from "@/src/utils/api";

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
import { RadioGroup } from "@/src/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { useQueryProjectOrOrganization } from "@/src/features/projects/hooks";
import { useMemo, useState } from "react";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/src/components/ui/shadcn-io/dropzone";
import { Paperclip, Loader2, Trash2 } from "lucide-react";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { PLAIN_MAX_FILE_SIZE_BYTES } from "./plain/plainConstants";
import { useI18n } from "@/src/features/i18n";

/** Make RHF generics match the resolver (Zod defaults => input can be undefined) */
type SupportFormInput = z.input<typeof SupportFormSchema>;
type SupportFormValues = z.output<typeof SupportFormSchema>;
type Translate = ReturnType<typeof useI18n>["t"];

/**
 * File upload constraints - single source of truth for validation
 * Uses Plain API's file size limit
 */
const FILE_UPLOAD_CONSTRAINTS = {
  maxFiles: 5,
  maxFileSizeBytes: PLAIN_MAX_FILE_SIZE_BYTES, // 6MB (Plain API limit)
  maxCombinedBytes: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * Validates files against upload constraints
 * @returns {isValid: boolean, error?: string}
 */
function validateFiles(
  files: File[] | undefined,
  t: Translate,
): {
  isValid: boolean;
  error?: string;
} {
  if (!files || files.length === 0) {
    return { isValid: true };
  }

  const { maxFiles, maxFileSizeBytes, maxCombinedBytes } =
    FILE_UPLOAD_CONSTRAINTS;

  // Check file count
  if (files.length > maxFiles) {
    return {
      isValid: false,
      error: t("support.upload.maxFiles", { maxFiles }),
    };
  }

  // Check individual file sizes
  const oversizedFile = files.find((f) => f.size > maxFileSizeBytes);
  if (oversizedFile) {
    const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: t("support.upload.fileTooLargeWithName", {
        fileName: oversizedFile.name,
        maxMB,
      }),
    };
  }

  // Check combined size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > maxCombinedBytes) {
    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    const maxMB = (maxCombinedBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: t("support.upload.totalTooLarge", { totalMB, maxMB }),
    };
  }

  return { isValid: true };
}

/**
 * Converts technical file error messages to user-friendly ones
 */
function formatFileError(error: Error, t: Translate): string {
  const msg = error.message.toLowerCase();
  const { maxFiles, maxFileSizeBytes, maxCombinedBytes } =
    FILE_UPLOAD_CONSTRAINTS;
  const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(0);
  const maxCombinedMB = (maxCombinedBytes / (1024 * 1024)).toFixed(0);

  // File size errors
  if (
    msg.includes("larger than") ||
    msg.includes("10485760") ||
    msg.includes("10mb") ||
    msg.includes("too large")
  ) {
    return t("support.upload.fileTooLarge", { maxMB });
  }

  // File count errors
  if (
    msg.includes("too many") ||
    msg.includes("maxfiles") ||
    msg.includes("5 files")
  ) {
    return t("support.upload.tooManyFiles", { maxFiles });
  }

  // Combined size errors
  if (msg.includes("total") && (msg.includes("50mb") || msg.includes("size"))) {
    return t("support.upload.totalLimit", { maxMB: maxCombinedMB });
  }

  // File type errors
  if (msg.includes("file type") || msg.includes("accept")) {
    return t("support.upload.fileTypeUnsupported");
  }

  return error.message || t("support.upload.failed");
}

export function SupportFormSection({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const { organization, project } = useQueryProjectOrOrganization();
  const supportFormSchema = useMemo(() => createSupportFormSchema(t), [t]);
  const messageTypeLabels = useMemo<Record<MessageType, string>>(
    () => ({
      Question: t("support.messageType.question"),
      Feedback: t("support.messageType.feedback"),
      Bug: t("support.messageType.bug"),
    }),
    [t],
  );
  const severityLabels = useMemo<Record<Severity, string>>(
    () => ({
      "Question or feature request": t(
        "support.severity.questionOrFeatureRequest",
      ),
      "Feature not working as expected": t(
        "support.severity.featureNotWorkingAsExpected",
      ),
      "Feature is not working at all": t(
        "support.severity.featureNotWorkingAtAll",
      ),
      "Outage, data loss, or data breach": t(
        "support.severity.outageDataLossOrBreach",
      ),
    }),
    [t],
  );
  const topicLabels = useMemo<Record<Topic, string>>(
    () => ({
      "Account Changes": t("support.topic.accountChanges"),
      "Account Deletion": t("support.topic.accountDeletion"),
      "Billing / Usage": t("support.topic.billingUsage"),
      "Inviting Users": t("support.topic.invitingUsers"),
      "Set Up SSO": t("support.topic.setUpSso"),
      "Slack Connect Channel": t("support.topic.slackConnectChannel"),
      Observability: t("support.topic.observability"),
      "Prompt Management": t("support.topic.promptManagement"),
      Evaluation: t("support.topic.evaluation"),
      Platform: t("support.topic.platform"),
      Other: t("support.topic.other"),
    }),
    [t],
  );
  const integrationTypeLabels = useMemo<Record<IntegrationType, string>>(
    () => ({
      "Python SDK": t("support.integration.pythonSdk"),
      "TypeScript SDK": t("support.integration.typescriptSdk"),
      "Other SDK": t("support.integration.otherSdk"),
      "Public API": t("support.integration.publicApi"),
      "OpenAI SDK": t("support.integration.openaiSdk"),
      "Vercel AI SDK": t("support.integration.vercelAiSdk"),
      LangChain: t("support.integration.langChain"),
      LangGraph: t("support.integration.langGraph"),
      "OTel Instrumentation": t("support.integration.otelInstrumentation"),
      "LLM Proxy (LiteLLM)": t("support.integration.llmProxy"),
      "3rd Party (Dify / LangFlow / Flowise)": t(
        "support.integration.thirdParty",
      ),
      "Other (please specify)": t("support.integration.otherPleaseSpecify"),
    }),
    [t],
  );

  // Tracks whether we've already warned about a short message
  const [warnedShortOnce, setWarnedShortOnce] = useState(false);

  // Local file state from Dropzone
  const [files, setFiles] = useState<File[] | undefined>(undefined);
  const totalUploadBytes = useMemo(
    () => (files ?? []).reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  // Local submit guard to avoid flicker across multiple mutations
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const form = useForm<SupportFormInput>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      messageType: "Question" as MessageType,
      severity: "Question or feature request",
      topic: "",
      message: "",
      integrationType: "",
    },
    mode: "onSubmit",
  });

  const selectedTopic = form.watch("topic");
  const isProductFeatureTopic = TopicGroups["Product Features"].includes(
    selectedTopic as any,
  );

  const createSupportThread = api.plainRouter.createSupportThread.useMutation({
    onSuccess: (data) => {
      form.reset({
        messageType: "Question",
        severity: "Question or feature request",
        topic: "",
        message: "",
      });
      setWarnedShortOnce(false);
      setFiles(undefined);
      if (data.pylonIssueFailed) {
        showErrorToast(
          t("support.requestNotSent"),
          t("support.contactSupportEmail"),
        );
      } else {
        onSuccess();
      }
    },
    onSettled: () => setIsSubmittingLocal(false),
  });

  const prepareUploads = api.plainRouter.prepareAttachmentUploads.useMutation({
    onError: (error) => {
      setIsSubmittingLocal(false);
      showErrorToast(
        t("support.upload.prepareFailed"),
        error.message || t("support.upload.prepareFailedDescription"),
        "ERROR",
      );
    },
  });

  async function uploadToPlainS3(
    uploadFormUrl: string,
    uploadFormData: { key: string; value: string }[],
    file: File,
  ) {
    const form = new FormData();
    uploadFormData.forEach(({ key, value }) => form.append(key, value));
    form.append("file", file, file.name);
    const res = await fetch(uploadFormUrl, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Attachment upload failed (${res.status} ${res.statusText}) ${text}`,
      );
    }
  }

  async function uploadFilesToPylon(filesToUpload: File[]): Promise<string[]> {
    const filePayloads = await Promise.all(
      filesToUpload.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        return { fileName: file.name, fileBase64: base64 };
      }),
    );

    const res = await fetch("/api/support/upload-attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: filePayloads }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? t("support.upload.pylonFailed"),
      );
    }

    const body = (await res.json()) as { attachment_urls: string[] };
    return body.attachment_urls;
  }

  const onSubmit = async (values: SupportFormInput) => {
    const parsed: SupportFormValues = supportFormSchema.parse(values);
    const msgLen = (parsed.message ?? "").trim().length;

    if (msgLen < 50 && !warnedShortOnce) {
      setWarnedShortOnce(true);
      return;
    }

    try {
      setIsSubmittingLocal(true);

      // Validate files using centralized validation function
      const validation = validateFiles(files, t);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 1) Request presigned S3 upload forms
      const uploadPlans =
        files && files.length
          ? await prepareUploads.mutateAsync({
              files: files.map((f) => ({
                fileName: f.name,
                fileSizeBytes: f.size,
              })),
            })
          : {
              uploads: [] as any[],
              customerId: undefined as string | undefined,
            };

      // 2) Upload blobs to Plain S3 and Pylon in parallel
      let pylonAttachmentUrls: string[] = [];
      if (files && files.length) {
        const plainUploadPromise = Promise.all(
          files.map(async (file, idx) => {
            const plan = uploadPlans.uploads[idx];
            if (!plan) throw new Error(t("support.upload.missingPlan"));
            await uploadToPlainS3(
              plan.uploadFormUrl,
              plan.uploadFormData,
              file,
            );
          }),
        );

        const pylonUploadPromise = uploadFilesToPylon(files).catch((err) => {
          console.warn("Pylon attachment upload failed (best-effort):", err);
          return [] as string[];
        });

        const [, pylonUrls] = await Promise.all([
          plainUploadPromise,
          pylonUploadPromise,
        ]);
        pylonAttachmentUrls = pylonUrls;
      }

      // 3) Create thread with attachmentIds (Plain) and pylonAttachmentUrls (Pylon)
      const attachmentIds =
        uploadPlans.uploads?.map((u: any) => u.attachmentId) ?? [];

      await createSupportThread.mutateAsync({
        messageType: parsed.messageType,
        severity: parsed.severity,
        topic: parsed.topic as any,
        integrationType: parsed.integrationType,
        message: parsed.message,
        url: window.location.href,
        organizationId: organization?.id,
        projectId: project?.id,
        browserMetadata: {
          userAgent: navigator.userAgent,
          platform:
            (
              navigator as Navigator & {
                userAgentData?: { platform?: string };
              }
            ).userAgentData?.platform ?? undefined,
          language: navigator.language,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        },
        attachmentIds,
        pylonAttachmentUrls,
      });
    } catch (err: any) {
      console.error(err);
      setIsSubmittingLocal(false);
      form.setError("message", {
        type: "manual",
        message: err?.message ?? t("support.form.submitFailed"),
      });
    }
  };

  const messageIsShortAfterWarning =
    warnedShortOnce && (form.getValues("message") ?? "").trim().length < 50;

  // --- Compact attachment row helpers
  const totalMB = (totalUploadBytes / (1024 * 1024)).toFixed(2);
  const hasFiles = (files?.length ?? 0) > 0;

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-base font-semibold">
        {t("support.form.title")}
      </div>
      <p className="text-muted-foreground text-sm">
        {t("support.form.description")}
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Message Type */}
          <FormField
            control={form.control}
            name="messageType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("support.form.messageType")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    className="grid grid-cols-3 gap-2"
                    value={field.value ?? "Question"}
                    onValueChange={field.onChange}
                  >
                    {MESSAGE_TYPES.map((v) => (
                      <Button
                        key={v}
                        variant={
                          field.value === v ? "default" : "outline-solid"
                        }
                        className="flex w-full items-center gap-2 text-sm font-normal"
                        size="default"
                        onClick={() => field.onChange(v)}
                      >
                        <span className="truncate">{messageTypeLabels[v]}</span>
                      </Button>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormDescription className="sr-only">
                  {t("support.form.messageTypeDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Severity */}
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("support.form.severity")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("support.form.severityPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {severityLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Topic */}
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("support.form.topic")}</FormLabel>
                <FormControl>
                  <Select
                    value={(field.value as string | undefined) ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("support.form.topicPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="text-muted-foreground mb-2 text-xs font-medium">
                          {t("support.group.productFeatures")}
                        </div>
                        {TopicGroups["Product Features"].map((topic) => (
                          <SelectItem key={topic} value={topic}>
                            {topicLabels[topic]}
                          </SelectItem>
                        ))}
                      </div>
                      <div className="border-t p-2">
                        <div className="text-muted-foreground mb-2 text-xs font-medium">
                          {t("support.group.operations")}
                        </div>
                        {TopicGroups.Operations.map((topic) => (
                          <SelectItem key={topic} value={topic}>
                            {topicLabels[topic]}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Integration Type */}
          {isProductFeatureTopic && (
            <FormField
              control={form.control}
              name="integrationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("support.form.integrationType")}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "support.form.integrationTypePlaceholder",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {INTEGRATION_TYPES.map((it) => (
                          <SelectItem key={it} value={it}>
                            {integrationTypeLabels[it]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Message */}
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("support.form.message")}</FormLabel>
                <div className="text-muted-foreground text-xs">
                  {t("support.form.messageDescription")}
                </div>
                <FormControl>
                  <div className="relative w-full">
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder={
                        isProductFeatureTopic
                          ? t("support.form.placeholderProduct")
                          : t("support.form.placeholderDefault")
                      }
                    />
                  </div>
                </FormControl>

                {messageIsShortAfterWarning && (
                  <p
                    className="mt-2 text-sm text-red-500"
                    role="status"
                    aria-live="polite"
                  >
                    {t("support.form.messageShortWarning")}
                  </p>
                )}

                <FormMessage />

                <Dropzone
                  className="mt-1 border-none p-0 text-left"
                  maxFiles={FILE_UPLOAD_CONSTRAINTS.maxFiles}
                  maxSize={FILE_UPLOAD_CONSTRAINTS.maxFileSizeBytes}
                  onDrop={(accepted) =>
                    setFiles((prev) => {
                      const existing = prev ?? [];
                      const merged = [...existing, ...accepted];
                      const maxFiles = FILE_UPLOAD_CONSTRAINTS.maxFiles;
                      return merged.slice(0, maxFiles);
                    })
                  }
                  onError={(error) => {
                    const userMessage = formatFileError(error, t);
                    showErrorToast(
                      t("support.fileUploadError"),
                      userMessage,
                      "WARNING",
                    );
                  }}
                  src={files}
                >
                  {/* Small, single-line trigger */}
                  <DropzoneEmptyState>
                    <div className="flex w-full cursor-pointer items-center justify-start gap-2 p-2 text-xs">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate">
                        {hasFiles
                          ? t("support.filesSummary", {
                              count: files!.length,
                              totalMB,
                            })
                          : t("support.attachFiles")}
                      </span>
                    </div>
                  </DropzoneEmptyState>
                  {/* Keep content area minimal; we still allow preview slot if needed */}
                  <DropzoneContent>
                    <div className="flex w-full cursor-pointer items-center justify-start gap-2 p-2 text-xs">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate">
                        {t("support.attachFiles")}
                      </span>
                    </div>
                  </DropzoneContent>
                </Dropzone>

                {files && files.length > 0 && (
                  <div className="p-0 text-left text-sm font-medium">
                    <div className="text-muted-foreground mb-2 text-xs font-medium">
                      {t("support.attachedFiles")}
                    </div>
                    {files?.map((file) => (
                      <div
                        key={file.name}
                        className="flex flex-row items-center justify-start gap-2 text-xs"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setFiles(files.filter((f) => f.name !== file.name))
                          }
                          className="p-0"
                        >
                          <span className="sr-only">
                            {t("support.removeFile")}
                          </span>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWarnedShortOnce(false);
                setFiles(undefined);
                onCancel();
              }}
              className="w-full"
            >
              {t("common.cancel")}
            </Button>

            <Button
              type="submit"
              disabled={isSubmittingLocal}
              className="w-full"
            >
              {isSubmittingLocal ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("support.form.submitting")}
                </span>
              ) : messageIsShortAfterWarning ? (
                t("support.form.submitAnyways")
              ) : (
                t("support.form.submit")
              )}
            </Button>
          </div>

          {isSubmittingLocal && (
            <div className="text-muted-foreground text-xs">
              {t("support.form.submittingHint")}
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
