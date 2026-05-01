import { useRouter } from "next/router";
import { CheckIcon, CopyIcon, EllipsisVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  buildEventsTablePathForObservationType,
  buildEventsTablePathForSpanName,
} from "@/src/features/events/lib/eventsTablePaths";
import { copyTextToClipboard } from "@/src/utils/clipboard";
import { type ObservationType } from "@langfuse/shared";
import { useI18n } from "@/src/features/i18n";

type IdItem = {
  name: string;
  id: string;
};

type DetailHeaderActionsMenuProps = {
  idItems: IdItem[];
  observationType?: ObservationType;
  projectId: string;
  spanName?: string;
};

export function DetailHeaderActionsMenu({
  idItems,
  observationType,
  projectId,
  spanName,
}: DetailHeaderActionsMenuProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (textToCopy: string) => {
    copyTextToClipboard(textToCopy);
    setCopiedId(textToCopy);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const shouldShowFilterItem = Boolean(spanName?.trim());

  const href = shouldShowFilterItem
    ? buildEventsTablePathForSpanName({
        currentPath: router.asPath,
        projectId,
        spanName: spanName ?? "",
      })
    : null;

  const typeHref = observationType
    ? buildEventsTablePathForObservationType({
        currentPath: router.asPath,
        projectId,
        observationType,
      })
    : null;

  const filterTypeLabel = observationType ? `type:${observationType}` : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("trace.options")}
          className="mt-0.5 shrink-0"
          size="icon-xs"
          title={t("trace.options")}
          variant="ghost"
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(href || typeHref) && (
          <>
            {href && (
              <DropdownMenuItem
                className="text-xs"
                onSelect={() => void router.push(href)}
              >
                <span className="max-w-[260px] truncate" title={spanName}>
                  {t("trace.filterBy")}{" "}
                  <span className="font-semibold">name:{spanName}</span>
                </span>
              </DropdownMenuItem>
            )}
            {typeHref && filterTypeLabel && (
              <DropdownMenuItem
                className="text-xs"
                onSelect={() => void router.push(typeHref)}
              >
                <span
                  className="max-w-[260px] truncate"
                  title={filterTypeLabel}
                >
                  {t("trace.filterBy")}{" "}
                  <span className="font-semibold">{filterTypeLabel}</span>
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {idItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="text-xs"
            onSelect={() => handleCopy(item.id)}
          >
            {copiedId === item.id ? (
              <CheckIcon className="text-muted-green mr-2 h-4 w-4" />
            ) : (
              <CopyIcon className="mr-2 h-4 w-4" />
            )}
            <span className="max-w-[260px] truncate" title={item.id}>
              {t("trace.copyItem", { item: item.name })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
