import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import {
  NumberParam,
  StringParam,
  useQueryParam,
  useQueryParams,
  withDefault,
} from "use-query-params";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import { DataTable } from "@/src/components/table/data-table";
import {
  TableBadgeLoadingCell,
  TableTextLoadingCell,
} from "@/src/components/table/loading-cells";
import TableLink from "@/src/components/table/table-link";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { useQueryFilterState } from "@/src/features/filters/hooks/useFilterState";
import { useDetailPageLists } from "@/src/features/navigate-detail-pages/context";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { api } from "@/src/utils/api";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { CurrencyAmount } from "@/src/features/currency/CurrencyAmount";
import { type RouterOutput } from "@/src/utils/types";
import { type FilterState, usersTableCols } from "@langfuse/shared";
import { joinTableCoreAndMetrics } from "@/src/components/table/utils/joinTableCoreAndMetrics";
import { useTableDateRange } from "@/src/hooks/useTableDateRange";
import { toAbsoluteTimeRange } from "@/src/utils/date-range-utils";
import { useDebounce } from "@/src/hooks/useDebounce";
import Page from "@/src/components/layouts/page";
import { UsersOnboarding } from "@/src/components/onboarding/UsersOnboarding";
import {
  useEnvironmentFilter,
  convertSelectedEnvironmentsToFilter,
} from "@/src/hooks/useEnvironmentFilter";
import { Badge } from "@/src/components/ui/badge";
import { useI18n } from "@/src/features/i18n";

type RowData = {
  userId: string;
  environment?: string;
  firstEvent: string;
  lastEvent: string;
  totalEvents: string;
  totalTokens: string;
  totalCost: number | undefined;
};

export default function UsersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { isBetaEnabled } = useV4Beta();

  // Check if the user has any users
  const { data: hasAnyUser, isLoading } = api.users.hasAny.useQuery(
    { projectId },
    {
      enabled: !!projectId && !isBetaEnabled,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      refetchInterval: 10_000,
    },
  );

  const { data: hasAnyUserFromEvents, isLoading: isLoadingFromEvents } =
    api.users.hasAnyFromEvents.useQuery(
      { projectId },
      {
        enabled: !!projectId && isBetaEnabled,
        trpc: {
          context: {
            skipBatch: true,
          },
        },
        refetchInterval: 10_000,
      },
    );

  const hasUsers = isBetaEnabled ? hasAnyUserFromEvents : hasAnyUser;
  const isLoadingUsers = isBetaEnabled ? isLoadingFromEvents : isLoading;
  const showOnboarding = !isLoadingUsers && !hasUsers;

  return (
    <Page
      headerProps={{
        title: t("observability.users.title"),
        help: {
          description: t("observability.users.help"),
          href: "https://langfuse.com/docs/observability/features/users",
        },
      }}
      scrollable={showOnboarding}
    >
      {/* Show onboarding screen if user has no users */}
      {showOnboarding ? (
        <UsersOnboarding />
      ) : (
        <UsersTable isBetaEnabled={isBetaEnabled} />
      )}
    </Page>
  );
}

