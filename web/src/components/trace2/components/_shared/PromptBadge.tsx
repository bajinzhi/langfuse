import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { api } from "@/src/utils/api";
import { useI18n } from "@/src/features/i18n";

export const PromptBadge = (props: { promptId: string; projectId: string }) => {
  const { t } = useI18n();
  const prompt = api.prompts.byId.useQuery({
    id: props.promptId,
    projectId: props.projectId,
  });

  if (prompt.isLoading || !prompt.data) return null;

  return (
    <Link
      href={`/project/${props.projectId}/prompts/${encodeURIComponent(prompt.data.name)}?version=${prompt.data.version}`}
      className="inline-flex"
    >
      <Badge variant="tertiary">
        <span className="truncate">
          {t("prompts.promptVersionBadge", {
            name: prompt.data.name,
            version: prompt.data.version,
          })}
        </span>
        <ExternalLinkIcon className="ml-1 h-3 w-3" />
      </Badge>
    </Link>
  );
};
