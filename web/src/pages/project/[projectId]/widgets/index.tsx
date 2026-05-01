import { useRouter } from "next/router";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import Page from "@/src/components/layouts/page";
import { ActionButton } from "@/src/components/ActionButton";
import { PlusIcon } from "lucide-react";
import { DashboardWidgetTable } from "@/src/features/widgets";
import {
  getDashboardTabs,
  DASHBOARD_TABS,
} from "@/src/features/navigation/utils/dashboard-tabs";
import { useI18n } from "@/src/features/i18n";

export default function Widgets() {
  const router = useRouter();
  const { t } = useI18n();
  const { projectId } = router.query as { projectId: string };
  const capture = usePostHogClientCapture();
  const hasCUDAccess = useHasProjectAccess({
    projectId,
    scope: "prompts:CUD",
  });

  return (
    <Page
      headerProps={{
        title: t("nav.widgets"),
        help: {
          description: t("widgets.pageDescription"),
          href: "https://langfuse.com/docs/metrics/features/custom-dashboards",
        },
        tabsProps: {
          tabs: getDashboardTabs(projectId, t),
          activeTab: DASHBOARD_TABS.WIDGETS,
        },
        actionButtonsRight: (
          <ActionButton
            icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}
            hasAccess={hasCUDAccess}
            href={`/project/${projectId}/widgets/new`}
            variant="default"
            onClick={() => {
              capture("dashboard:new_widget_form_open");
            }}
          >
            {t("widgets.new")}
          </ActionButton>
        ),
      }}
    >
      <DashboardWidgetTable />
    </Page>
  );
}
