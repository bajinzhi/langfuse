import React from "react";
import { SplashScreen } from "@/src/components/ui/splash-screen";
import { ActionButton } from "@/src/components/ActionButton";
import { useI18n } from "@/src/features/i18n";

export function UsersOnboarding() {
  const { t } = useI18n();

  return (
    <SplashScreen
      title={t("observability.users.onboarding.title")}
      description={t("observability.users.onboarding.description")}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/users-overview-v1.mp4"
    >
      <div className="mt-8">
        <h3 className="mb-4 text-2xl font-semibold">
          {t("observability.users.onboarding.start")}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {t("observability.users.onboarding.instructions")}
        </p>
        <ActionButton
          href="https://langfuse.com/docs/observability/features/users"
          variant="default"
        >
          {t("observability.onboarding.docs")}
        </ActionButton>
      </div>
    </SplashScreen>
  );
}
