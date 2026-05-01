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
import { Input } from "@/src/components/ui/input";
import { api } from "@/src/utils/api";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useI18n } from "@/src/features/i18n";

export const BillingDiscountCodeButton = ({
  orgId,
}: {
  orgId: string | undefined;
}) => {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [opId, setOpId] = useState<string | null>(null);

  const utils = api.useUtils();

  const mutation = api.cloudBilling.applyPromotionCode.useMutation({
    onSuccess: async () => {
      toast.success(t("billing.promotionCodeApplied"));
      setProcessing(false);
      setOpen(false);
      setCode("");
      setOpId(null);
      await Promise.all([
        utils.cloudBilling.getSubscriptionInfo.invalidate(),
        utils.cloudBilling.getInvoices.invalidate(),
      ]);
    },
    onError: (err) => {
      setProcessing(false);
      toast.error(err.message || t("billing.promotionCodeApplyFailed"));
    },
  });

  if (!orgId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t("billing.addPromotionCode")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t("billing.addPromotionCode")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3 text-sm">
          <p>{t("billing.promotionCodeDescription")}</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PROMO2025"
            disabled={processing}
          />
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={processing}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="default"
            disabled={processing || !code.trim()}
            onClick={() => {
              setProcessing(true);
              let id = opId;
              if (!id) {
                id = nanoid();
                setOpId(id);
              }
              mutation.mutate({ orgId, code: code.trim(), opId: id });
            }}
          >
            {processing ? t("billing.applying") : t("billing.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
