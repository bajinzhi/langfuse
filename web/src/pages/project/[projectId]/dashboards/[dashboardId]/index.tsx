import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { useDashboardFilterOptions } from "@/src/hooks/useDashboardFilterOptions";
import Page from "@/src/components/layouts/page";
import { NoDataOrLoading } from "@/src/components/NoDataOrLoading";
import { TimeRangePicker } from "@/src/components/date-picker";
import { PopoverFilterBuilder } from "@/src/features/filters/components/filter-builder";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { ColumnDefinition, FilterState } from "@langfuse/shared";
import { Button } from "@/src/components/ui/button";
import { PlusIcon, Copy } from "lucide-react";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import {
  SelectWidgetDialog,
  type WidgetItem,
} from "@/src/features/widgets/components/SelectWidgetDialog";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { v4 as uuidv4 } from "uuid";
import { useDebounce } from "@/src/hooks/useDebounce";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { DashboardGrid } from "@/src/features/widgets/components/DashboardGrid";
import { useDashboardDateRange } from "@/src/hooks/useDashboardDateRange";
import {
  DASHBOARD_AGGREGATION_OPTIONS,
  toAbsoluteTimeRange,
} from "@/src/utils/date-range-utils";
import { useEntitlementLimit } from "@/src/features/entitlements/hooks";
import { useEnvironmentFilterOptionsCache } from "@/src/hooks/use-environment-filter-options-cache";
import {
  DashboardQuerySchedulerProvider,
  getDashboardQuerySchedulerMaxConcurrent,
  useDashboardQueryScheduler,
} from "@/src/hooks/useDashboardQueryScheduler";
import { useI18n } from "@/src/features/i18n";

interface WidgetPlacement {
  id: string;
  widgetId: string;
  x: number;
  y: number;
  x_size: number;
  y_size: number;
  type: "widget";
}

