import React, { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useI18n } from "@/src/features/i18n";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/src/components/ui/table";
import { getChartTypeDisplayNameKey } from "@/src/features/widgets/chart-library/utils";
import { type DashboardWidgetChartType } from "@langfuse/shared/src/db";
import { getQueryViewLabel } from "@/src/features/widgets/lib/queryMetadataI18n";

export type WidgetItem = {
  id: string;
  name: string;
  description: string;
  view: string;
  chartType: string;
  createdAt: Date;
  updatedAt: Date;
};

interface SelectWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSelectWidget: (widget: WidgetItem) => void;
  dashboardId: string;
}

export function SelectWidgetDialog({
  open,
  onOpenChange,
  projectId,
  onSelectWidget,
  dashboardId,
}: SelectWidgetDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // Fetch widgets
  const widgets = api.dashboardWidgets.all.useQuery(
    {
      projectId,
      orderBy: {
        column: "updatedAt",
        order: "DESC",
      },
    },
    {
      enabled: Boolean(projectId) && open,
    },
  );

  const handleNavigateToNewWidget = () => {
    router.push(`/project/${projectId}/widgets/new?dashboardId=${dashboardId}`);
  };

  const handleAddWidget = () => {
    if (selectedWidgetId) {
      const selectedWidget = widgets.data?.widgets.find(
        (widget) => widget.id === selectedWidgetId,
      );
      if (selectedWidget) {
        onSelectWidget(selectedWidget as WidgetItem);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t("widgets.selectDialog.title")}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="max-h-[400px] overflow-y-auto">
            {widgets.isPending ? (
              <div className="py-8 text-center">
                {t("widgets.loadingWidgets")}
              </div>
            ) : widgets.isError ? (
              <div className="text-destructive py-8 text-center">
                {t("common.error")}: {widgets.error.message}
              </div>
            ) : widgets.data?.widgets.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                {t("widgets.noWidgetsFound")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("widgets.name")}</TableHead>
                    <TableHead>{t("widgets.description")}</TableHead>
                    <TableHead>{t("widgets.viewType")}</TableHead>
                    <TableHead>{t("widgets.chartType")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {widgets.data?.widgets.map((widget) => (
                    <TableRow
                      key={widget.id}
                      onClick={() => setSelectedWidgetId(widget.id)}
                      className={`hover:bg-muted cursor-pointer ${
                        selectedWidgetId === widget.id ? "bg-muted" : ""
                      }`}
                    >
                      <TableCell density="comfortable" className="font-medium">
                        {widget.name}
                      </TableCell>
                      <TableCell
                        density="comfortable"
                        className="truncate"
                        title={widget.description}
                      >
                        {widget.description}
                      </TableCell>
                      <TableCell density="comfortable">
                        {getQueryViewLabel(widget.view.toLowerCase(), t)}
                      </TableCell>
                      <TableCell density="comfortable">
                        {t(
                          getChartTypeDisplayNameKey(
                            widget.chartType as DashboardWidgetChartType,
                          ),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="mt-4 flex justify-between">
          <Button onClick={handleNavigateToNewWidget} variant="outline">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("widgets.createNew")}
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddWidget} disabled={!selectedWidgetId}>
              {t("widgets.addSelected")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
