import { type FilterState, getGenerationLikeTypes } from "@langfuse/shared";
import { DashboardCard } from "@/src/features/dashboard/components/cards/DashboardCard";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { TabComponent } from "@/src/features/dashboard/components/TabsComponent";
import { TotalMetric } from "@/src/features/dashboard/components/TotalMetric";
import { ExpandListButton } from "@/src/features/dashboard/components/cards/ChevronButton";
import { useState } from "react";
import { useCurrencyFormatter } from "@/src/features/currency/useCurrencyFormatter";
import { NoDataOrLoading } from "@/src/components/NoDataOrLoading";
import {
  type QueryType,
  type ViewVersion,
  mapLegacyUiTableFilterToView,
} from "@/src/features/query";
import { Chart } from "@/src/features/widgets/chart-library/Chart";
import { barListToDataPoints } from "@/src/features/dashboard/lib/chart-data-adapters";
import { traceViewQuery } from "@/src/features/dashboard/lib/dashboard-utils";
import { useScheduledDashboardExecuteQuery } from "@/src/hooks/useDashboardQueryScheduler";
import { useI18n } from "@/src/features/i18n";

type BarChartDataPoint = {
  name: string;
  value: number;
};

export const UserChart = ({
  className,
  projectId,
  globalFilterState,
  fromTimestamp,
  toTimestamp,
  isLoading = false,
  metricsVersion,
  schedulerId,
}: {
  className?: string;
  projectId: string;
  globalFilterState: FilterState;
  fromTimestamp: Date;
  toTimestamp: Date;
  isLoading?: boolean;
  metricsVersion?: ViewVersion;
  schedulerId?: string;
}) => {
  const { t } = useI18n();
  const { formatDashboardTotal } = useCurrencyFormatter();
  const [isExpanded, setIsExpanded] = useState(false);
  const maxNumberOfEntries = { collapsed: 5, expanded: 20 } as const;

  const userCostQuery: QueryType = {
    view: "observations",
    dimensions: [{ field: "userId" }],
    metrics: [
      { measure: "totalCost", aggregation: "sum" },
      { measure: "count", aggregation: "count" },
    ],
    filters: [
      ...mapLegacyUiTableFilterToView("observations", globalFilterState),
      {
        column: "type",
        operator: "any of",
        value: getGenerationLikeTypes(),
        type: "stringOptions",
      },
    ],
    timeDimension: null,
    fromTimestamp: fromTimestamp.toISOString(),
    toTimestamp: toTimestamp.toISOString(),
    orderBy: [{ field: "sum_totalCost", direction: "desc" }],
    chartConfig: {
      type: "HORIZONTAL_BAR",
      row_limit: maxNumberOfEntries.expanded,
    },
  };

  const user = useScheduledDashboardExecuteQuery(
    {
      projectId,
      query: userCostQuery,
      version: metricsVersion,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      queryId: `${schedulerId ?? "home:users"}:cost`,
      enabled: !isLoading,
    },
  );

  const isV2 = metricsVersion === "v2";
  const countField = isV2 ? "uniq_traceId" : "count_count";

  const traceViewBase = traceViewQuery({ metricsVersion, globalFilterState });
  const traceMetric = traceViewBase.metrics[0] ?? {
    aggregation: "count",
    measure: "count",
  };
  const traceCountQuery: QueryType = {
    ...traceViewBase,
    dimensions: [{ field: "userId" }],
    timeDimension: null,
    fromTimestamp: fromTimestamp.toISOString(),
    toTimestamp: toTimestamp.toISOString(),
    orderBy: [
      {
        field: `${traceMetric.aggregation}_${traceMetric.measure}`,
        direction: "desc",
      },
    ],
    chartConfig: {
      type: "HORIZONTAL_BAR",
      row_limit: maxNumberOfEntries.expanded,
    },
  };

  const traces = useScheduledDashboardExecuteQuery(
    {
      projectId,
      query: traceCountQuery,
      version: metricsVersion,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      queryId: `${schedulerId ?? "home:users"}:traces`,
      enabled: !isLoading,
    },
  );

  const transformedNumberOfTraces: BarChartDataPoint[] = traces.data
    ? traces.data
        .filter((item) => item.userId !== undefined)
        .map((item) => {
          return {
            name: item.userId as string,
            value: item[countField] ? Number(item[countField]) : 0,
          };
        })
    : [];

  const transformedCost: BarChartDataPoint[] = user.data
    ? user.data
        .filter((item) => item.userId !== undefined)
        .map((item) => {
          return {
            name:
              (item.userId as string | null | undefined) ??
              t("dashboard.traces.unknown"),
            value: item.sum_totalCost ? Number(item.sum_totalCost) : 0,
          };
        })
    : [];

  const totalCost = user.data?.reduce(
    (acc, curr) => acc + (Number(curr.sum_totalCost) || 0),
    0,
  );

  const totalTraces = traces.data?.reduce(
    (acc, curr) => acc + (Number(curr[countField]) || 0),
    0,
  );

  const BAR_ROW_HEIGHT = 36;
  const CHART_AXIS_PADDING = 32;

  const data = [
    {
      tabTitle: t("dashboard.userConsumption.tokenCost"),
      data: isExpanded
        ? transformedCost.slice(0, maxNumberOfEntries.expanded)
        : transformedCost.slice(0, maxNumberOfEntries.collapsed),
      totalMetric: formatDashboardTotal(totalCost),
      metricDescription: t("dashboard.userConsumption.totalCost"),
      formatter: formatDashboardTotal,
    },
    {
      tabTitle: t("dashboard.userConsumption.countOfTraces"),
      data: isExpanded
        ? transformedNumberOfTraces.slice(0, maxNumberOfEntries.expanded)
        : transformedNumberOfTraces.slice(0, maxNumberOfEntries.collapsed),
      totalMetric: totalTraces
        ? compactNumberFormatter(totalTraces)
        : compactNumberFormatter(0),
      metricDescription: t("dashboard.userConsumption.totalTraces"),
    },
  ];

  return (
    <DashboardCard
      className={className}
      title={t("dashboard.userConsumption.title")}
      isLoading={isLoading || user.isPending}
    >
      <TabComponent
        tabs={data.map((item) => {
          return {
            tabTitle: item.tabTitle,
            content: (
              <>
                {item.data.length > 0 ? (
                  <div className="flex flex-col">
                    <TotalMetric
                      metric={item.totalMetric}
                      description={item.metricDescription}
                    />
                    <div
                      className="mt-4 w-full"
                      style={{
                        minHeight: 200,
                        height: Math.max(
                          200,
                          item.data.length * BAR_ROW_HEIGHT +
                            CHART_AXIS_PADDING,
                        ),
                      }}
                    >
                      <Chart
                        chartType="HORIZONTAL_BAR"
                        data={barListToDataPoints(item.data)}
                        rowLimit={maxNumberOfEntries.expanded}
                        chartConfig={{
                          type: "HORIZONTAL_BAR",
                          row_limit: maxNumberOfEntries.expanded,
                          show_value_labels: true,
                          subtle_fill: true,
                        }}
                        valueFormatter={item.formatter}
                      />
                    </div>
                  </div>
                ) : (
                  <NoDataOrLoading
                    isLoading={isLoading || user.isPending}
                    description={t(
                      "dashboard.userConsumption.noDataDescription",
                    )}
                    href="https://langfuse.com/docs/observability/features/users"
                  />
                )}
              </>
            ),
          };
        })}
      />
      <ExpandListButton
        isExpanded={isExpanded}
        setExpanded={setIsExpanded}
        totalLength={transformedCost.length}
        maxLength={maxNumberOfEntries.collapsed}
        expandText={
          transformedCost.length > maxNumberOfEntries.expanded
            ? t("dashboard.showTop", {
                count: maxNumberOfEntries.expanded,
              })
            : t("dashboard.showAll")
        }
      />
    </DashboardCard>
  );
};
