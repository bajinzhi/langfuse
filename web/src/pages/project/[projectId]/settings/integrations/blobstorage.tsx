import Header from "@/src/components/layouts/header";
import ContainerPage from "@/src/components/layouts/container-page";
import { StatusBadge } from "@/src/components/layouts/status-badge";
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
import { PasswordInput } from "@/src/components/ui/password-input";
import { Switch } from "@/src/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/src/components/ui/tooltip";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { getExportSourceOptionText } from "@/src/features/i18n/analyticsIntegrationOptions";
import { useI18n } from "@/src/features/i18n";
import {
  blobStorageIntegrationFormSchema,
  type BlobStorageIntegrationFormSchema,
  type BlobStorageSyncStatus,
} from "@/src/features/blobstorage-integration/types";
import { deriveSyncStatus } from "@/src/features/blobstorage-integration/deriveSyncStatus";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/src/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import {
  BlobStorageIntegrationType,
  BlobStorageIntegrationFileType,
  BlobStorageExportMode,
  AnalyticsIntegrationExportSource,
  type BlobStorageIntegration,
  EXPORT_SOURCE_OPTIONS,
} from "@langfuse/shared";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { Info, ExternalLink } from "lucide-react";

export default function BlobStorageIntegrationSettings() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t, formatDate } = useI18n();
  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "integrations:CRUD",
  });
  const state = api.blobStorageIntegration.get.useQuery(
    { projectId },
    {
      enabled: hasAccess,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 50 * 60 * 1000, // 50 minutes
    },
  );

  const syncStatus =
    state.isLoading || !hasAccess || !state.data
      ? undefined
      : deriveSyncStatus({
          enabled: state.data.enabled,
          lastError: state.data.lastError,
          lastSyncAt: state.data.lastSyncAt
            ? new Date(state.data.lastSyncAt)
            : null,
          nextSyncAt: state.data.nextSyncAt
            ? new Date(state.data.nextSyncAt)
            : null,
        });

  const syncStatusToBadge: Record<BlobStorageSyncStatus, string> = {
    up_to_date: "active",
    queued: "queued",
    idle: "inactive",
    disabled: "disabled",
    error: "error",
  };

  return (
    <ContainerPage
      headerProps={{
        title: t("integrations.blobStorage.title"),
        breadcrumb: [
          { name: t("nav.settings"), href: `/project/${projectId}/settings` },
        ],
        actionButtonsLeft: (
          <>
            {syncStatus && <StatusBadge type={syncStatusToBadge[syncStatus]} />}
          </>
        ),
        actionButtonsRight: (
          <Button asChild variant="secondary">
            <Link
              href="https://langfuse.com/docs/api-and-data-platform/features/export-to-blob-storage"
              target="_blank"
            >
              {t("common.integrationDocs")}
            </Link>
          </Button>
        ),
      }}
    >
      <p className="text-foreground mb-4 text-sm">
        {t("integrations.blobStorage.description")}
      </p>
      {!hasAccess && <p className="text-sm">{t("integrations.noAccess")}</p>}
      {state.data && (
        <>
          <Header title={t("common.status")} />
          {state.data.lastError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>
                {t("integrations.blobStorage.lastExportFailed")}
              </AlertTitle>
              <AlertDescription>
                {state.data.lastError}
                {state.data.lastErrorAt && (
                  <>
                    <br />
                    <span className="text-xs opacity-70">
                      {formatDate(state.data.lastErrorAt, {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Card className="p-3">
            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {t("integrations.blobStorage.dataExportedUpTo")}
              </span>
              <span>
                {state.data.lastSyncAt
                  ? formatDate(state.data.lastSyncAt, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })
                  : t("common.neverPending")}
              </span>
              {state.data.nextSyncAt && (
                <>
                  <span className="text-muted-foreground">
                    {t("integrations.blobStorage.nextExportScheduled")}
                  </span>
                  <span>
                    {formatDate(state.data.nextSyncAt, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                </>
              )}
              <span className="text-muted-foreground">
                {t("integrations.blobStorage.exportMode")}
              </span>
              <span>
                {state.data.exportMode === BlobStorageExportMode.FULL_HISTORY
                  ? t("integrations.blobStorage.fullHistory")
                  : state.data.exportMode === BlobStorageExportMode.FROM_TODAY
                    ? t("integrations.blobStorage.fromSetupDate")
                    : state.data.exportMode ===
                        BlobStorageExportMode.FROM_CUSTOM_DATE
                      ? t("integrations.blobStorage.fromCustomDate")
                      : t("integrations.blobStorage.unknown")}
              </span>
              {(state.data.exportMode ===
                BlobStorageExportMode.FROM_CUSTOM_DATE ||
                state.data.exportMode === BlobStorageExportMode.FROM_TODAY) &&
                state.data.exportStartDate && (
                  <>
                    <span className="text-muted-foreground">
                      {t("integrations.blobStorage.exportStartDate")}
                    </span>
                    <span>{formatDate(state.data.exportStartDate)}</span>
                  </>
                )}
            </div>
          </Card>
        </>
      )}
      {hasAccess && (
        <>
          <Header title={t("common.configuration")} className="mt-8" />
          <Card className="p-3">
            <BlobStorageIntegrationSettingsForm
              state={state.data || undefined}
              projectId={projectId}
              isLoading={state.isLoading}
            />
          </Card>
        </>
      )}
    </ContainerPage>
  );
}

const BlobStorageIntegrationSettingsForm = ({
  state,
  projectId,
  isLoading,
}: {
  state?: Partial<BlobStorageIntegration>;
  projectId: string;
  isLoading: boolean;
}) => {
  const capture = usePostHogClientCapture();
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const { isBetaEnabled } = useV4Beta();
  const { t } = useI18n();
  const [integrationType, setIntegrationType] =
    useState<BlobStorageIntegrationType>(BlobStorageIntegrationType.S3);

  // Check if this is a self-hosted instance (no cloud region set)
  const isSelfHosted = !isLangfuseCloud;

  const blobStorageForm = useForm({
    resolver: zodResolver(blobStorageIntegrationFormSchema),
    defaultValues: {
      type: state?.type || BlobStorageIntegrationType.S3,
      bucketName: state?.bucketName || "",
      endpoint: state?.endpoint || null,
      region: state?.region || "",
      accessKeyId: state?.accessKeyId || "",
      secretAccessKey: state?.secretAccessKey || null,
      prefix: state?.prefix || "",
      exportFrequency: (state?.exportFrequency || "daily") as
        | "every_20_minutes"
        | "daily"
        | "weekly"
        | "hourly",
      enabled: state?.enabled || false,
      forcePathStyle: state?.forcePathStyle || false,
      fileType: state?.fileType || BlobStorageIntegrationFileType.JSONL,
      exportMode: state?.exportMode || BlobStorageExportMode.FULL_HISTORY,
      exportStartDate: state?.exportStartDate || null,
      exportSource:
        state?.exportSource ||
        (isBetaEnabled
          ? AnalyticsIntegrationExportSource.EVENTS
          : AnalyticsIntegrationExportSource.TRACES_OBSERVATIONS),
      compressed: state?.compressed ?? true,
    },
    disabled: isLoading,
  });

  useEffect(() => {
    setIntegrationType(state?.type || BlobStorageIntegrationType.S3);
    blobStorageForm.reset({
      type: state?.type || BlobStorageIntegrationType.S3,
      bucketName: state?.bucketName || "",
      endpoint: state?.endpoint || null,
      region: state?.region || "auto",
      accessKeyId: state?.accessKeyId || "",
      secretAccessKey: state?.secretAccessKey || null,
      prefix: state?.prefix || "",
      exportFrequency: (state?.exportFrequency || "daily") as
        | "every_20_minutes"
        | "daily"
        | "weekly"
        | "hourly",
      enabled: state?.enabled || false,
      forcePathStyle: state?.forcePathStyle || false,
      fileType: state?.fileType || BlobStorageIntegrationFileType.JSONL,
      exportMode: state?.exportMode || BlobStorageExportMode.FULL_HISTORY,
      exportStartDate: state?.exportStartDate || null,
      exportSource:
        state?.exportSource ||
        (isBetaEnabled
          ? AnalyticsIntegrationExportSource.EVENTS
          : AnalyticsIntegrationExportSource.TRACES_OBSERVATIONS),
      compressed: state?.compressed ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const utils = api.useUtils();
  const mut = api.blobStorageIntegration.update.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutDelete = api.blobStorageIntegration.delete.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutRunNow = api.blobStorageIntegration.runNow.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutValidate = api.blobStorageIntegration.validate.useMutation({
    onSuccess: (data) => {
      showSuccessToast({
        title: data.message,
        description: t("integrations.blobStorage.testFile", {
          fileName: data.testFileName,
        }),
      });
    },
    onError: (error) => {
      showErrorToast(
        t("integrations.blobStorage.validationFailed"),
        error.message,
      );
    },
  });

  async function onSubmit(values: BlobStorageIntegrationFormSchema) {
    capture("integrations:blob_storage_form_submitted");
    mut.mutate({
      projectId,
      ...values,
    });
  }

  const handleIntegrationTypeChange = (value: BlobStorageIntegrationType) => {
    setIntegrationType(value);
    blobStorageForm.setValue("type", value);
  };

  return (
    <Form {...blobStorageForm}>
      <form
        className="space-y-3"
        onSubmit={blobStorageForm.handleSubmit(onSubmit)}
      >
        <FormField
          control={blobStorageForm.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("integrations.blobStorage.storageProvider")}
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    handleIntegrationTypeChange(
                      value as BlobStorageIntegrationType,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("integrations.blobStorage.selectProvider")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S3">
                      {t("integrations.blobStorage.providerS3")}
                    </SelectItem>
                    <SelectItem value="S3_COMPATIBLE">
                      {t("integrations.blobStorage.providerS3Compatible")}
                    </SelectItem>
                    <SelectItem value="AZURE_BLOB_STORAGE">
                      {t("integrations.blobStorage.providerAzure")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                {t("integrations.blobStorage.chooseCloudProvider")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="bucketName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.containerName")
                  : t("integrations.blobStorage.bucketName")}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.azureContainerDescription")
                  : t("integrations.blobStorage.s3BucketDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Endpoint URL field - Only shown for S3-compatible and Azure */}
        {integrationType !== "S3" && (
          <FormField
            control={blobStorageForm.control}
            name="endpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("integrations.blobStorage.endpointUrl")}
                </FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  {integrationType === "AZURE_BLOB_STORAGE"
                    ? t("integrations.blobStorage.azureEndpointDescription")
                    : t("integrations.blobStorage.s3EndpointDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Region field - Only shown for AWS S3 or compatible storage */}
        {integrationType !== "AZURE_BLOB_STORAGE" && (
          <FormField
            control={blobStorageForm.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("integrations.blobStorage.region")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  {integrationType === "S3"
                    ? t("integrations.blobStorage.awsRegionDescription")
                    : t("integrations.blobStorage.s3RegionDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Force Path Style switch - Only shown for S3-compatible */}
        {integrationType === "S3_COMPATIBLE" && (
          <FormField
            control={blobStorageForm.control}
            name="forcePathStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("integrations.blobStorage.forcePathStyle")}
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-1 ml-4"
                  />
                </FormControl>
                <FormDescription>
                  {t("integrations.blobStorage.forcePathStyleDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={blobStorageForm.control}
          name="accessKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.storageAccountName")
                  : integrationType === "S3"
                    ? t("integrations.blobStorage.awsAccessKeyId")
                    : t("integrations.blobStorage.accessKeyId")}
                {/* Show optional indicator for S3 types on self-hosted instances with entitlement */}
                {isSelfHosted && integrationType === "S3" && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({t("common.optional")})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.azureAccountNameDescription")
                  : integrationType === "S3"
                    ? isSelfHosted
                      ? t(
                          "integrations.blobStorage.awsAccessKeySelfHostedDescription",
                        )
                      : t("integrations.blobStorage.awsAccessKeyDescription")
                    : t("integrations.blobStorage.s3AccessKeyDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="secretAccessKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.storageAccountKey")
                  : integrationType === "S3"
                    ? t("integrations.blobStorage.awsSecretAccessKey")
                    : t("integrations.blobStorage.secretAccessKey")}
                {/* Show optional indicator for S3 types on self-hosted instances with entitlement */}
                {isSelfHosted && integrationType === "S3" && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({t("common.optional")})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="********************"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.azureAccountKeyDescription")
                  : integrationType === "S3"
                    ? isSelfHosted
                      ? t(
                          "integrations.blobStorage.awsSecretAccessKeySelfHostedDescription",
                        )
                      : t(
                          "integrations.blobStorage.awsSecretAccessKeyDescription",
                        )
                    : t(
                        "integrations.blobStorage.s3SecretAccessKeyDescription",
                      )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("integrations.blobStorage.exportPrefix")}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? t("integrations.blobStorage.azurePrefixDescription")
                  : integrationType === "S3"
                    ? t("integrations.blobStorage.s3PrefixDescription")
                    : t("integrations.blobStorage.genericPrefixDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="exportFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("integrations.blobStorage.exportFrequency")}
              </FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "integrations.blobStorage.selectFrequency",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="every_20_minutes">
                      {t("integrations.blobStorage.every20Minutes")}
                    </SelectItem>
                    <SelectItem value="hourly">
                      {t("integrations.blobStorage.hourly")}
                    </SelectItem>
                    <SelectItem value="daily">
                      {t("integrations.blobStorage.daily")}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {t("integrations.blobStorage.weekly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                {t("integrations.blobStorage.exportFrequencyDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="fileType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("integrations.blobStorage.fileType")}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("integrations.blobStorage.selectFileType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSONL">
                      {t("integrations.blobStorage.fileTypeJsonl")}
                    </SelectItem>
                    <SelectItem value="CSV">
                      {t("integrations.blobStorage.fileTypeCsv")}
                    </SelectItem>
                    <SelectItem value="JSON">
                      {t("integrations.blobStorage.fileTypeJson")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                {t("integrations.blobStorage.fileTypeDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="exportMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("integrations.blobStorage.exportMode")}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "integrations.blobStorage.selectExportMode",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BlobStorageExportMode.FULL_HISTORY}>
                      {t("integrations.blobStorage.fullHistory")}
                    </SelectItem>
                    <SelectItem value={BlobStorageExportMode.FROM_TODAY}>
                      {t("integrations.blobStorage.today")}
                    </SelectItem>
                    <SelectItem value={BlobStorageExportMode.FROM_CUSTOM_DATE}>
                      {t("integrations.blobStorage.customDate")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                {t("integrations.blobStorage.exportModeDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBetaEnabled && (
          <FormField
            control={blobStorageForm.control}
            name="exportSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 pt-2">
                  {t("integrations.exportSource")}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="text-muted-foreground h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-[350px] space-y-2 p-3"
                    >
                      {EXPORT_SOURCE_OPTIONS.map((option) => (
                        <div key={option.value} className="space-y-0.5">
                          <div className="font-medium">
                            {getExportSourceOptionText(t, option.value).label}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {
                              getExportSourceOptionText(t, option.value)
                                .description
                            }
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2">
                        <a
                          href="https://langfuse.com/docs/integrations/export-sources"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs hover:underline"
                        >
                          {t("integrations.exportSourceDocs")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("integrations.dataToExport")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPORT_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getExportSourceOptionText(t, option.value).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("integrations.exportSourceDescription", {
                    destination: t("integrations.blobStorage.cardTitle"),
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {blobStorageForm.watch("exportMode") ===
          BlobStorageExportMode.FROM_CUSTOM_DATE && (
          <FormField
            control={blobStorageForm.control}
            name="exportStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("integrations.blobStorage.exportStartDate")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value)
                        : null;
                      field.onChange(date);
                    }}
                    placeholder={t("integrations.blobStorage.selectStartDate")}
                  />
                </FormControl>
                <FormDescription>
                  {t("integrations.blobStorage.dataBeforeDateExcluded")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={blobStorageForm.control}
          name="compressed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("integrations.blobStorage.gzipCompression")}
              </FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1 ml-4"
                />
              </FormControl>
              <FormDescription>
                {t("integrations.blobStorage.gzipCompressionDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("common.enabled")}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1 ml-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
      <div className="mt-8 flex gap-2">
        <Button
          loading={mut.isPending}
          onClick={blobStorageForm.handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {t("common.save")}
        </Button>
        <Button
          variant="secondary"
          loading={mutValidate.isPending}
          disabled={isLoading || !state}
          title={t("integrations.blobStorage.validateTooltip")}
          onClick={() => {
            mutValidate.mutate({ projectId });
          }}
        >
          {t("integrations.blobStorage.validate")}
        </Button>
        <Button
          variant="secondary"
          loading={mutRunNow.isPending}
          disabled={isLoading || !state?.enabled}
          title={t("integrations.blobStorage.runNowTooltip")}
          onClick={() => {
            if (confirm(t("integrations.blobStorage.runNowConfirm")))
              mutRunNow.mutate({ projectId });
          }}
        >
          {t("integrations.blobStorage.runNow")}
        </Button>
        <Button
          variant="ghost"
          loading={mutDelete.isPending}
          disabled={isLoading || !!!state}
          onClick={() => {
            if (confirm(t("integrations.blobStorage.resetConfirm")))
              mutDelete.mutate({ projectId });
          }}
        >
          {t("common.reset")}
        </Button>
      </div>
    </Form>
  );
};
