import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import TracesTable from "@/src/components/table/use-cases/traces";
import ScoresTable from "@/src/components/table/use-cases/scores";
import { compactNumberFormatter } from "@/src/utils/numbers";
import { CurrencyAmount } from "@/src/features/currency/CurrencyAmount";
import { StringParam, useQueryParam, withDefault } from "use-query-params";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import SessionsTable from "@/src/components/table/use-cases/sessions";
import { cn } from "@/src/utils/tailwind";
import { Badge } from "@/src/components/ui/badge";
import { ActionButton } from "@/src/components/ActionButton";
import { LayoutDashboard } from "lucide-react";
import Page from "@/src/components/layouts/page";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { ObservationsEventsTable } from "@/src/features/events/components";
import { useI18n } from "@/src/features/i18n";

const tabs = ["Traces", "Sessions", "Scores"] as const;
const tabLabelKeys = {
  Traces: "dashboard.traces.title",
  Sessions: "nav.sessions",
  Scores: "dashboard.scores.title",
} as const;

export default function UserPage() {
  const router = useRouter();
  const userId = router.query.userId as string;
  const projectId = router.query.projectId as string;
  const { isBetaEnabled } = useV4Beta();
  const { t, formatDate } = useI18n();

  const userV3 = api.users.byId.useQuery(
    {
      projectId: projectId,
      userId,
    },
    { enabled: !isBetaEnabled },
  );

  const userV4 = api.users.byIdFromEvents.useQuery(
    {
      projectId: projectId,
      userId,
    },
    { enabled: isBetaEnabled },
  );

  const user = isBetaEnabled ? userV4 : userV3;

  const [currentTab, setCurrentTab] = useQueryParam(
    "tab",
    withDefault(StringParam, tabs[0]),
  );

  const renderTabContent = () => {
    switch (currentTab as (typeof tabs)[number]) {
      case "Sessions":
        return <SessionsTab userId={userId} projectId={projectId} />;
      case "Traces":
        return <TracesTab userId={userId} projectId={projectId} />;
      case "Scores":
        return <ScoresTab userId={userId} projectId={projectId} />;
      default:
        return null;
    }
  };

  const handleTabChange = async (tab: string) => {
    if (router.query.filter || router.query.orderBy) {
      const newQuery = { ...router.query };
      delete newQuery.filter;
      delete newQuery.orderBy;
      await router.replace({ query: newQuery });
    }
    setCurrentTab(tab);
  };

  return (
    <Page
      headerProps={{
        title: userId,
        breadcrumb: [
          { name: t("nav.users"), href: `/project/${projectId}/users` },
        ],
        itemType: "USER",
        actionButtonsRight: (
          <>
            <ActionButton
              href={`/project/${projectId}?filter=user%3Bstring%3B%3B%3D%3B${userId}`} // dashboard filter serialization
              variant="secondary"
              icon={<LayoutDashboard className="h-4 w-4" />}
            >
              {t("users.dashboard")}
            </ActionButton>
            <DetailPageNav
              currentId={encodeURIComponent(userId)}
              path={(entry) =>
                `/project/${projectId}/users/${encodeURIComponent(entry.id)}`
              }
              listKey="users"
            />
          </>
        ),
      }}
    >
      <>
        {user.data && (
          <div className="flex flex-wrap gap-2 px-4 py-4">
            <Badge variant="outline">
              {t("users.observations")}{" "}
              {compactNumberFormatter(user.data.totalObservations)}
            </Badge>
            <Badge variant="outline">
              {t("users.traces")}{" "}
              {compactNumberFormatter(user.data.totalTraces)}
            </Badge>
            <Badge variant="outline">
              {t("users.totalTokens")}{" "}
              {compactNumberFormatter(user.data.totalTokens)}
            </Badge>
            <Badge variant="outline">
              <span className="flex items-center gap-1">
                {t("users.totalCost")}{" "}
                <CurrencyAmount usdValue={user.data.sumCalculatedTotalCost} />
              </span>
            </Badge>
            <Badge variant="outline">
              {t("users.active")}{" "}
              {user.data.firstTrace
                ? `${formatDate(user.data.firstTrace, {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })} - ${
                    user.data.lastTrace
                      ? formatDate(user.data.lastTrace, {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })
                      : ""
                  }`
                : isBetaEnabled
                  ? t("users.noActivityYet")
                  : t("users.noTracesYet")}
            </Badge>
          </div>
        )}

        <div className="border-border border-t" />

        <div>
          <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">
              {t("common.selectTab")}
            </label>
            <select
              id="tabs"
              name="tabs"
              className="border-border bg-background text-foreground block w-full rounded-md py-2 pr-10 pl-3 text-base focus:outline-hidden sm:text-sm"
              defaultValue={currentTab}
              onChange={(e) => handleTabChange(e.currentTarget.value)}
            >
              {tabs.map((tab) => (
                <option key={tab} value={tab}>
                  {t(tabLabelKeys[tab])}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-border border-b">
              <nav className="-mb-px flex" aria-label={t("common.tabs")}>
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={cn(
                      tab === currentTab
                        ? "border-primary-accent text-primary-accent"
                        : "text-muted-foreground hover:border-border hover:text-primary border-transparent",
                      "border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap",
                    )}
                    aria-current={tab === currentTab ? "page" : undefined}
                    onClick={() => handleTabChange(tab)}
                  >
                    {t(tabLabelKeys[tab])}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">{renderTabContent()}</div>
      </>
    </Page>
  );
}

type TabProps = {
  userId: string;
  projectId: string;
};

function ScoresTab({ userId, projectId }: TabProps) {
  return (
    <ScoresTable
      projectId={projectId}
      userId={userId}
      hiddenColumns={["userId"]}
    />
  );
}

function TracesTab({ userId, projectId }: TabProps) {
  const { isBetaEnabled } = useV4Beta();

  if (isBetaEnabled) {
    return (
      <ObservationsEventsTable
        projectId={projectId}
        userId={userId}
        omittedFilter={["userId"]}
      />
    );
  }

  return (
    <TracesTable
      projectId={projectId}
      userId={userId}
      omittedFilter={["userId"]}
    />
  );
}

function SessionsTab({ userId, projectId }: TabProps) {
  const { isBetaEnabled } = useV4Beta();

  return (
    <SessionsTable
      projectId={projectId}
      userId={userId}
      omittedFilter={["userIds"]}
      isBetaEnabled={isBetaEnabled}
    />
  );
}
