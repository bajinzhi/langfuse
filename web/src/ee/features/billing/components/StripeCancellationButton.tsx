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
import { useBillingInformation } from "./useBillingInformation";
import { api } from "@/src/utils/api";
import { useState } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useI18n } from "@/src/features/i18n";

export const StripeCancellationButton = ({
  orgId,
  variant,
  className,
}: {
  orgId: string | undefined;
  variant: "secondary" | "default";
  className?: string;
}) => {
  const { t } = useI18n();
  const { cancellation } = useBillingInformation();
  const [loading, setLoading] = useState(false);
  const [_opId, setOpId] = useState<string | null>(null);

  const cancelMutation = api.cloudBilling.cancelStripeSubscription.useMutation({
    onSuccess: () => {
      toast.success(t("billing.subscriptionCancelScheduled"));
      setLoading(false);
      setOpId(null);
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      setLoading(false);
      setOpId(null);
      toast.error(t("billing.subscriptionCancelFailed"));
    },
  });

  const reactivateMutation =
    api.cloudBilling.reactivateStripeSubscription.useMutation({
      onSuccess: () => {
        toast.success(t("billing.subscriptionReactivated"));
        setLoading(false);
        setOpId(null);
        setTimeout(() => window.location.reload(), 500);
      },
      onError: () => {
        setLoading(false);
        setOpId(null);
        toast.error(t("billing.subscriptionReactivateFailed"));
      },
    });

  if (!orgId) return null;

  const onReactivate = async () => {
    try {
      setLoading(true);
      // idempotency key for mutation operations with the stripe api
      let opId = _opId;
      if (!opId) {
        opId = nanoid();
        setOpId(opId);
      }
      await reactivateMutation.mutateAsync({ orgId, opId });
    } catch (_e) {
      toast.error(t("billing.subscriptionReactivateFailed"));
    }
  };

  const onCancel = async () => {
    try {
      setLoading(true);
      // idempotency key for mutation operations with the stripe api
      let opId = _opId;
      if (!opId) {
        opId = nanoid();
        setOpId(opId);
      }
      await cancelMutation.mutateAsync({ orgId, opId });
    } catch (_e) {
      toast.error(t("billing.subscriptionCancelFailed"));
    }
  };

  // Reactivate with confirm dialog
  if (cancellation?.isCancelled) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            disabled={loading}
            title={t("billing.reactivateSubscription")}
            className={className}
          >
            {loading ? t("billing.working") : t("billing.reactivateSubscription")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg">
              {t("billing.confirmReactivationTitle")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="text-sm">
            <p>{t("billing.reactivationDescriptionP1")}</p>
            <p>{t("billing.reactivationDescriptionP2")}</p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("common.cancel")}</Button>
            </DialogClose>
            <Button variant="default" onClick={onReactivate} disabled={loading}>
              {loading
                ? t("billing.reactivating")
                : t("billing.confirmReactivation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Cancel with confirm dialog
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          disabled={loading}
          title={t("billing.cancelSubscription")}
        >
          {t("billing.cancelSubscription")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t("billing.confirmCancellation")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="text-sm">
          <p>{t("billing.cancellationDescriptionP1")}</p>
          <p>{t("billing.cancellationDescriptionP2")}</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t("billing.keepSubscription")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onCancel} disabled={loading}>
            {loading
              ? t("billing.cancelling")
              : t("billing.confirmCancellation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
