import { useQueryProject } from "@/src/features/projects/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useI18n } from "@/src/features/i18n";

export default function ProjectBillingRedirect() {
  const router = useRouter();
  const { t } = useI18n();

  const { organization } = useQueryProject();

  useEffect(() => {
    if (organization) {
      router.replace(`/organization/${organization.id}/settings/billing`);
    }
  }, [organization, router]);

  return t("common.redirecting");
}
