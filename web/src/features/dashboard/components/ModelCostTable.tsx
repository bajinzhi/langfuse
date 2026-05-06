import DocPopup from "@/src/components/layouts/doc-popup";
import { RightAlignedCell } from "@/src/features/dashboard/components/RightAlignedCell";
import { LeftAlignedCell } from "@/src/features/dashboard/components/LeftAlignedCell";
import { DashboardCard } from "@/src/features/dashboard/components/cards/DashboardCard";
import { DashboardTable } from "@/src/features/dashboard/components/cards/DashboardTable";
import { type FilterState, getGenerationLikeTypes } from "@langfuse/shared";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { TotalMetric } from "./TotalMetric";
import { CurrencyAmount } from "@/src/features/currency/CurrencyAmount";
import { useCurrencyFormatter } from "@/src/features/currency/useCurrencyFormatter";
import { truncate } from "@/src/utils/string";
import {
  type QueryType,
  type ViewVersion,
  mapLegacyUiTableFilterToView,
} from "@/src/features/query";
import { useScheduledDashboardExecuteQuery } from "@/src/hooks/useDashboardQueryScheduler";
import { useI18n } from "@/src/features/i18n";

export const ModelCostTable = ({
  className,
  projectId,
  globalFilterState,
  fromTimestamp,
  toTimestamp,
  isLoading = false,
  metricsVersion,
  schedulerId,
}: {
  className: string;
  projectId: string;
  globalFilterState: FilterState;
  fromTimestamp: Date;
  toTimestamp: Date;
  isLoading?: boolean;
  metricsVersion?: ViewVersion;
  schedulerId?: string;
}) => {
  const { t } = useI18n();
  const {
    formatDashboardTotal,
    symbol: activeSymbol,
    activeCurrency,
  } = useCurrencyFormatter();

  const modelCostQuery: QueryType = {
    view: "observations",
    dimensions: [{ field: "providedModelName" }],
    metrics: [
      { measure: "totalCost", aggregation: "sum" },
      { measure: "totalTokens", aggregation: "sum" },
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
    chartConfig: { type: "table", row_limit: 20 },
  };

  const metrics = useScheduledDashboardExecuteQuery(
    {
      projectId,
      query: modelCostQuery,
      version: metricsVersion,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      queryId: `${schedulerId ?? "home:model-costs"}:metrics`,
      enabled: !isLoading,
    },
  );

  const totalTokenCost = metrics.data?.reduce(
    (acc, curr) =>
      acc + (curr.sum_totalCost ? (curr.sum_totalCost as number) : 0),
    0,
  );

  const metricsData = metrics.data
    ? metrics.data
        .filter((item) => item.providedModelName !== null)
        .map((item, i) => [
          <LeftAlignedCell
            key={`${i}-model`}
            title={item.providedModelName as string}
          >
            {truncate(item.providedModelName as string, 30)}
          </LeftAlignedCell>,
          <RightAlignedCell key={`${i}-tokens`}>
            {item.sum_totalTokens
              ? compactNumberFormatter(item.sum_totalTokens as number)
              : "0"}
          </RightAlignedCell>,
          <RightAlignedCell key={`${i}-cost`}>
            {item.sum_totalCost ? (
              <CurrencyAmount
                usdValue={item.sum_totalCost as number}
                minimumFractionDigits={2}
                maximumFractionDigits={
                  (item.sum_totalCost as number) < 5 ? 6 : 2
                }
              />
            ) : (
              <CurrencyAmount usdValue={0} hideTooltip />
            )}
          </RightAlignedCell>,
        ])
    : [];

  return (
    <DashboardCard
      className={className}
      title={t("dashboard.modelCosts.title")}
      isLoading={isLoading || metrics.isLoading}
    >
      <DashboardTable
        headers={[
          t("dashboard.modelCosts.model"),
          <RightAlignedCell key="tokens">
            {t("dashboard.modelCosts.tokens")}
          </RightAlignedCell>,
          <RightAlignedCell key="cost">
            {/* Header reflects the active display currency rather than
             * being hard-coded to "USD" — the underlying numbers stay
             * the same, only the rendered symbol changes. */}
            {`${activeSymbol} (${activeCurrency})`}
          </RightAlignedCell>,
        ]}
        rows={metricsData}
        isLoading={isLoading || metrics.isLoading}
        collapse={{ collapsed: 5, expanded: 20 }}
      >
        <TotalMetric
          metric={formatDashboardTotal(totalTokenCost)}
          description={t("dashboard.modelCosts.totalCost")}
        >
          <DocPopup
            description={t("dashboard.modelCosts.totalCostTooltip")}
            href="https://langfuse.com/docs/model-usage-and-cost"
          />
        </TotalMetric>
      </DashboardTable>
    </DashboardCard>
  );
};
