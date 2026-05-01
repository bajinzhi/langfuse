import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { useI18n } from "@/src/features/i18n";

export type MatchedModelCardProps = {
  model: {
    modelName: string;
    matchPattern: string;
    projectId: string | null;
  };
};

export function MatchedModelCard({ model }: MatchedModelCardProps) {
  const { t } = useI18n();
  const isLangfuseModel = !model.projectId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("models.test.matchedModel")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold">
            {model.modelName}
          </span>
          {isLangfuseModel && (
            <Badge variant="secondary" className="text-xs">
              Langfuse
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs font-medium">
            {t("models.test.pattern")}
          </div>
          <code className="bg-muted/50 block rounded p-2 text-xs break-all">
            {model.matchPattern}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
