import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { useI18n } from "@/src/features/i18n";

export const SupportOrUpgradePage = () => {
  const { t } = useI18n();
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("billing.accessRestricted")}</AlertTitle>
          <AlertDescription>
            <p>{t("billing.additionalPermissions")}</p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
