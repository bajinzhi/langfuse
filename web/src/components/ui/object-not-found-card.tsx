import { Card } from "@/src/components/ui/card";
import { SearchXIcon } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

export const ObjectNotFoundCard = ({
  type,
}: {
  type: "TRACE" | "OBSERVATION" | "SESSION";
}) => {
  const { t } = useI18n();
  const typeLabel =
    type === "TRACE"
      ? t("common.trace")
      : type === "OBSERVATION"
        ? t("common.observation")
        : t("common.session");

  return (
    <Card className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <SearchXIcon className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
        <p className="text-muted-foreground text-sm capitalize">
          {t("common.objectNotFoundDeleted", { type: typeLabel })}
        </p>
      </div>
    </Card>
  );
};
