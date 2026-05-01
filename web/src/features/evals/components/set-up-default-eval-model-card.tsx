import { CardContent } from "@/src/components/ui/card";
import { Card } from "@/src/components/ui/card";
import { ManageDefaultEvalModel } from "@/src/features/evals/components/manage-default-eval-model";
import { useI18n } from "@/src/features/i18n";

export function SetupDefaultEvalModelCard({
  projectId,
}: {
  projectId: string;
}) {
  const { t } = useI18n();

  return (
    <Card className="border-dark-yellow bg-light-yellow mt-2">
      <CardContent className="mt-2 flex flex-col gap-1">
        <ManageDefaultEvalModel
          projectId={projectId}
          setUpMessage={
            <>
              {t("evals.defaultModel.setupMessage")}{" "}
              <a
                href="https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge#how-llm-as-a-judge-works"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t("common.learnMore")}
              </a>
            </>
          }
          variant="color-coded"
        />
        <p className="text-dark-yellow/70 text-xs">
          {t("evals.defaultModel.expectedDefault")}
        </p>
      </CardContent>
    </Card>
  );
}
