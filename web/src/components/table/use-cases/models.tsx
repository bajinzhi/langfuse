import { DataTable } from "@/src/components/table/data-table";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import useColumnVisibility from "@/src/features/column-visibility/hooks/useColumnVisibility";
import { api } from "@/src/utils/api";
import { safeExtract } from "@/src/utils/map-utils";
import { type Prisma } from "@langfuse/shared/src/db";
import { useQueryParams, withDefault, StringParam } from "use-query-params";
import { usePaginationState } from "@/src/hooks/usePaginationState";
import { IOTableCell } from "../../ui/IOTableCell";
import { useRowHeightLocalStorage } from "@/src/components/table/data-table-row-height-switch";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import useColumnOrder from "@/src/features/column-visibility/hooks/useColumnOrder";
import { type GetModelResult } from "@/src/features/models/validation";
import { DeleteModelButton } from "@/src/features/models/components/DeleteModelButton";
import { EditModelButton } from "@/src/features/models/components/EditModelButton";
import { CloneModelButton } from "@/src/features/models/components/CloneModelButton";
import { PriceBreakdownTooltip } from "@/src/features/models/components/PriceBreakdownTooltip";
import { UserCircle2Icon, PlusIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { Skeleton } from "@/src/components/ui/skeleton";
import { LangfuseIcon } from "@/src/components/LangfuseLogo";
import { useRouter } from "next/router";
import { PriceUnitSelector } from "@/src/features/models/components/PriceUnitSelector";
import { getPriceUnitLabel } from "@/src/features/models/components/PriceUnitSelector";
import { usePriceUnitMultiplier } from "@/src/features/models/hooks/usePriceUnitMultiplier";
import { UpsertModelFormDialog } from "@/src/features/models/components/UpsertModelFormDialog";
import { TestModelMatchButton } from "@/src/features/models/components/test-match/TestModelMatchButton";
import { ActionButton } from "@/src/components/ActionButton";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { SettingsTableCard } from "@/src/components/layouts/settings-table-card";
import { useI18n } from "@/src/features/i18n";

export type ModelTableRow = {
  modelId: string;
  maintainer: string;
  modelName: string;
  matchPattern: string;
  prices?: Record<string, number>;
  tokenizerId?: string;
  config?: Prisma.JsonValue;
  serverResponse: GetModelResult;
};

export default function ModelTable({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const capture = usePostHogClientCapture();
  const [paginationState, setPaginationState] = usePaginationState(0, 50, {
    page: "pageIndex",
    limit: "pageSize",
  });
  const [queryParams, setQueryParams] = useQueryParams({
    search: withDefault(StringParam, ""),
  });
  const searchString = queryParams.search;
  const models = api.models.getAll.useQuery(
    {
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
      projectId,
      searchString,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 10,
    },
  );
  const totalCount = models.data?.totalCount ?? null;

  const modelIds = models.data?.models.map((m) => m.id) ?? [];
  const lastUsed = api.models.lastUsedByModelIds.useQuery(
    { projectId, modelIds },
    {
      enabled: models.isSuccess && modelIds.length > 0,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 10,
    },
  );
  const { priceUnit } = usePriceUnitMultiplier();
  const [rowHeight, setRowHeight] = useRowHeightLocalStorage("models", "m");

  const hasWriteAccess = useHasProjectAccess({
    projectId,
    scope: "models:CUD",
  });

  const columns: LangfuseColumnDef<ModelTableRow>[] = [
    {
      accessorKey: "modelName",
      id: "modelName",
      header: t("models.table.modelName"),
      headerTooltip: {
        description: t("models.table.modelNameDescription"),
      },
      cell: ({ row }) => {
        return (
          <span className="truncate font-mono text-xs font-semibold">
            {row.original.modelName}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: "maintainer",
      id: "maintainer",
      header: t("models.table.maintainer"),
      headerTooltip: {
        description: t("models.table.maintainerDescription"),
      },
      size: 60,
      cell: ({ row }) => {
        const isLangfuse = row.original.maintainer === "Langfuse";
        return (
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger>
                {isLangfuse ? (
                  <LangfuseIcon size={16} />
                ) : (
                  <UserCircle2Icon className="h-4 w-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {isLangfuse
                  ? t("models.maintainer.langfuseMaintained")
                  : t("models.maintainer.userMaintained")}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
    {
      accessorKey: "matchPattern",
      id: "matchPattern",
      headerTooltip: {
        description: t("models.table.matchPatternDescription"),
      },
      header: t("models.table.matchPattern"),
      size: 200,
      cell: ({ row }) => {
        const value: string = row.getValue("matchPattern");

        return value ? (
          <span className="truncate font-mono text-xs">{value}</span>
        ) : null;
      },
    },
    {
      accessorKey: "prices",
      id: "prices",
      header: () => {
        return (
          <div className="flex items-center gap-2">
            <span>
              {t("models.tiers.prices")} {getPriceUnitLabel(priceUnit, t)}
            </span>
            <PriceUnitSelector />
          </div>
        );
      },
      size: 120,
      cell: ({ row }) => {
        const prices: Record<string, number> | undefined =
          row.getValue("prices");

        return (
          <PriceBreakdownTooltip
            modelName={row.original.modelName}
            prices={prices}
            priceUnit={priceUnit}
            rowHeight={rowHeight}
          />
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "tokenizerId",
      id: "tokenizerId",
      header: t("models.table.tokenizer"),
      headerTooltip: {
        description: t("models.table.tokenizerDescription"),
      },
      enableHiding: true,
      size: 120,
    },
    {
      accessorKey: "config",
      id: "config",
      header: t("models.table.tokenizerConfiguration"),
      headerTooltip: {
        description: t("models.table.configDescription"),
      },
      enableHiding: true,
      size: 120,
      cell: ({ row }) => {
        const value: Prisma.JsonValue | undefined = row.getValue("config");

        return value ? (
          <IOTableCell data={value} singleLine={rowHeight === "s"} />
        ) : null;
      },
    },
    {
      accessorKey: "lastUsed",
      id: "lastUsed",
      header: t("models.table.lastUsed"),
      headerTooltip: {
        description: t("models.table.lastUsedDescription"),
      },
      enableHiding: true,
      size: 120,
      cell: ({ row }) => {
        if (!lastUsed.data) return <Skeleton className="h-4 w-20" />;
        const value = lastUsed.data[row.original.modelId];
        return value?.toLocaleString() ?? "";
      },
    },
    {
      accessorKey: "actions",
      header: t("models.table.actions"),
      size: 120,
      cell: ({ row }) => {
        return row.original.maintainer !== "Langfuse" ? (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <EditModelButton
              projectId={projectId}
              modelData={row.original.serverResponse}
            />
            <DeleteModelButton
              projectId={projectId}
              modelData={row.original.serverResponse}
            />
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <CloneModelButton
              projectId={projectId}
              modelData={row.original.serverResponse}
            />
          </div>
        );
      },
    },
  ];

  const [columnVisibility, setColumnVisibility] =
    useColumnVisibility<ModelTableRow>("modelsColumnVisibility", columns);

  const [columnOrder, setColumnOrder] = useColumnOrder<ModelTableRow>(
    "modelsColumnOrder",
    columns,
  );

  const convertToTableRow = (model: GetModelResult): ModelTableRow => {
    // Get default tier prices for backward compatibility
    const defaultTier = model.pricingTiers.find((t) => t.isDefault);
    const prices = defaultTier?.prices;

    return {
      modelId: model.id,
      maintainer: model.projectId ? "User" : "Langfuse",
      modelName: model.modelName,
      matchPattern: model.matchPattern,
      prices,
      tokenizerId: model.tokenizerId ?? undefined,
      config: model.tokenizerConfig,
      serverResponse: model,
    };
  };

  return (
    <>
      <DataTableToolbar
        columns={columns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
        rowHeight={rowHeight}
        setRowHeight={setRowHeight}
        searchConfig={{
          updateQuery: (event: string) => {
            setQueryParams({ search: event });
          },
          tableAllowsFullTextSearch: true,
          currentQuery: searchString,
        }}
        actionButtons={
          <>
            <TestModelMatchButton projectId={projectId} />
            <UpsertModelFormDialog {...{ projectId, action: "create" }}>
              <ActionButton
                variant="secondary"
                icon={<PlusIcon className="h-4 w-4" />}
                hasAccess={hasWriteAccess}
                onClick={() => capture("models:new_form_open")}
              >
                {t("models.addDefinition")}
              </ActionButton>
            </UpsertModelFormDialog>
          </>
        }
        className="px-0"
      />
      <SettingsTableCard className="max-h-[75dvh]">
        <DataTable
          tableName={"models"}
          columns={columns}
          data={
            models.isPending
              ? { isLoading: true, isError: false }
              : models.isError
                ? {
                    isLoading: false,
                    isError: true,
                    error: models.error.message,
                  }
                : {
                    isLoading: false,
                    isError: false,
                    data: safeExtract(models.data, "models", []).map((t) =>
                      convertToTableRow(t),
                    ),
                  }
          }
          pagination={{
            totalCount,
            onChange: setPaginationState,
            state: paginationState,
          }}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          rowHeight={rowHeight}
          cellPadding="comfortable"
          onRowClick={(row) => {
            router.push(`/project/${projectId}/settings/models/${row.modelId}`);
          }}
        />
      </SettingsTableCard>
    </>
  );
}
