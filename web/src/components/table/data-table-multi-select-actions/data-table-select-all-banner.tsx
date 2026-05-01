import { type MultiSelect } from "@/src/components/table/data-table-toolbar";
import { Button } from "@/src/components/ui/button";
import { useI18n } from "@/src/features/i18n";
import { numberFormatter } from "@/src/utils/numbers";

export function DataTableSelectAllBanner({
  selectAll,
  setSelectAll,
  setRowSelection,
  pageSize,
  totalCount,
}: MultiSelect) {
  const { t } = useI18n();
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <div className="bg-light-blue/40 dark:bg-light-blue/50 @container mb-2 flex flex-wrap items-center justify-center gap-2 rounded-sm p-2">
      {selectAll ? (
        <span className="text-sm">
          {t("table.selection.allItemsSelected", {
            count: numberFormatter(totalCount ?? 0, 0),
          })}{" "}
          <Button
            variant="ghost"
            className="text-accent-dark-blue hover:text-accent-dark-blue/80 h-auto p-0 font-semibold"
            onClick={() => {
              setSelectAll(false);
              setRowSelection({});
            }}
          >
            {t("table.selection.clear")}
          </Button>
        </span>
      ) : (
        <span className="text-sm">
          {t("table.selection.pageSelected", { pageSize })}{" "}
          <Button
            variant="ghost"
            className="text-accent-dark-blue hover:text-accent-dark-blue/80 h-auto p-0 font-semibold"
            onClick={() => {
              setSelectAll(true);
            }}
          >
            {t("table.selection.selectAcrossPages", {
              count: numberFormatter(totalCount ?? 0, 0),
              pages: numberFormatter(totalPages, 0),
            })}
          </Button>
        </span>
      )}
    </div>
  );
}
