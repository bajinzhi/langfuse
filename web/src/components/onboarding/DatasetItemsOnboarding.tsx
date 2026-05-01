import { useState } from "react";
import { SplashScreen } from "@/src/components/ui/splash-screen";
import { Braces, Code, ListTree, Upload } from "lucide-react";
import DocPopup from "@/src/components/layouts/doc-popup";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { CsvUploadDialog } from "@/src/features/datasets/components/CsvUploadDialog";
import { NewDatasetItemForm } from "@/src/features/datasets/components/NewDatasetItemForm";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { cn } from "@/src/utils/tailwind";
import { useI18n } from "@/src/features/i18n";

interface DatasetItemEntryPointRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  hasAccess?: boolean;
  comingSoon?: boolean;
  docPopup?: {
    description: string;
    href: string;
  };
}

const DatasetItemEntryPointRow = ({
  icon,
  title,
  description,
  onClick,
  hasAccess = true,
  comingSoon = false,
  docPopup,
}: DatasetItemEntryPointRowProps) => {
  const { t } = useI18n();
  const disabled = !hasAccess || comingSoon;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={cn(
        "border-border flex h-20 items-center gap-4 rounded-lg border p-4 transition-colors",
        disabled
          ? "bg-muted text-muted-foreground opacity-60"
          : "bg-card hover:bg-accent/50 cursor-pointer",
      )}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={
        !disabled
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      title={
        !hasAccess
          ? t("onboarding.noAccess")
          : undefined
      }
    >
      <div className="flex items-center">{icon}</div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          <p className="text-muted-foreground text-sm">{description}</p>
          {docPopup && (
            <DocPopup description={docPopup.description} href={docPopup.href} />
          )}
        </div>
      </div>
    </div>
  );
};

export const DatasetItemsOnboarding = ({
  projectId,
  datasetId,
}: {
  projectId: string;
  datasetId: string;
}) => {
  const { t } = useI18n();
  const capture = usePostHogClientCapture();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);

  const hasProjectAccess = useHasProjectAccess({
    projectId,
    scope: "datasets:CUD",
  });

  return (
    <SplashScreen
      title={t("onboarding.datasetItems.title")}
      description={t("onboarding.datasetItems.description")}
    >
      <div className="flex flex-col gap-4">
        <CsvUploadDialog
          open={hasProjectAccess && isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          projectId={projectId}
          datasetId={datasetId}
        >
          <DialogTrigger asChild disabled={!hasProjectAccess}>
            <DatasetItemEntryPointRow
              icon={<Upload className="h-5 w-5" />}
              title={t("onboarding.datasetItems.uploadCsv")}
              description={t("onboarding.datasetItems.uploadCsvDescription")}
              onClick={() => {
                if (hasProjectAccess) {
                  capture("dataset_item:upload_csv_button_click");
                }
              }}
              hasAccess={hasProjectAccess}
            />
          </DialogTrigger>
        </CsvUploadDialog>

        <Dialog
          open={hasProjectAccess && isNewItemDialogOpen}
          onOpenChange={setIsNewItemDialogOpen}
        >
          <DialogTrigger asChild disabled={!hasProjectAccess}>
            <DatasetItemEntryPointRow
              icon={<Braces className="h-5 w-5" />}
              title={t("onboarding.datasetItems.addManually")}
              description={t("onboarding.datasetItems.addManuallyDescription")}
              onClick={() => {
                if (hasProjectAccess) {
                  capture("dataset_item:new_form_open");
                }
              }}
              hasAccess={hasProjectAccess}
            />
          </DialogTrigger>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>{t("onboarding.datasetItems.createItem")}</DialogTitle>
            </DialogHeader>
            <NewDatasetItemForm
              projectId={projectId}
              datasetId={datasetId}
              onFormSuccess={() => setIsNewItemDialogOpen(false)}
              className="h-full overflow-y-auto"
            />
          </DialogContent>
        </Dialog>

        <Link
          href="https://langfuse.com/docs/evaluation/experiments/datasets#create-items-from-production-data"
          target="_blank"
        >
          <DatasetItemEntryPointRow
            icon={<Code className="h-5 w-5" />}
            title={t("onboarding.datasetItems.addViaCode")}
            description={t("onboarding.datasetItems.addViaCodeDescription")}
          />
        </Link>

        <DatasetItemEntryPointRow
          icon={<ListTree className="h-5 w-5" />}
          title={t("onboarding.datasetItems.selectTraces")}
          description={t("onboarding.comingSoon")}
          comingSoon
          docPopup={{
            description: t("onboarding.datasetItems.selectTracesDescription"),
            href: "https://langfuse.com/docs/evaluation/experiments/datasets#create-items-from-production-data",
          }}
        />
      </div>
    </SplashScreen>
  );
};
