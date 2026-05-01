import { ErrorPageWithSentry } from "@/src/components/error-page";
import { useI18n } from "@/src/features/i18n";
import { useRouter } from "next/router";

export default function AuthError() {
  const router = useRouter();
  const { t } = useI18n();
  const { error } = router.query;
  const errorMessage = error
    ? decodeURIComponent(String(error))
    : t("auth.error.default");

  return (
    <ErrorPageWithSentry title={t("auth.error.title")} message={errorMessage} />
  );
}
