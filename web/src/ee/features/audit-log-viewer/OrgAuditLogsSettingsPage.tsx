import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { AuditLogsTable } from "@/src/ee/features/audit-log-viewer/AuditLogsTable";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import { useHasOrganizationAccess } from "@/src/features/rbac/utils/checkOrganizationAccess";
import { useI18n } from "@/src/features/i18n";

export function OrgAuditLogsSettingsPage(props: { orgId: string }) {
  const { t } = useI18n();
  const hasAccess = useHasOrganizationAccess({
    organizationId: props.orgId,
    scope: "auditLogs:read",
  });
  const hasEntitlement = useHasEntitlement("audit-logs");

  const body = !hasEntitlement ? (
    <p className="text-muted-foreground text-sm">
      {t("auditLogs.organizationEnterpriseDescription")}
    </p>
  ) : !hasAccess ? (
    <Alert>
      <AlertTitle>{t("common.accessDenied")}</AlertTitle>
      <AlertDescription>
        {t("auditLogs.organizationAccessDescription")}
      </AlertDescription>
    </Alert>
  ) : (
    <AuditLogsTable scope="organization" orgId={props.orgId} />
  );

  return (
    <>
      <Header title={t("auditLogs.organizationTitle")} />
      <p className="text-muted-foreground mb-2 text-sm">
        {t("auditLogs.organizationSettingsDescription")}
      </p>
      {body}
    </>
  );
}
