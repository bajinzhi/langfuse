import { Button } from "@/src/components/ui/button";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { UpsertModelFormDialog } from "@/src/features/models/components/UpsertModelFormDialog";
import { type GetModelResult } from "@/src/features/models/validation";
import { useI18n } from "@/src/features/i18n";

export const CloneModelButton = ({
  modelData,
  projectId,
}: {
  modelData: GetModelResult;
  projectId: string;
}) => {
  const { t } = useI18n();
  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "models:CUD",
  });

  return (
    <UpsertModelFormDialog {...{ modelData, projectId, action: "clone" }}>
      <Button
        variant="outline"
        disabled={!hasAccess}
        title={t("models.cloneTitle")}
        className="flex items-center"
      >
        <span>{t("models.clone")}</span>
      </Button>
    </UpsertModelFormDialog>
  );
};
