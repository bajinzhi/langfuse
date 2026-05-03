import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { useI18n } from "@/src/features/i18n";

type EvaluatorPromptPreviewProps = {
  trigger: React.ReactNode;
  previewContent: string;
};

export function EvaluatorPromptPreview(props: EvaluatorPromptPreviewProps) {
  const { trigger, previewContent } = props;
  const { t } = useI18n();

  return (
    <HoverCard openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        className="z-50 w-[520px] max-w-[85vw]"
        align="end"
        onWheel={(event) => event.stopPropagation()}
      >
        <p className="text-muted-foreground mb-2 text-xs">
          {t("batchActions.evaluatorPromptPreview")}
        </p>
        <pre
          className="bg-muted/20 max-h-[320px] overflow-y-auto rounded-md border p-2 text-xs wrap-break-word whitespace-pre-wrap"
          onWheel={(event) => event.stopPropagation()}
        >
          {previewContent}
        </pre>
      </HoverCardContent>
    </HoverCard>
  );
}
