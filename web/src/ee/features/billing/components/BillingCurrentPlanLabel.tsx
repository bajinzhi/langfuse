// Langfuse Cloud only

import { LocalIsoDate } from "@/src/components/LocalIsoDate";

import { useBillingInformation } from "@/src/ee/features/billing/components/useBillingInformation";
import { useI18n } from "@/src/features/i18n";

export const BillingCurrentPlanLabel = () => {
  const { t } = useI18n();
  const { planLabel, cancellation } = useBillingInformation();

  return (
    <div>
      <>{t("billing.currentPlanWithValue", { plan: planLabel })} </>
      {cancellation?.isCancelled && cancellation.date && (
        <>
          <span>{t("billing.willEndOnPrefix")}</span>
          <LocalIsoDate date={cancellation.date} accuracy="day" />
          <span>{t("billing.willEndOnSuffix")}</span>
        </>
      )}
    </div>
  );
};
