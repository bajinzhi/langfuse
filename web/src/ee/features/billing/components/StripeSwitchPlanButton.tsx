import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { ActionButton } from "@/src/components/ActionButton";
import { planLabels } from "@langfuse/shared";
import { api } from "@/src/utils/api";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useI18n } from "@/src/features/i18n";

export const StripeSwitchPlanButton = ({
  className,
  orgId,
  currentPlan,
  newPlanTitle,
  isLegacySubscription,
  isUpgrade,
  stripeProductId,
  onProcessing,
  processing,
}: {
  orgId: string | undefined;
  currentPlan: keyof typeof planLabels | undefined;
  newPlanTitle: string | undefined;
  isLegacySubscription: boolean;
  isUpgrade: boolean;
  stripeProductId: string;
  onProcessing: (id: string | null) => void;
  processing: boolean;
  className?: string;
}) => {
  const { t } = useI18n();
  const [_opId, setOpId] = useState<string | null>(null);

  const mutChangePlan =
    api.cloudBilling.changeStripeSubscriptionProduct.useMutation({
      onSuccess: () => {
        toast.success(t("billing.planChangedSuccessfully"));
        onProcessing(null);
        setOpId(null);
        setTimeout(() => window.location.reload(), 500);
      },
      onError: () => {
        onProcessing(null);
        setOpId(null);
        toast.error(t("billing.planChangeFailed"));
      },
    });

  if (!orgId) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">{t("billing.changePlan")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t("billing.confirmPlanChangeTitle", {
              currentPlan: planLabels[currentPlan ?? "cloud:hobby"],
              newPlan: newPlanTitle ?? "",
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="text-sm">
          {isLegacySubscription ? (
            <>
              <p>
                {t("billing.legacyPlanChangeP1")}
              </p>
              <p>
                {t("billing.legacyPlanChangeP2")}
              </p>
              <p>
                {t("billing.legacyPlanChangeP3")}
              </p>
            </>
          ) : isUpgrade ? (
            <>
              <p>
                {t("billing.upgradePlanChangeP1")}
              </p>
              <p>
                {t("billing.upgradePlanChangeP2")}
              </p>
              <p>
                {t("billing.upgradePlanChangeP3")}
              </p>
            </>
          ) : (
            <>
              <p>
                {t("billing.downgradePlanChangeP1")}
              </p>
              <p>
                {t("billing.downgradePlanChangeP2")}
              </p>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t("common.cancel")}</Button>
          </DialogClose>
          <ActionButton
            onClick={() => {
              onProcessing(stripeProductId);
              // idempotency key for mutation operations with the stripe api
              let opId = _opId;
              if (!opId) {
                opId = nanoid();
                setOpId(opId);
              }
              mutChangePlan.mutate({ orgId, stripeProductId, opId });
            }}
            loading={processing}
            className={className}
          >
            {t("common.confirm")}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