const UsersTable = ({ isBetaEnabled }: { isBetaEnabled: boolean }) => {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;

  const [userFilterState, setUserFilterState] = useQueryFilterState(
    [],
    "users",
    projectId,
  );

  const { setDetailPageList } = useDetailPageLists();

  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 50),
  });

  const { timeRange, setTimeRange } = useTableDateRange(projectId);

  // Convert timeRange to absolute date range for compatibility
  const dateRange = useMemo(() => {
    return toAbsoluteTimeRange(timeRange) ?? undefined;
  }, [timeRange]);

  const dateRangeFilter: FilterState = dateRange
    ? [
        {
          column: "Timestamp",
          type: "datetime",
          operator: ">=",
          value: dateRange.from,
        },
        {
          column: "Timestamp",
          type: "datetime",
          operator: "<=",
          value: dateRange.to,
        },
      ]
    : [];

  const environmentFilterOptions =
    api.projects.environmentFilterOptions.useQuery(
      {
        projectId,
        fromTimestamp: dateRange?.from,
      },
      {
        trpc: { context: { skipBatch: true } },
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
      },
    );

  const environmentOptions =
    environmentFilterOptions.data?.map((value) => value.environment) || [];

  const { selectedEnvironments, setSelectedEnvironments } =
    useEnvironmentFilter(environmentOptions, projectId);

  const environmentFilter = convertSelectedEnvironmentsToFilter(
    ["environment"],
    selectedEnvironments,
  );

  const filterState = userFilterState.concat(
    dateRangeFilter,
    environmentFilter,
  );

  const [searchQuery, setSearchQuery] = useQueryParam(
    "search",
    withDefault(StringParam, null),
  );

  const usersV3 = api.users.all.useQuery(
    {
      filter: filterState,
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
      projectId,
      searchQuery: searchQuery ?? undefined,
    },
    { enabled: !isBetaEnabled },
  );

  const userMetricsV3 = api.users.metrics.useQuery(
    {
      projectId,
      userIds: usersV3.data?.users.map((u) => u.userId) ?? [],
      filter: filterState,
    },
    {
      enabled: usersV3.isSuccess && !isBetaEnabled,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const usersV4 = api.users.allFromEvents.useQuery(
    {
      filter: filterState,
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
      projectId,
      searchQuery: searchQuery ?? undefined,
    },
    { enabled: isBetaEnabled },
  );

  const userMetricsV4 = api.users.metricsFromEvents.useQuery(
    {
      projectId,
      userIds: usersV4.data?.users.map((u) => u.userId) ?? [],
      filter: filterState,
    },
    {
      enabled: usersV4.isSuccess && isBetaEnabled,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  // Select the active query based on beta state
  const users = isBetaEnabled ? usersV4 : usersV3;
  const userMetrics = isBetaEnabled ? userMetricsV4 : userMetricsV3;

  type UserCoreOutput = RouterOutput["users"]["all"]["users"][number];
  type UserMetricsOutput = RouterOutput["users"]["metrics"][number];

  type CoreType = Omit<UserCoreOutput, "userId"> & { id: string };
  type MetricType = Omit<UserMetricsOutput, "userId"> & { id: string };

  const userRowData = joinTableCoreAndMetrics<CoreType, MetricType>(
    users.data?.users.map((u) => ({
      ...u,
      id: u.userId,
    })),
    userMetrics.data?.map((u) => ({
      ...u,
      id: u.userId,
    })),
  );

  const totalCount = users.data?.totalUsers
    ? Number(users.data.totalUsers)
    : null;

  useEffect(() => {
    if (users.isSuccess) {
      setDetailPageList(
        "users",
        users.data.users.map((u) => ({ id: encodeURIComponent(u.userId) })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.isSuccess, users.data]);

  const columns: LangfuseColumnDef<RowData>[] = [
    {
      accessorKey: "userId",
      enableColumnFilter: true,
      header: t("observability.columns.userId"),
      headerTooltip: {
        description: t("observability.users.tooltip.userId"),
        href: "https://langfuse.com/docs/observability/features/users",
      },
      size: 150,
      cell: ({ row }) => {
        const value: RowData["userId"] = row.getValue("userId");
        return typeof value === "string" ? (
          <>
            <TableLink
              path={`/project/${projectId}/users/${encodeURIComponent(value)}`}
              value={value}
            />
          </>
        ) : undefined;
      },
    },
    {
      accessorKey: "environment",
      header: t("observability.columns.environment"),
      id: "environment",
      size: 150,
      enableHiding: true,
      loadingCell: <TableBadgeLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["environment"] = row.getValue("environment");
        return value ? (
          <Badge
            variant="secondary"
            className="max-w-fit truncate rounded-sm px-1 font-normal"
          >
            {value}
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "firstEvent",
      header: t("observability.columns.firstEvent"),
      headerTooltip: {
        description: t("observability.users.tooltip.firstEvent"),
      },
      size: 150,
      loadingCell: <TableTextLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["firstEvent"] = row.getValue("firstEvent");
        if (!userMetrics.isSuccess) {
          return <TableTextLoadingCell />;
        }
        return typeof value === "string" ? value : undefined;
      },
    },
    {
      accessorKey: "lastEvent",
      header: t("observability.columns.lastEvent"),
      headerTooltip: {
        description: t("observability.users.tooltip.lastEvent"),
      },
      size: 150,
      loadingCell: <TableTextLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["lastEvent"] = row.getValue("lastEvent");
        if (!userMetrics.isSuccess) {
          return <TableTextLoadingCell />;
        }
        return typeof value === "string" ? value : undefined;
      },
    },
    {
      accessorKey: "totalEvents",
      header: t("observability.columns.totalEvents"),
      headerTooltip: {
        description: t("observability.users.tooltip.totalEvents"),
        href: "https://langfuse.com/docs/observability/data-model",
      },
      size: 120,
      loadingCell: <TableTextLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["totalEvents"] = row.getValue("totalEvents");
        if (!userMetrics.isSuccess) {
          return <TableTextLoadingCell />;
        }
        return typeof value === "string" ? value : undefined;
      },
    },
    {
      accessorKey: "totalTokens",
      header: t("observability.columns.totalTokens"),
      headerTooltip: {
        description: t("observability.users.tooltip.totalTokens"),
        href: "https://langfuse.com/docs/model-usage-and-cost",
      },
      size: 120,
      loadingCell: <TableTextLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["totalTokens"] = row.getValue("totalTokens");
        if (!userMetrics.isSuccess) {
          return <TableTextLoadingCell />;
        }
        return typeof value === "string" ? value : undefined;
      },
    },
    {
      accessorKey: "totalCost",
      header: t("observability.columns.totalCost"),
      headerTooltip: {
        description: t("observability.users.tooltip.totalCost"),
        href: "https://langfuse.com/docs/model-usage-and-cost",
      },
      size: 120,
      loadingCell: <TableTextLoadingCell />,
      cell: ({ row }) => {
        const value: RowData["totalCost"] = row.getValue("totalCost");
        if (!userMetrics.isSuccess) {
          return <TableTextLoadingCell />;
        }
        return value !== undefined ? (
          <CurrencyAmount
            usdValue={value}
            minimumFractionDigits={2}
            maximumFractionDigits={2}
          />
        ) : undefined;
      },
    },
  ];

  return (
    <>
      <DataTableToolbar
        filterColumnDefinition={usersTableCols}
        filterState={userFilterState}
        setFilterState={useDebounce(setUserFilterState)}
        columns={columns}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        searchConfig={{
          metadataSearchFields: [t("observability.columns.userId")],
          updateQuery: setSearchQuery,
          currentQuery: searchQuery ?? undefined,
          tableAllowsFullTextSearch: false,
          setSearchType: undefined,
          searchType: undefined,
        }}
        environmentFilter={{
          values: selectedEnvironments,
          onValueChange: setSelectedEnvironments,
          options: environmentOptions.map((env) => ({ value: env })),
        }}
      />
      <DataTable
        tableName={"users"}
        columns={columns}
        data={
          users.isLoading
            ? { isLoading: true, isError: false }
            : users.isError
              ? {
                  isLoading: false,
                  isError: true,
                  error: users.error.message,
                }
              : {
                  isLoading: false,
                  isError: false,
                  data: userRowData.rows?.map((user) => {
                    return {
                      userId: user.id,
                      environment: user.environment ?? undefined,
                      firstEvent: user.firstTrace
                        ? formatDate(user.firstTrace, {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })
                        : t("observability.users.noEventYet"),
                      lastEvent: user.lastTrace
                        ? formatDate(user.lastTrace, {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })
                        : t("observability.users.noEventYet"),
                      totalEvents: compactNumberFormatter(
                        isBetaEnabled
                          ? Number(user.totalObservations ?? 0)
                          : Number(user.totalTraces ?? 0) +
                              Number(user.totalObservations ?? 0),
                      ),
                      totalTokens: compactNumberFormatter(
                        user.totalTokens ?? 0,
                      ),
                      totalCost: Number(user.sumCalculatedTotalCost ?? 0),
                    };
                  }),
                }
        }
        pagination={{
          totalCount,
          onChange: setPaginationState,
          state: paginationState,
        }}
      />
    </>
  );
};
