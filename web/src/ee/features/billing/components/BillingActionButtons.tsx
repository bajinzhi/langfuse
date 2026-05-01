// Langfuse Cloud only
import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import Link from "next/link";

import { useSupportDrawer } from "@/src/features/support-chat/SupportDrawerProvider";
import { StripeCustomerPortalButton } from "./StripeCustomerPortalButton";
import { BillingSwitchPlanDialog } from "./BillingSwitchPlanDialog";
import { useBillingInformation } from "./useBillingInformation";
import { StripeCancellationButton } from "./StripeCancellationButton";
import { useI18n } from "@/src/features/i18n";

export const BillingActionButtons = () => {
  const { t } = useI18n();
  const { organization, hasValidPaymentMethod, isLoading } =
    useBillingInformation();
  const { setOpen } = useSupportDrawer();

  // Show pricing page button
  const shouldDisableChangePlan = useMemo(() => {
    if (!organization?.cloudConfig?.stripe?.activeSubscriptionId) {
      return false; // always show for hobby plan users
    }
    return !hasValidPaymentMethod;
  }, [
    organization?.cloudConfig?.stripe?.activeSubscriptionId,
    hasValidPaymentMethod,
  ]);

  // Do not show checkout or customer portal if manual plan is set in cloud config
  if (organization?.cloudConfig?.plan) {
    return (
      <div className="mt-4 flex flex-row items-center gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("billing.changePlanViaSupport")}
        </Button>
        <Button variant="secondary" asChild>
          <Link href={"https://langfuse.com/pricing"} target="_blank">
            {t("billing.comparePlans")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex flex-row items-center gap-2">
        {/* Always show – also for people who are currently on hobby plan */}
        <BillingSwitchPlanDialog disabled={shouldDisableChangePlan} />

        {organization?.cloudConfig?.stripe?.activeSubscriptionId && (
          <>
            <StripeCustomerPortalButton
              orgId={organization.id}
              title={t("billing.updateBillingDetails")}
              variant="secondary"
            />
            <StripeCancellationButton
              orgId={organization.id}
              variant="secondary"
            />
          </>
        )}
        <Button variant="secondary" asChild>
          <Link href={"https://langfuse.com/pricing"} target="_blank">
            {t("billing.comparePlans")}
          </Link>
        </Button>
      </div>
      {organization?.cloudConfig?.stripe?.activeSubscriptionId &&
        !hasValidPaymentMethod &&
        !isLoading && (
          <p className="text-sm text-red-600">
            {t("billing.invalidPaymentMethod")}
          </p>
        )}
    </div>
  );
};
