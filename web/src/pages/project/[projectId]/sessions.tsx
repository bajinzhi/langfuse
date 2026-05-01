import React from "react";
import { useRouter } from "next/router";
import SessionsTable from "@/src/components/table/use-cases/sessions";
import Page from "@/src/components/layouts/page";
import { SessionsOnboarding } from "@/src/components/onboarding/SessionsOnboarding";
import { api } from "@/src/utils/api";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { useI18n } from "@/src/features/i18n";

export default function Sessions() {
  const { t } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { isBetaEnabled } = useV4Beta();

  const { data: hasAnySession, isLoading } = api.sessions.hasAny.useQuery(
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

  const { data: hasAnySessionFromEvents, isLoading: isLoadingFromEvents } =
    api.sessions.hasAnyFromEvents.useQuery(
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

  const hasSessions = isBetaEnabled ? hasAnySessionFromEvents : hasAnySession;
  const isLoadingSessions = isBetaEnabled ? isLoadingFromEvents : isLoading;
  const showOnboarding = !isLoadingSessions && !hasSessions;

  return (
    <Page
      headerProps={{
        title: t("observability.sessions.title"),
        help: {
          description: t("observability.sessions.help"),
          href: "https://langfuse.com/docs/observability/features/sessions",
        },
      }}
      scrollable={showOnboarding}
    >
      {/* Show onboarding screen if user has no sessions */}
      {showOnboarding ? (
        <SessionsOnboarding />
      ) : (
        <SessionsTable projectId={projectId} isBetaEnabled={isBetaEnabled} />
      )}
    </Page>
  );
}
