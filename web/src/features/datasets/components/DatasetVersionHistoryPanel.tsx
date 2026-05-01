import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/components/ui/accordion";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { api } from "@/src/utils/api";
import { useDatasetVersion } from "../hooks/useDatasetVersion";
import { Clock, MoreVertical, Copy, ExternalLink } from "lucide-react";
import {
  isToday,
  isYesterday,
  isWithinInterval,
  subDays,
  startOfDay,
  formatDistanceToNow,
} from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { cn } from "@/src/utils/tailwind";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { useI18n } from "@/src/features/i18n";

type DatasetVersionHistoryPanelProps = {
  projectId: string;
  datasetId: string;
  itemVersions?: Date[]; // Optional: versions where a specific item changed
};

type GroupedVersions = {
  today: Date[];
  yesterday: Date[];
  last7Days: Date[];
  last30Days: Date[];
  older: Date[];
};

function groupVersionsByTime(versions: Date[]): GroupedVersions {
  const now = new Date();
  const dayStart = startOfDay(now);
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  return {
    today: versions.filter((v) => isToday(v)),
    yesterday: versions.filter((v) => isYesterday(v)),
    last7Days: versions.filter(
      (v) =>
        !isToday(v) &&
        !isYesterday(v) &&
        isWithinInterval(v, { start: sevenDaysAgo, end: dayStart }),
    ),
    last30Days: versions.filter(
      (v) =>
        !isWithinInterval(v, { start: sevenDaysAgo, end: now }) &&
        isWithinInterval(v, { start: thirtyDaysAgo, end: now }),
    ),
    older: versions.filter((v) => v < thirtyDaysAgo),
  };
}

export function DatasetVersionHistoryPanel({
  projectId,
  datasetId,
  itemVersions,
}: DatasetVersionHistoryPanelProps) {
  const { selectedVersion, setSelectedVersion, resetToLatest } =
    useDatasetVersion();
  const { locale, t, formatDate } = useI18n();
  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  const { data: versions, isLoading } =
    api.datasets.listDatasetVersions.useQuery({
      projectId,
      datasetId,
    });

  const copyVersionTimestamp = (version: Date) => {
    const isoTimestamp = version.toISOString();
    navigator.clipboard.writeText(isoTimestamp);
    showSuccessToast({
      title: t("datasets.copiedTitle"),
      description: t("datasets.copyVersionTimestampDescription", {
        timestamp: isoTimestamp,
      }),
    });
  };

  const openDocumentation = () => {
    window.open(
      "https://langfuse.com/docs/datasets/dataset-versioning",
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-muted-foreground text-center text-sm">
          <Clock className="mx-auto mb-2 h-8 w-8" />
          <p>{t("datasets.noVersionsFound")}</p>
        </div>
      </div>
    );
  }

  const latestVersion = versions[0];
  const groupedVersions = groupVersionsByTime(versions);

  const renderVersionItem = (version: Date, index: number) => {
    const isLatest = index === 0 && version === latestVersion;
    const isSelected =
      selectedVersion?.getTime() === version.getTime() ||
      (isLatest && !selectedVersion);

    // Check if this version has item-specific changes
    const isItemVersion = itemVersions?.some(
      (iv) => iv.getTime() === version.getTime(),
    );

    return (
      <div
        key={version.toISOString()}
        className="group relative flex items-center gap-1"
      >
        <Button
          onClick={() => {
            if (isLatest) {
              resetToLatest();
            } else {
              setSelectedVersion(version);
            }
          }}
          variant="ghost"
          className={cn(
            "hover:bg-muted/50 flex h-auto flex-1 flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
            isSelected && "bg-muted hover:bg-muted font-medium",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {isItemVersion && (
                <span
                  className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full"
                  title={t("datasets.itemModifiedInVersion")}
                />
              )}
              <span className={cn("truncate", isSelected && "text-foreground")}>
                {formatDate(version, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {isLatest && (
              <span className="bg-accent-light-green text-accent-dark-green dark:bg-accent-dark-green dark:text-accent-light-green shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
                {t("datasets.latest")}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-xs",
              isSelected ? "text-muted-foreground" : "text-muted-foreground",
            )}
          >
            {formatDistanceToNow(version, {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t("datasets.versionActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                copyVersionTimestamp(version);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t("datasets.copyVersionTimestamp")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                openDocumentation();
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("datasets.howToUseInExperiments")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">{t("datasets.versionHistory")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("datasets.versionCount", {
            count: versions.length,
            plural: versions.length === 1 ? "" : "s",
          })}
        </p>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={["today"]}>
          {/* Today */}
          {groupedVersions.today.length > 0 && (
            <AccordionItem value="today" className="px-2">
              <AccordionTrigger className="text-sm font-medium">
                {t("datasets.today")} ({groupedVersions.today.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {groupedVersions.today.map((v, i) => renderVersionItem(v, i))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Yesterday */}
          {groupedVersions.yesterday.length > 0 && (
            <AccordionItem value="yesterday" className="px-2">
              <AccordionTrigger className="text-sm font-medium">
                {t("datasets.yesterday")} ({groupedVersions.yesterday.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {groupedVersions.yesterday.map((v) =>
                    renderVersionItem(v, versions.indexOf(v)),
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Last 7 Days */}
          {groupedVersions.last7Days.length > 0 && (
            <AccordionItem value="last7days" className="px-2">
              <AccordionTrigger className="text-sm font-medium">
                {t("datasets.last7Days")} ({groupedVersions.last7Days.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {groupedVersions.last7Days.map((v) =>
                    renderVersionItem(v, versions.indexOf(v)),
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Last 30 Days */}
          {groupedVersions.last30Days.length > 0 && (
            <AccordionItem value="last30days" className="px-2">
              <AccordionTrigger className="text-sm font-medium">
                {t("datasets.last30Days")} ({groupedVersions.last30Days.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {groupedVersions.last30Days.map((v) =>
                    renderVersionItem(v, versions.indexOf(v)),
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Older */}
          {groupedVersions.older.length > 0 && (
            <AccordionItem value="older" className="px-2">
              <AccordionTrigger className="text-sm font-medium">
                {t("datasets.older")} ({groupedVersions.older.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {groupedVersions.older.map((v) =>
                    renderVersionItem(v, versions.indexOf(v)),
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}