export default function DashboardDetail() {
  const router = useRouter();
  const { t } = useI18n();
  const utils = api.useUtils();
  const capture = usePostHogClientCapture();

  const { projectId, dashboardId, addWidgetId } = router.query as {
    projectId: string;
    dashboardId: string;
    addWidgetId?: string;
  };

  const lookbackLimit = useEntitlementLimit("data-access-days");
  const { isBetaEnabled } = useV4Beta();

  // Fetch dashboard data
  const dashboard = api.dashboard.getDashboard.useQuery({
    projectId,
    dashboardId,
  });

  const hasCUDAccess =
    useHasProjectAccess({
      projectId,
      scope: "dashboards:CUD",
    }) && dashboard.data?.owner !== "LANGFUSE";

  // Access for cloning (independent of dashboard owner)
  const hasCloneAccess =
    useHasProjectAccess({
      projectId,
      scope: "dashboards:CUD",
    }) && dashboard.data?.owner === "LANGFUSE";

  // Filter state - use persistent filters from dashboard
  const [savedFilters, setSavedFilters] = useState<FilterState>([]);
  const [currentFilters, setCurrentFilters] = useState<FilterState>([]);

  // Date range state - use the hook for all date range logic
  const { timeRange, setTimeRange } = useDashboardDateRange();
  const absoluteTimeRange = useMemo(
    () => toAbsoluteTimeRange(timeRange) ?? undefined,
    [timeRange],
  );

  // Check if current filters differ from saved filters
  const hasUnsavedFilterChanges = useMemo(() => {
    return JSON.stringify(currentFilters) !== JSON.stringify(savedFilters);
  }, [currentFilters, savedFilters]);

  // State for handling widget deletion and addition
  const [localDashboardDefinition, setLocalDashboardDefinition] = useState<{
    widgets: WidgetPlacement[];
  } | null>(null);

  // State for the widget selection dialog
  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false);

  // Mutation for updating dashboard definition
  const updateDashboardDefinition =
    api.dashboard.updateDashboardDefinition.useMutation({
      onSuccess: () => {
        showSuccessToast({
          title: t("dashboard.updatedTitle"),
          description: t("dashboard.widgetsAutoSaved"),
          duration: 2000,
        });
        // Invalidate the dashboard query to refetch the data
        dashboard.refetch();
      },
      onError: (error) => {
        showErrorToast(t("dashboard.updatingError"), error.message);
      },
    });

  // Mutation for updating dashboard filters
  const updateDashboardFilters =
    api.dashboard.updateDashboardFilters.useMutation({
      onSuccess: () => {
        showSuccessToast({
          title: t("dashboard.filtersSavedTitle"),
          description: t("dashboard.filtersSavedDescription"),
          duration: 2000,
        });
        // Update saved state to match current state
        setSavedFilters(currentFilters);
      },
      onError: (error) => {
        showErrorToast(t("dashboard.updatingError"), error.message);
      },
    });

  const saveDashboardChanges = useDebounce(
    (definition: { widgets: WidgetPlacement[] }) => {
      if (!hasCUDAccess) return;
      updateDashboardDefinition.mutate({
        projectId,
        dashboardId,
        definition,
      });
    },
    600,
    false,
  );

  // Function to save current filters
  const handleSaveFilters = () => {
    if (!hasCUDAccess) return;

    updateDashboardFilters.mutate({
      projectId,
      dashboardId,
      filters: currentFilters,
    });
  };

  // Helper function to add a widget to the dashboard
  const addWidgetToDashboard = useCallback(
    (widget: WidgetItem) => {
      if (!localDashboardDefinition) return;

      // Find the maximum y position to place the new widget at the bottom
      const maxY =
        localDashboardDefinition.widgets.length > 0
          ? Math.max(
              ...localDashboardDefinition.widgets.map((w) => w.y + w.y_size),
            )
          : 0;

      // Create a new widget placement
      const newWidgetPlacement: WidgetPlacement = {
        id: uuidv4(),
        widgetId: widget.id,
        x: 0, // Start at left
        y: maxY, // Place below existing widgets
        x_size: 6, // Default size (half of 12-column grid)
        y_size: 6, // Default height of 6 rows
        type: "widget",
      };

      // Add the widget to the local dashboard definition
      const updatedDefinition = {
        ...localDashboardDefinition,
        widgets: [...localDashboardDefinition.widgets, newWidgetPlacement],
      };
      setLocalDashboardDefinition(updatedDefinition);
      saveDashboardChanges(updatedDefinition);
    },
    [
      localDashboardDefinition,
      setLocalDashboardDefinition,
      saveDashboardChanges,
    ],
  );

  const { nameOptions, tagsOptions } = useDashboardFilterOptions({
    projectId,
    isBetaEnabled,
    timeRange,
  });

  const environmentOptionsState = useEnvironmentFilterOptionsCache({
    projectId,
    timeRange,
  });
  const environmentOptions = environmentOptionsState.environmentOptions.map(
    (value) => ({
      value,
    }),
  );
  // Filter columns for PopoverFilterBuilder
  const filterColumns: ColumnDefinition[] = [
    {
      name: t("observability.columns.environment"),
      id: "environment",
      aliases: ["Environment"],
      type: "stringOptions",
      options: environmentOptions,
      internal: "internalValue",
    },
    {
      name: t("observability.columns.traceName"),
      id: "traceName",
      aliases: ["Trace Name"],
      type: "stringOptions",
      options: nameOptions,
      internal: "internalValue",
    },
    {
      name: t("observability.columns.observationName"),
      id: "observationName",
      aliases: ["Observation Name"],
      type: "string",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.scoreName"),
      id: "scoreName",
      aliases: ["Score Name"],
      type: "string",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.tags"),
      id: "tags",
      aliases: ["Tags"],
      type: "arrayOptions",
      options: tagsOptions,
      internal: "internalValue",
    },
    {
      name: t("observability.columns.user"),
      id: "user",
      aliases: ["User"],
      type: "string",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.session"),
      id: "session",
      aliases: ["Session"],
      type: "string",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.metadata"),
      id: "metadata",
      aliases: ["Metadata"],
      type: "stringObject",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.release"),
      id: "release",
      aliases: ["Release"],
      type: "string",
      internal: "internalValue",
    },
    {
      name: t("observability.columns.version"),
      id: "version",
      aliases: ["Version"],
      type: "string",
      internal: "internalValue",
    },
  ];

  // Fetch widget data if addWidgetId is present
  const widgetToAdd = api.dashboardWidgets.get.useQuery(
    { projectId, widgetId: addWidgetId || "" },
    {
      enabled: Boolean(projectId) && Boolean(addWidgetId),
    },
  );

  useEffect(() => {
    if (dashboard.data && !localDashboardDefinition) {
      setLocalDashboardDefinition(dashboard.data.definition);
    }
  }, [dashboard.data, localDashboardDefinition]);

  // Initialize filters from dashboard data
  useEffect(() => {
    if (dashboard.data?.filters) {
      setSavedFilters(dashboard.data.filters);
      setCurrentFilters(dashboard.data.filters);
    }
  }, [dashboard.data?.filters]);

  useEffect(() => {
    if (localDashboardDefinition && widgetToAdd.data && addWidgetId) {
      if (
        !localDashboardDefinition.widgets.some(
          (w) => w.widgetId === addWidgetId,
        )
      ) {
        addWidgetToDashboard(widgetToAdd.data);
      }
      // Remove the addWidgetId query parameter
      router.replace({
        pathname: router.pathname,
        query: { projectId, dashboardId },
      });
    }
  }, [
    widgetToAdd.data,
    addWidgetId,
    addWidgetToDashboard,
    localDashboardDefinition,
    projectId,
    dashboardId,
    router,
  ]);

  // Handle deleting a widget
  const handleDeleteWidget = (tileId: string) => {
    if (localDashboardDefinition) {
      const updatedWidgets = localDashboardDefinition.widgets.filter(
        (widget) => widget.id !== tileId,
      );

      const updatedDefinition = {
        ...localDashboardDefinition,
        widgets: updatedWidgets,
      };
      setLocalDashboardDefinition(updatedDefinition);
      saveDashboardChanges(updatedDefinition);
    }
  };

  // Handle adding a widget
  const handleAddWidget = () => {
    setIsWidgetDialogOpen(true);
  };

  // Handle widget selection from dialog
  const handleSelectWidget = (widget: WidgetItem) => {
    addWidgetToDashboard(widget);
  };

  const mutateCloneDashboard = api.dashboard.cloneDashboard.useMutation({
    onSuccess: (data) => {
      void utils.dashboard.invalidate();
      capture("dashboard:clone_dashboard");
      // Redirect to new dashboard
      if (data?.id) {
        router.replace(
          `/project/${projectId}/dashboards/${encodeURIComponent(data.id)}`,
        );
      }
    },
    onError: (e) => {
      showErrorToast(t("dashboard.cloneFailed"), e.message);
    },
  });

  const handleCloneDashboard = () => {
    if (!projectId || !dashboardId) return;
    mutateCloneDashboard.mutate({ projectId, dashboardId });
  };

  const dashboardTimeRangePresets = DASHBOARD_AGGREGATION_OPTIONS;
  const widgetSchedulerPrefix = `dashboard:${projectId}:${dashboardId}:widget:`;
  const widgetPlacements = useMemo(
    () => localDashboardDefinition?.widgets ?? [],
    [localDashboardDefinition?.widgets],
  );

  const getWidgetSchedulerId = useCallback(
    (widgetPlacementId: string) =>
      `${widgetSchedulerPrefix}${widgetPlacementId}`,
    [widgetSchedulerPrefix],
  );

  const schedulerResetKey = useMemo(() => {
    return [
      projectId,
      dashboardId,
      absoluteTimeRange?.from?.toISOString() ?? "",
      absoluteTimeRange?.to?.toISOString() ?? "",
      JSON.stringify(currentFilters),
      widgetPlacements.map((widget) => widget.id).join(","),
    ].join("|");
  }, [
    absoluteTimeRange?.from,
    absoluteTimeRange?.to,
    currentFilters,
    dashboardId,
    projectId,
    widgetPlacements,
  ]);

  const scheduler = useDashboardQueryScheduler({
    maxConcurrent: getDashboardQuerySchedulerMaxConcurrent(timeRange),
    resetKey: schedulerResetKey,
  });

  return (
    <DashboardQuerySchedulerProvider
      scheduler={scheduler}
      shouldBucketQueriesByTimeRange={!("from" in timeRange)}
    >
      <Page
        withPadding
        scrollable
        headerProps={{
          title:
            (dashboard.data?.name || t("entities.dashboard")) +
            (dashboard.data?.owner === "LANGFUSE"
              ? t("dashboard.langfuseMaintainedSuffix")
              : ""),
          breadcrumb: [
            {
              name: t("dashboard.title"),
              href: `/project/${projectId}/dashboards`,
            },
          ],
          help: {
            description:
              dashboard.data?.description || t("dashboard.noDescription"),
          },
          actionButtonsRight: (
            <>
              {hasCUDAccess && hasUnsavedFilterChanges && (
                <Button
                  onClick={handleSaveFilters}
                  disabled={updateDashboardFilters.isPending}
                  variant="outline"
                >
                  {updateDashboardFilters.isPending
                    ? t("dashboard.saving")
                    : t("dashboard.saveFilters")}
                </Button>
              )}
              {hasCUDAccess && (
                <Button onClick={handleAddWidget}>
                  <PlusIcon size={16} className="mr-1 h-4 w-4" />
                  {t("dashboard.addWidget")}
                </Button>
              )}
              {hasCloneAccess && (
                <Button
                  onClick={handleCloneDashboard}
                  disabled={mutateCloneDashboard.isPending}
                >
                  <Copy size={16} className="mr-1 h-4 w-4" />
                  {t("dashboard.clone")}
                </Button>
              )}
            </>
          ),
        }}
      >
        <SelectWidgetDialog
          open={isWidgetDialogOpen}
          onOpenChange={setIsWidgetDialogOpen}
          projectId={projectId}
          onSelectWidget={handleSelectWidget}
          dashboardId={dashboardId}
        />
        {dashboard.isPending || !localDashboardDefinition ? (
          <NoDataOrLoading isLoading={true} />
        ) : dashboard.isError ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-destructive">
              {t("dashboard.errorPrefix")} {dashboard.error.message}
            </div>
          </div>
        ) : (
          <div>
            <div className="my-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:gap-3">
                <TimeRangePicker
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  timeRangePresets={dashboardTimeRangePresets}
                  className="my-0 max-w-full overflow-x-auto"
                  disabled={
                    lookbackLimit
                      ? {
                          before: new Date(
                            new Date().getTime() -
                              lookbackLimit * 24 * 60 * 60 * 1000,
                          ),
                        }
                      : undefined
                  }
                />
                <PopoverFilterBuilder
                  columns={filterColumns}
                  filterState={currentFilters}
                  onChange={setCurrentFilters}
                  columnIdentifier="id"
                />
              </div>
            </div>
            <DashboardGrid
              widgets={localDashboardDefinition.widgets}
              onChange={(updatedWidgets) => {
                setLocalDashboardDefinition({
                  ...localDashboardDefinition,
                  widgets: updatedWidgets,
                });
                saveDashboardChanges({
                  ...localDashboardDefinition,
                  widgets: updatedWidgets,
                });
              }}
              canEdit={hasCUDAccess}
              dashboardId={dashboardId}
              projectId={projectId}
              dateRange={absoluteTimeRange}
              filterState={currentFilters}
              onDeleteWidget={handleDeleteWidget}
              dashboardOwner={dashboard.data?.owner}
              getWidgetSchedulerId={getWidgetSchedulerId}
            />
          </div>
        )}
      </Page>
    </DashboardQuerySchedulerProvider>
  );
}
