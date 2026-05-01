import Page from "@/src/components/layouts/page";
import { EvalTemplateForm } from "@/src/features/evals/components/template-form";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { useRouter } from "next/router";
import { useI18n } from "@/src/features/i18n";

export default function NewTemplatesPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { t } = useI18n();

  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "evalTemplate:read",
  });

  if (!hasAccess) {
    return null;
  }

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: t("evals.select.createCustomEvaluator"),
        breadcrumb: [
          {
            name: t("evals.page.evaluators"),
            href: `/project/${projectId}/evals/templates`,
          },
        ],
      }}
    >
      <EvalTemplateForm
        projectId={projectId}
        isEditing={true}
        useDialog={false}
      />
    </Page>
  );
}
