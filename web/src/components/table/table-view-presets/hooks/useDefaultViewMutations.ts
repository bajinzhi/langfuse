import { api } from "@/src/utils/api";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { type DefaultViewScope } from "@langfuse/shared/src/server";
import { useI18n } from "@/src/features/i18n";

interface UseDefaultViewMutationsProps {
  tableName: string;
  projectId: string;
}

export function useDefaultViewMutations({
  tableName,
  projectId,
}: UseDefaultViewMutationsProps) {
  const { t } = useI18n();
  const utils = api.useUtils();

  const setAsDefault = api.TableViewPresets.setAsDefault.useMutation({
    onSuccess: (_, variables) => {
      utils.TableViewPresets.getDefault.invalidate({
        projectId,
        viewName: tableName,
      });
      utils.TableViewPresets.getDefaultAssignments.invalidate({
        projectId,
        viewName: tableName,
      });
      const scopeLabel =
        variables.scope === "user"
          ? t("table.views.scope.your")
          : t("table.views.scope.project");
      showSuccessToast({
        title: t("table.views.defaultSetTitle"),
        description: t("table.views.defaultSetDescription", {
          scope: scopeLabel,
        }),
      });
    },
    onError: (error) => {
      showErrorToast(t("table.views.defaultSetFailed"), error.message);
    },
  });

  const clearDefault = api.TableViewPresets.clearDefault.useMutation({
    onSuccess: (_, variables) => {
      utils.TableViewPresets.getDefault.invalidate({
        projectId,
        viewName: tableName,
      });
      utils.TableViewPresets.getDefaultAssignments.invalidate({
        projectId,
        viewName: tableName,
      });
      const scopeLabel =
        variables.scope === "user"
          ? t("table.views.scope.your")
          : t("table.views.scope.project");
      showSuccessToast({
        title: t("table.views.defaultClearedTitle"),
        description: t("table.views.defaultClearedDescription", {
          scope: scopeLabel,
        }),
      });
    },
    onError: (error) => {
      showErrorToast(t("table.views.defaultClearFailed"), error.message);
    },
  });

  const setViewAsDefault = (viewId: string, scope: DefaultViewScope) => {
    setAsDefault.mutate({
      projectId,
      viewId,
      viewName: tableName,
      scope,
    });
  };

  const clearViewDefault = (scope: DefaultViewScope) => {
    clearDefault.mutate({
      projectId,
      viewName: tableName,
      scope,
    });
  };

  return {
    setViewAsDefault,
    clearViewDefault,
    isSettingDefault: setAsDefault.isPending,
  };
}
