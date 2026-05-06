import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/src/components/ui/dropdown-menu";
import useLocalStorage from "@/src/components/useLocalStorage";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useI18n } from "@/src/features/i18n";
import { Rows3, Rows2, Rows4 } from "lucide-react";

const heightOptions = [
  { id: "s", labelKey: "table.rowHeight.small", icon: <Rows4 /> },
  { id: "m", labelKey: "table.rowHeight.medium", icon: <Rows3 /> },
  { id: "l", labelKey: "table.rowHeight.large", icon: <Rows2 /> },
] as const;

const defaultHeights: Record<RowHeight, string> = {
  // 36px (h-9) gives CJK characters at 13px the breathing room they need;
  // matches the row density of WeChat-style desktop lists.
  s: "h-9",
  m: "h-24",
  l: "h-64",
};

export type RowHeight = (typeof heightOptions)[number]["id"];
export type CustomHeights = Record<RowHeight, string>;

export const getRowHeightTailwindClass = (
  rowHeight?: RowHeight,
  customHeights?: CustomHeights,
) => {
  if (!rowHeight) return undefined;
  return customHeights?.[rowHeight] || defaultHeights[rowHeight];
};

export function useRowHeightLocalStorage(
  tableName: string,
  defaultValue: RowHeight,
) {
  const [rowHeight, setRowHeight, clearRowHeight] = useLocalStorage<RowHeight>(
    `${tableName}Height`,
    defaultValue,
  );

  return [rowHeight, setRowHeight, clearRowHeight] as const;
}

export const DataTableRowHeightSwitch = ({
  rowHeight,
  setRowHeight,
}: {
  rowHeight: RowHeight;
  setRowHeight: (e: RowHeight) => void;
}) => {
  const { t } = useI18n();
  const capture = usePostHogClientCapture();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title={t("table.rowHeight.title")}
        >
          <Rows3 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuLabel>{t("table.rowHeight.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {heightOptions.map(({ id, labelKey }) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={rowHeight === id}
              onClick={(e) => {
                // Prevent closing the dropdown menu to allow the user to adjust their selection
                e.preventDefault();
                capture("table:row_height_switch_select", {
                  rowHeight: id,
                });
                setRowHeight(id);
              }}
            >
              {t(labelKey)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
