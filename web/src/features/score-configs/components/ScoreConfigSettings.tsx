import React from "react";
import Header from "@/src/components/layouts/header";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { ScoreConfigsTable } from "@/src/components/table/use-cases/score-configs";
import { useI18n } from "@/src/features/i18n";

export function ScoreConfigSettings({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const hasReadAccess = useHasProjectAccess({
    projectId: projectId,
    scope: "scoreConfigs:read",
  });

  if (!hasReadAccess) return null;

  return (
    <div id="score-configs">
      <Header title={t("scoreConfigs.title")} />
      <p className="mb-2 text-sm">
        {t("scoreConfigs.descriptionBefore")}
        <a
          href="https://langfuse.com/docs/evaluation/evaluation-methods/annotation"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("scoreConfigs.descriptionLink")}
        </a>{" "}
        {t("scoreConfigs.descriptionAfter")}
      </p>
      <ScoreConfigsTable projectId={projectId} />
    </div>
  );
}
