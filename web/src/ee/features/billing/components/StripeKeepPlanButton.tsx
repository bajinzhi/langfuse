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
import { api } from "@/src/utils/api";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useI18n } from "@/src/features/i18n";

export const StripeKeepPlanButton = ({
  orgId,
  stripeProductId,
  onProcessing,
  processing,
}: {
  orgId: string | undefined;
  stripeProductId: string;
  onProcessing: (id: string | null) => void;
  processing: boolean;
}) => {
  const { t } = useI18n();
  const [_opId, setOpId] = useState<string | null>(null);

  const clearSchedule = api.cloudBilling.clearPlanSwitchSchedule.useMutation({
    onSuccess: () => {
      toast.success(t("billing.keptCurrentPlan"));
      onProcessing(null);
      setOpId(null);
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      onProcessing(null);
      setOpId(null);
      toast.error(t("billing.keepCurrentPlanFailed"));
    },
  });

  if (!orgId) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          {t("billing.keepPlan")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t("billing.confirmKeepPlanTitle")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="text-sm">
          <p>{t("billing.keepPlanDescriptionP1")}</p>
          <p>{t("billing.keepPlanDescriptionP2")}</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t("billing.goBack")}</Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={() => {
              onProcessing(stripeProductId);
              // idempotency key for mutation operations with the stripe api
              let opId = _opId;
              if (!opId) {
                opId = nanoid();
                setOpId(opId);
              }
              clearSchedule.mutate({ orgId, opId });
            }}
            disabled={processing}
          >
            {processing ? t("billing.keeping") : t("billing.confirmKeepPlan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
