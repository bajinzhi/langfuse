import { StatusBadge } from "@/src/components/layouts/status-badge";
import { LevelCountsDisplay } from "@/src/components/level-counts-display";
import { DataTable } from "@/src/components/table/data-table";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import {
  DataTableControlsProvider,
  DataTableControls,
} from "@/src/components/table/data-table-controls";
import { ResizableFilterLayout } from "@/src/components/table/resizable-filter-layout";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import useColumnVisibility from "@/src/features/column-visibility/hooks/useColumnVisibility";
import { InlineFilterState } from "@/src/features/filters/components/filter-builder";
import { useDetailPageLists } from "@/src/features/navigate-detail-pages/context";
import { useSidebarFilterState } from "@/src/features/filters/hooks/useSidebarFilterState";
import { getEvaluatorFilterConfig } from "@/src/features/filters/config/evaluators-config";
import { api } from "@/src/utils/api";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useState, useMemo } from "react";
import { useQueryParam, StringParam, withDefault } from "use-query-params";
import { usePaginationState } from "@/src/hooks/usePaginationState";
import {
  isLegacyEvalTarget,
  isEventTarget,
} from "@/src/features/evals/utils/typeHelpers";
import { useOrderByState } from "@/src/features/orderBy/hooks/useOrderByState";
import TableIdOrName from "@/src/components/table/table-id";
import {
  MoreVertical,
  Loader2,
  ExternalLinkIcon,
  Edit,
  Info,
} from "lucide-react";
import { usePeekNavigation } from "@/src/components/table/peek/hooks/usePeekNavigation";
import { PeekViewEvaluatorConfigDetail } from "@/src/components/table/peek/peek-evaluator-config-detail";
import { TablePeekView } from "@/src/components/table/peek";
import { evalConfigTargetValues } from "@/src/server/api/definitions/evalConfigsTable";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Button } from "@/src/components/ui/button";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { EvaluatorForm } from "@/src/features/evals/components/evaluator-form";
import { useRouter } from "next/router";
import { DeleteEvalConfigButton } from "@/src/components/deleteButton";
import { MaintainerTooltip } from "@/src/features/evals/components/maintainer-tooltip";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { Skeleton } from "@/src/components/ui/skeleton";
import { CurrencyAmount } from "@/src/features/currency/CurrencyAmount";
import { Callout } from "@/src/components/ui/callout";
import Link from "next/link";
import { Badge } from "@/src/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  type EvaluatorDataRow,
  useEvaluatorTableData,
} from "@/src/features/evals/hooks/useEvaluatorTableData";
import { useI18n } from "@/src/features/i18n";

