import Page from "@/src/components/layouts/page";
import { useRouter } from "next/router";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { SupportOrUpgradePage } from "@/src/ee/features/billing/components/SupportOrUpgradePage";
import { DefaultEvalModelSetup } from "@/src/features/evals/components/default-eval-model-setup";
import { useI18n } from "@/src/features/i18n";

export default function DefaultEvaluationModelPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useI18n();

  const hasReadAccess = useHasProjectAccess({
    projectId,
    scope: "evalDefaultModel:read",
  });

  if (!hasReadAccess) {
    return <SupportOrUpgradePage />;
  }

  return (
    <Page
      withPadding
      headerProps={{
        title: t("evals.defaultModel.pageTitle"),
        help: {
          description: t("evals.defaultModel.pageHelp"),
          href: "https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge",
        },
        breadcrumb: [
          {
            name: t("evals.tabs.library"),
            href: `/project/${projectId}/evals/templates`,
          },
        ],
      }}
    >
      <DefaultEvalModelSetup projectId={projectId} />
    </Page>
  );
}
