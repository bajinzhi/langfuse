import { Badge } from "@/src/components/ui/badge";
import { useI18n } from "@/src/features/i18n";

export const PromptVariableListPreview = ({
  variables,
}: {
  variables: string[];
}) => {
  const { t } = useI18n();

  if (variables.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-sm">
        {t("prompts.variablesAvailable")}
      </p>
      <div className="flex min-h-6 flex-wrap gap-2">
        {variables.map((variable) => (
          <Badge key={variable} variant="outline">
            {variable}
          </Badge>
        ))}
      </div>
    </div>
  );
};
