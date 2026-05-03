import { env } from "@/src/env.mjs";
import { type MessageKey, useI18n } from "@/src/features/i18n";

export const CloudPrivacyNotice = ({
  actionKey,
}: {
  actionKey: MessageKey;
}) => {
  const { t } = useI18n();

  return env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION !== undefined ? (
    <div className="text-muted-foreground mx-auto mt-10 max-w-lg text-center text-xs">
      {t("auth.cloudPrivacy.prefix", { action: t(actionKey) })}{" "}
      <a
        href="https://langfuse.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="italic"
      >
        {t("auth.cloudPrivacy.terms")}
      </a>
      {t("auth.cloudPrivacy.separator")}{" "}
      <a
        href="https://langfuse.com/privacy"
        rel="noopener noreferrer"
        className="italic"
      >
        {t("auth.cloudPrivacy.privacy")}
      </a>
      {t("auth.cloudPrivacy.and")}{" "}
      <a
        href="https://langfuse.com/cookie-policy"
        rel="noopener noreferrer"
        className="italic"
      >
        {t("auth.cloudPrivacy.cookies")}
      </a>
      {t("auth.cloudPrivacy.suffix")}
    </div>
  ) : null;
};
