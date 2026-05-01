import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { BatchExportsTable } from "@/src/features/batch-exports/components/BatchExportsTable";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { SettingsTableCard } from "@/src/components/layouts/settings-table-card";
import { useI18n } from "@/src/features/i18n";

export function BatchExportsSettingsPage(props: { projectId: string }) {
  const { t } = useI18n();
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "batchExports:read",
  });

  return (
    <>
      <Header title={t("nav.exports")} />
      <p className="mb-4 text-sm">
        {t("batchExport.settingsDescription")}
      </p>
      {hasAccess ? (
        <SettingsTableCard>
          <BatchExportsTable projectId={props.projectId} />
        </SettingsTableCard>
      ) : (
        <Alert>
          <AlertTitle>{t("batchActions.accessDenied")}</AlertTitle>
          <AlertDescription>
            {t("batchExport.accessDeniedDescription")}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
