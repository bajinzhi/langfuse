import { Info } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useI18n } from "@/src/features/i18n";

type DatasetVersionWarningBannerProps = {
  selectedVersion: Date;
  resetToLatest: () => void;
  className?: string;
  changeCounts?: {
    upserts: number;
    deletes: number;
  };
};

export function DatasetVersionWarningBanner({
  selectedVersion,
  resetToLatest,
  className = "",
  changeCounts,
}: DatasetVersionWarningBannerProps) {
  const { t, formatDate } = useI18n();
  const totalChanges = changeCounts
    ? changeCounts.upserts + changeCounts.deletes
    : 0;
  const hasChanges = totalChanges > 0;

  return (
    <div
      className={`border-accent-dark-blue/10 bg-accent-light-blue/30 flex items-start gap-3 border-b p-3 ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm wrap-break-word">
            {t("datasets.viewingVersionFrom")}{" "}
            <span className="text-foreground font-medium">
              {formatDate(selectedVersion, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
          <Button
            onClick={resetToLatest}
            variant="link"
            className="h-auto shrink-0 p-0 text-sm underline-offset-4"
          >
            {t("datasets.returnToLatest")}
          </Button>
        </div>
        {changeCounts && hasChanges && (
          <p className="text-muted-foreground text-xs">
            {t("datasets.versionChanges", {
              count: totalChanges,
              plural: totalChanges !== 1 ? "s" : "",
            })}
            ,
            {changeCounts.upserts > 0 &&
              ` ${t("datasets.versionUpserts", {
                count: changeCounts.upserts,
                plural: changeCounts.upserts !== 1 ? "s" : "",
              })}`}
            {changeCounts.deletes > 0 &&
              ` ${t("datasets.versionDeletes", {
                count: changeCounts.deletes,
                plural: changeCounts.deletes !== 1 ? "s" : "",
              })}`}
          </p>
        )}
      </div>
    </div>
  );
}
