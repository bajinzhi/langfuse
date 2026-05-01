import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { useSupportDrawer } from "@/src/features/support-chat/SupportDrawerProvider";
import { useI18n } from "@/src/features/i18n";

export const SSOSettings = () => {
  const hasEntitlement = useHasEntitlement("cloud-multi-tenant-sso");
  const { setOpen: setSupportDrawerOpen } = useSupportDrawer();
  const { t } = useI18n();

  const commonContent = (
    <>
      <Header title={t("sso.configurationTitle")} />
      <p className="text-muted-foreground mb-4 text-sm">
        {t("sso.configurationDescription")}
      </p>
    </>
  );

  if (!hasEntitlement) {
    return (
      <div>
        {commonContent}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("sso.notAvailable")}</AlertTitle>
          <AlertDescription>
            {t("sso.notAvailableDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {commonContent}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("sso.contactSupportTitle")}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>{t("sso.contactSupportDescription")}</p>
          <Button
            onClick={() => setSupportDrawerOpen(true)}
            className="self-start"
          >
            {t("sso.contactSupport")}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
