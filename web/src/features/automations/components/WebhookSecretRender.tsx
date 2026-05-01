import React from "react";
import { CodeView } from "@/src/components/ui/CodeJsonViewer";
import { useI18n } from "@/src/features/i18n";

export const WebhookSecretRender = ({
  webhookSecret,
}: {
  webhookSecret: string;
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="mb-4">
        <div className="text-md font-semibold">
          {t("automations.webhook.secret")}
        </div>
        <div className="my-2 text-sm">
          {t("automations.webhook.secretDescription")}
        </div>
        <CodeView content={webhookSecret} defaultCollapsed={false} />
      </div>
    </>
  );
};
