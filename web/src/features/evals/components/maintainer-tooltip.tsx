import { LangfuseIcon } from "@/src/components/LangfuseLogo";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/src/components/ui/tooltip";
import { RagasLogoIcon } from "@/src/features/evals/components/ragas-logo";
import { useI18n } from "@/src/features/i18n";
import { UserCircle2Icon } from "lucide-react";

function MaintainerIcon({ maintainer }: { maintainer: string }) {
  if (maintainer.includes("Ragas")) {
    return <RagasLogoIcon />;
  } else if (maintainer.includes("Langfuse")) {
    return <LangfuseIcon size={16} />;
  } else {
    return <UserCircle2Icon className="h-4 w-4" />;
  }
}

function getMaintainerTooltipLabel(
  maintainer: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (maintainer.includes("Ragas") && maintainer.includes("Langfuse")) {
    return t("evals.templates.maintainer.langfuseAndRagas");
  }

  if (maintainer.includes("Ragas")) {
    return t("evals.templates.maintainer.ragas");
  }

  if (maintainer.includes("Langfuse")) {
    return t("evals.templates.maintainer.langfuse");
  }

  if (maintainer.includes("User")) {
    return t("evals.templates.maintainer.user");
  }

  return t("evals.templates.maintainer.unknown");
}

export function MaintainerTooltip({ maintainer }: { maintainer: string }) {
  const { t } = useI18n();

  return (
    <Tooltip>
      <TooltipTrigger>
        <MaintainerIcon maintainer={maintainer} />
      </TooltipTrigger>
      <TooltipContent>{getMaintainerTooltipLabel(maintainer, t)}</TooltipContent>
    </Tooltip>
  );
}
