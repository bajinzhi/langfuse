import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

type NoMatchDisplayProps = {
  modelName: string;
};

export type { NoMatchDisplayProps };

export function NoMatchDisplay({ modelName }: NoMatchDisplayProps) {
  const { t } = useI18n();

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2 text-base">
          <AlertCircle className="h-5 w-5" />
          {t("models.test.noMatchTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{t("models.test.noMatchBody", { modelName })}</p>

        <div>
          <p className="mb-2 text-sm font-medium">
            {t("models.test.suggestions")}
          </p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>{t("models.test.suggestionCheckName")}</li>
            <li>{t("models.test.suggestionViewModels")}</li>
            <li>{t("models.test.suggestionCreate")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