function LegacyBadgeCell({ status }: { status: string }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="warning">
        {t("evals.legacy.badge")}
        {status === "ACTIVE" && (
          <Tooltip>
            <TooltipTrigger>
              <Info className="text-dark-yellow ml-1 h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {t("evals.legacy.actionRequired")}
                </p>
                <p className="text-muted-foreground">
                  {t("evals.legacy.tooltipDescriptionBefore")}{" "}
                  <Link
                    href="https://langfuse.com/faq/all/llm-as-a-judge-migration"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark-blue font-medium hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {t("evals.legacy.thisGuide")}
                  </Link>{" "}
                  {t("evals.legacy.tooltipDescriptionAfter")}
                  <br />
                  <br />
                  {t("evals.legacy.tooltipStillRuns")}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </Badge>
    </div>
  );
}

export default function EvaluatorTable({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const evaluatorFilterConfig = useMemo(() => getEvaluatorFilterConfig(t), [t]);
  const { setDetailPageList } = useDetailPageLists();
  const [paginationState, setPaginationState] = usePaginationState(0, 50, {
    page: "pageIndex",
    limit: "pageSize",
  });
  const [searchQuery, setSearchQuery] = useQueryParam(
    "search",
    withDefault(StringParam, null),
  );
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const utils = api.useUtils();

  const [orderByState, setOrderByState] = useOrderByState({
    column: "status",
    order: "ASC",
  });

  const newFilterOptions = {
    status: ["ACTIVE", "PAUSED", "INACTIVE"],
    target: evalConfigTargetValues,
  };

  const queryFilter = useSidebarFilterState(
    evaluatorFilterConfig,
    newFilterOptions,
    {
      loading: false,
      stateLocation: "urlAndSessionStorage",
      sessionFilterContextId: projectId,
    },
  );

  const { evaluators, rows, totalCount, hasLegacyEvals } =
    useEvaluatorTableData({
      projectId,
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
      filter: queryFilter.filterState,
      orderBy: orderByState,
      searchQuery,
    });

  const existingEvaluator = api.evals.configById.useQuery(
    {
      id: editConfigId as string,
      projectId,
    },
    {
      enabled: !!editConfigId,
    },
  );

  const hasAccess = useHasProjectAccess({ projectId, scope: "evalJob:CUD" });

  const datasets = api.datasets.allDatasetMeta.useQuery({ projectId });

  useEffect(() => {
    if (evaluators.isSuccess) {
      const { configs: configList = [] } = evaluators.data ?? {};
      setDetailPageList(
        "evals",
        configList.map((evaluator) => ({ id: evaluator.id })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluators.isSuccess, evaluators.data]);

  const columnHelper = createColumnHelper<EvaluatorDataRow>();
  const columns = [
    columnHelper.accessor("scoreName", {
      id: "scoreName",
      header: t("evals.evaluatorTable.generatedScoreName"),
      size: 200,
      cell: (row) => {
        const scoreName = row.getValue();
        return scoreName ? <TableIdOrName value={scoreName} /> : undefined;
      },
    }),
    columnHelper.accessor("status", {
      header: t("evals.logs.status"),
      id: "status",
      size: 80,
      cell: (row) => {
        const status = row.getValue();
        return (
          <StatusBadge
            type={status.toLowerCase()}
            className={row.getValue() === "FINISHED" ? "pl-3" : ""}
          />
        );
      },
    }),
    columnHelper.accessor("totalCost", {
      header: t("evals.evaluatorTable.totalCost7d"),
      id: "totalCost",
      size: 120,
      cell: (row) => {
        const totalCost = row.getValue();

        if (row.row.original.isCostLoading) {
          return <Skeleton className="h-4 w-16" />;
        }

        if (totalCost != null)
          return (
            <CurrencyAmount
              usdValue={totalCost}
              minimumFractionDigits={2}
              maximumFractionDigits={4}
            />
          );

        return "–";
      },
    }),
    columnHelper.accessor("result", {
      header: t("evals.evaluatorTable.result"),
      id: "result",
      size: 150,
      cell: (row) => {
        const result = row.getValue();
        return (
          <LevelCountsDisplay
            counts={result}
            isLoading={row.row.original.isResultLoading}
          />
        );
      },
    }),
    columnHelper.accessor("logs", {
      header: t("evals.evaluatorTable.logs"),
      id: "logs",
      size: 150,
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <Button
            variant="outline"
            aria-label={t("evals.evaluatorTable.view")}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/project/${projectId}/evals/${encodeURIComponent(id)}`,
              );
            }}
          >
            <ExternalLinkIcon className="mr-1 h-3 w-3" />
            {t("evals.evaluatorTable.view")}
          </Button>
        );
      },
    }),
    columnHelper.accessor("template", {
      id: "template",
      header: t("evals.evaluatorTable.referencedEvaluator"),
      size: 200,
      cell: ({ row }) => {
        const template = row.original.template;
        if (!template) return t("evals.evaluatorTable.templateNotFound");
        return (
          <div className="flex items-center gap-2">
            <TableIdOrName value={template.name} />
            <div className="flex justify-center">
              <MaintainerTooltip maintainer={row.original.maintainer} />
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      id: "createdAt",
      header: t("evals.evaluatorTable.createdAt"),
      enableSorting: true,
      size: 150,
    }),
    columnHelper.accessor("updatedAt", {
      id: "updatedAt",
      header: t("evals.evaluatorTable.updatedAt"),
      enableSorting: true,
      size: 150,
    }),
    columnHelper.accessor("isLegacy", {
      id: "isLegacy",
      header: t("evals.evaluatorTable.evalVersion"),
      size: 180,
      enableHiding: true,
      cell: (row) => {
        const targetObject = row.row.original.target;
        const status = row.row.original.rawStatus;
        const isDeprecated = isLegacyEvalTarget(targetObject);

        if (!isDeprecated) return null;

        return <LegacyBadgeCell status={status} />;
      },
    }),
    columnHelper.accessor("target", {
      id: "target",
      header: t("evals.evaluatorTable.runsOn"),
      size: 150,
      enableHiding: true,
      cell: (row) => {
        const targetObject = row.getValue();
        const renderText = isEventTarget(targetObject)
          ? t("evals.target.observations")
          : targetObject;
        return <span className="text-muted-foreground">{renderText}</span>;
      },
    }),
    columnHelper.accessor("filter", {
      id: "filter",
      header: t("common.filters"),
      size: 200,
      enableHiding: true,
      cell: (row) => {
        const filterState = row.getValue();

        // FIX: Temporary workaround: Used to display a different value than the actual value since multiSelect doesn't support key-value pairs
        const newFilterState = filterState.map((filter) => {
          if (filter.type === "stringOptions" && filter.column === "Dataset") {
            return {
              ...filter,
              value: filter.value.map(
                (datasetId) =>
                  datasets.data?.find((d) => d.id === datasetId)?.name ??
                  datasetId,
              ),
            };
          }
          return filter;
        });

        return (
          <div className="flex h-full overflow-x-auto">
            <InlineFilterState filterState={newFilterState} />
          </div>
        );
      },
    }),
    columnHelper.accessor("id", {
      header: t("evals.templates.table.id"),
      id: "id",
      size: 100,
      enableHiding: true,
      cell: (row) => {
        const id = row.getValue();
        return id ? <TableIdOrName value={id} /> : undefined;
      },
    }),
    columnHelper.accessor("actions", {
      header: t("evals.templates.table.actions"),
      id: "actions",
      size: 100,
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label={t("evals.templates.table.actions")}
              >
                <span className="sr-only relative">
                  {t("evals.evaluatorTable.openMenu")}
                </span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {t("evals.templates.table.actions")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                key={id}
                aria-label={t("common.edit")}
                disabled={!hasAccess}
                onClick={(e) => {
                  e.stopPropagation();
                  if (id) setEditConfigId(id);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <DeleteEvalConfigButton
                  aria-label={t("common.delete")}
                  itemId={id}
                  projectId={projectId}
                  redirectUrl={`/project/${projectId}/evals`}
                  deleteConfirmation={row.original.scoreName}
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ] as LangfuseColumnDef<EvaluatorDataRow>[];

  const [columnVisibility, setColumnVisibility] =
    useColumnVisibility<EvaluatorDataRow>(
      "evalConfigColumnVisibility",
      columns,
    );

  const peekNavigationProps = usePeekNavigation();

  const peekConfig = useMemo(
    () => ({
      itemType: "RUNNING_EVALUATOR" as const,
      detailNavigationKey: "evals",
      peekEventOptions: {
        ignoredSelectors: [
          "[aria-label='edit'], [aria-label='actions'], [aria-label='view-logs'], [aria-label='delete']",
        ],
      },
      ...peekNavigationProps,
    }),
    [peekNavigationProps],
  );

  return (
    <DataTableControlsProvider
      tableName={evaluatorFilterConfig.tableName}
      defaultSidebarCollapsed={evaluatorFilterConfig.defaultSidebarCollapsed}
    >
      <div className="flex h-full w-full flex-col">
        {hasLegacyEvals && (
          <div className="p-2 pb-0">
            <Callout
              id="eval-remapping-table"
              variant="warning"
              key="dismissed-eval-remapping-callouts"
            >
              <span>{t("evals.legacy.calloutPrefix")} </span>
              <span className="font-semibold">
                {t("evals.legacy.calloutEmphasis")}{" "}
              </span>
              <span>{t("evals.legacy.calloutSuffix")} </span>
              <Link
                href="https://langfuse.com/faq/all/llm-as-a-judge-migration"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark-blue font-medium hover:opacity-80"
              >
                {t("evals.legacy.learnUpgrade")}
              </Link>
              <span>.</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-1 inline h-4 w-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  {t("evals.legacy.tooltipPerformance")}
                </TooltipContent>
              </Tooltip>
            </Callout>
          </div>
        )}

        {/* Toolbar spanning full width */}
        <DataTableToolbar
          columns={columns}
          filterState={queryFilter.filterState}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          searchConfig={{
            metadataSearchFields: [t("evals.templates.table.name")],
            updateQuery: setSearchQuery,
            currentQuery: searchQuery ?? undefined,
            tableAllowsFullTextSearch: false,
            setSearchType: undefined,
            searchType: undefined,
          }}
        />

        {/* Content area with sidebar and table */}
        <ResizableFilterLayout>
          <DataTableControls queryFilter={queryFilter} />

          <div className="flex flex-1 flex-col overflow-hidden">
            <DataTable
              tableName={"evalConfigs"}
              columns={columns}
              peekView={peekConfig}
              data={
                evaluators.isLoading
                  ? { isLoading: true, isError: false }
                  : evaluators.isError
                    ? {
                        isLoading: false,
                        isError: true,
                        error: evaluators.error.message,
                      }
                    : {
                        isLoading: false,
                        isError: false,
                        data: rows,
                      }
              }
              pagination={{
                totalCount,
                onChange: setPaginationState,
                state: paginationState,
              }}
              orderBy={orderByState}
              setOrderBy={setOrderByState}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
            />
          </div>
        </ResizableFilterLayout>
        <TablePeekView {...peekConfig}>
          <PeekViewEvaluatorConfigDetail projectId={projectId} />
        </TablePeekView>
      </div>
      <Dialog
        open={!!editConfigId && existingEvaluator.isSuccess}
        onOpenChange={(open) => {
          if (!open) setEditConfigId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-(--breakpoint-xl) overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("evals.evaluatorTable.editConfiguration")}
            </DialogTitle>
          </DialogHeader>
          {existingEvaluator.isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <EvaluatorForm
              projectId={projectId}
              evalTemplates={[]}
              existingEvaluator={
                existingEvaluator.data && existingEvaluator.data.evalTemplate
                  ? {
                      ...existingEvaluator.data,
                      evalTemplate: {
                        ...existingEvaluator.data.evalTemplate,
                      },
                    }
                  : undefined
              }
              shouldWrapVariables={true}
              useDialog={true}
              mode="edit"
              onFormSuccess={() => {
                setEditConfigId(null);
                void utils.evals.allConfigs.invalidate();
                showSuccessToast({
                  title: t("evals.templates.updatedTitle"),
                  description: t("evals.evaluatorTable.updatedDescription"),
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DataTableControlsProvider>
  );
}
