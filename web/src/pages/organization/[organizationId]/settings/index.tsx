import { PagedSettingsContainer } from "@/src/components/PagedSettingsContainer";
import Header from "@/src/components/layouts/header";
import { MembershipInvitesPage } from "@/src/features/rbac/components/MembershipInvitesPage";
import { MembersTable } from "@/src/features/rbac/components/MembersTable";
import RenameOrganization from "@/src/features/organizations/components/RenameOrganization";
import { useQueryOrganization } from "@/src/features/organizations/hooks";
import { useRouter } from "next/router";
import { SettingsDangerZone } from "@/src/components/SettingsDangerZone";
import { DeleteOrganizationButton } from "@/src/features/organizations/components/DeleteOrganizationButton";
import { useHasEntitlement, usePlan } from "@/src/features/entitlements/hooks";
import ContainerPage from "@/src/components/layouts/container-page";
import { SSOSettings } from "@/src/ee/features/sso-settings/components/SSOSettings";
import { isCloudPlan } from "@langfuse/shared";
import { useQueryProjectOrOrganization } from "@/src/features/projects/hooks";
import { ApiKeyList } from "@/src/features/public-api/components/ApiKeyList";
import { OrgAuditLogsSettingsPage } from "@/src/ee/features/audit-log-viewer/OrgAuditLogsSettingsPage";
import { useI18n } from "@/src/features/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

type OrganizationSettingsPage = {
  title: string;
  slug: string;
  show?: boolean | (() => boolean);
  cmdKKeywords?: string[];
} & ({ content: React.ReactNode } | { href: string });

export function useOrganizationSettingsPages(): OrganizationSettingsPage[] {
  const { organization } = useQueryProjectOrOrganization();
  const showOrgApiKeySettings = useHasEntitlement("admin-api");
  const showAuditLogs = useHasEntitlement("audit-logs");
  const showSsoSettings = useHasEntitlement("cloud-multi-tenant-sso");
  const plan = usePlan();
  const isLangfuseCloud = isCloudPlan(plan) ?? false;
  const { t } = useI18n();

  if (!organization) return [];

  return getOrganizationSettingsPages({
    organization,
    showOrgApiKeySettings,
    showAuditLogs,
    showSsoSettings: isLangfuseCloud && showSsoSettings,
    t,
  });
}

export const getOrganizationSettingsPages = ({
  organization,
  showOrgApiKeySettings,
  showAuditLogs,
  showSsoSettings,
  t,
}: {
  organization: { id: string; name: string; metadata: Record<string, unknown> };
  showOrgApiKeySettings: boolean;
  showAuditLogs: boolean;
  showSsoSettings: boolean;
  t: Translate;
}): OrganizationSettingsPage[] => [
  {
    title: t("nav.general"),
    slug: "index",
    cmdKKeywords: ["name", "id", "delete"],
    content: (
      <div className="flex flex-col gap-6">
        <RenameOrganization />
        <SettingsDangerZone
          items={[
            {
              title: t("settings.organization.delete.title"),
              description: t("settings.organization.delete.description"),
              button: <DeleteOrganizationButton />,
            },
          ]}
        />
      </div>
    ),
  },
  {
    title: t("settings.organization.apiKeys"),
    slug: "api-keys",
    content: (
      <div className="flex flex-col gap-6">
        <ApiKeyList entityId={organization.id} scope="organization" />
      </div>
    ),
    show: showOrgApiKeySettings,
  },
  {
    title: t("nav.members"),
    slug: "members",
    cmdKKeywords: ["invite", "user", "rbac"],
    content: (
      <div className="flex flex-col gap-6">
        <div>
          <Header title={t("settings.organization.members")} />
          <MembersTable orgId={organization.id} />
        </div>
        <div>
          <MembershipInvitesPage orgId={organization.id} />
        </div>
      </div>
    ),
  },
  {
    title: t("nav.auditLogs"),
    slug: "audit-logs",
    cmdKKeywords: ["audit", "logs", "history", "changes"],
    content: <OrgAuditLogsSettingsPage orgId={organization.id} />,
    show: showAuditLogs,
  },
  {
    title: t("nav.sso"),
    slug: "sso",
    cmdKKeywords: ["sso", "login", "auth", "okta", "saml", "azure"],
    content: <SSOSettings />,
    show: showSsoSettings,
  },
  {
    title: t("settings.organization.projects"),
    slug: "projects",
    href: `/organization/${organization.id}`,
  },
];

const OrgSettingsPage = () => {
  const organization = useQueryOrganization();
  const router = useRouter();
  const { page } = router.query;
  const pages = useOrganizationSettingsPages();
  const { t } = useI18n();

  if (!organization) return null;

  return (
    <ContainerPage
      headerProps={{
        title: t("settings.organization.title"),
      }}
    >
      <PagedSettingsContainer
        activeSlug={page as string | undefined}
        pages={pages}
      />
    </ContainerPage>
  );
};

export default OrgSettingsPage;
