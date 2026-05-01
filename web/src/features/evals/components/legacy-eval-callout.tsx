import { Callout } from "@/src/components/ui/callout";
import { Button } from "@/src/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/src/components/ui/tooltip";
import Link from "next/link";
import { useRouter } from "next/router";
import { Info } from "lucide-react";
import { isLegacyEvalTarget } from "@/src/features/evals/utils/typeHelpers";
import { useI18n } from "@/src/features/i18n";

interface LegacyEvalCalloutProps {
  projectId: string;
  evalConfigId: string;
  targetObject: string;
}

export function LegacyEvalCallout({
  projectId,
  evalConfigId,
  targetObject,
}: LegacyEvalCalloutProps) {
  const router = useRouter();
  const { t } = useI18n();
  const isDeprecated = isLegacyEvalTarget(targetObject);

  if (!isDeprecated) return null;

  return (
    <Callout
      id={`eval-remapping-peek-${evalConfigId}`}
      variant="warning"
      key="dismissed-eval-remapping-callouts"
      actions={() => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/project/${projectId}/evals/remap?evaluator=${evalConfigId}`,
              )
            }
            className="text-dark-blue h-7 text-xs hover:opacity-80"
          >
            {t("evals.legacy.upgradeThisEvaluator")}
          </Button>
        </>
      )}
    >
      <span>{t("evals.legacy.singleCalloutPrefix")} </span>
      <span className="text-dark-blue hover:opacity-80">
        <Link
          href="https://langfuse.com/faq/all/llm-as-a-judge-migration"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("evals.legacy.requiresChanges")}{" "}
        </Link>
      </span>
      <span>{t("evals.legacy.singleCalloutSuffix")}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="ml-1 inline h-4 w-4 cursor-help" />
        </TooltipTrigger>
        <TooltipContent>{t("evals.legacy.tooltipStillRuns")}</TooltipContent>
      </Tooltip>
    </Callout>
  );
}
