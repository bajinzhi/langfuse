import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

export const DASHBOARD_TABS = {
  DASHBOARDS: "dashboards",
  WIDGETS: "widgets",
} as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[keyof typeof DASHBOARD_TABS];

export const getDashboardTabs = (projectId: string, t: Translate) => [
  {
    value: DASHBOARD_TABS.DASHBOARDS,
    label: t("nav.dashboards"),
    href: `/project/${projectId}/dashboards`,
  },
  {
    value: DASHBOARD_TABS.WIDGETS,
    label: t("nav.widgets"),
    href: `/project/${projectId}/widgets`,
  },
];
