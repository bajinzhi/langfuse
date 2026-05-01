import React from "react";
import { SplashScreen } from "@/src/components/ui/splash-screen";
import { ActionButton } from "@/src/components/ActionButton";
import { useI18n } from "@/src/features/i18n";

export function SessionsOnboarding() {
  const { t } = useI18n();

  return (
    <SplashScreen
      title={t("observability.sessions.onboarding.title")}
      description={t("observability.sessions.onboarding.description")}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/sessions-overview-v1.mp4"
    >
      <div className="mt-8">
        <h3 className="mb-4 text-2xl font-semibold">
          {t("observability.sessions.onboarding.start")}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {t("observability.sessions.onboarding.instructions")}
        </p>
        <ActionButton
          href="https://langfuse.com/docs/observability/features/sessions"
          variant="default"
        >
          {t("observability.onboarding.docs")}
        </ActionButton>
      </div>
    </SplashScreen>
  );
}
