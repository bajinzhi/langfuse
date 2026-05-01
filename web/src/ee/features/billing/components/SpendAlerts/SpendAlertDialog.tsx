import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/utils/api";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

const createSpendAlertSchema = (t: Translate) =>
  z.object({
  title: z
    .string()
    .min(1, t("spendAlerts.validation.titleRequired"))
    .max(100, t("spendAlerts.validation.titleMax")),
  limit: z.coerce
    .number()
    .positive(t("spendAlerts.validation.limitPositive"))
    .max(1000000, t("spendAlerts.validation.limitMax")),
  });

type SpendAlertSchema = ReturnType<typeof createSpendAlertSchema>;
type SpendAlertFormInput = z.input<SpendAlertSchema>;
type SpendAlertFormOutput = z.output<SpendAlertSchema>;

interface SpendAlertDialogProps {
  orgId: string;
  alert?: {
    id: string;
    title: string;
    threshold: { toString(): string };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SpendAlertDialog({
  orgId,
  alert,
  open,
  onOpenChange,
  onSuccess,
}: SpendAlertDialogProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const capture = usePostHogClientCapture();
  const spendAlertSchema = useMemo(() => createSpendAlertSchema(t), [t]);

  const form = useForm<SpendAlertFormInput, undefined, SpendAlertFormOutput>({
    resolver: zodResolver(spendAlertSchema),
    defaultValues: {
      title: alert?.title ?? "",
      limit: alert ? parseFloat(alert.threshold.toString()) : undefined,
    },
  });

  const createMutation = api.spendAlerts.createSpendAlert.useMutation();
  const updateMutation = api.spendAlerts.updateSpendAlert.useMutation();

  const onSubmit = async (data: SpendAlertFormOutput) => {
    setIsSubmitting(true);
    try {
      if (alert) {
        // Update existing alert
        await updateMutation.mutateAsync({
          orgId,
          id: alert.id,
          title: data.title,
          threshold: data.limit,
        });
        capture("spend_alert:updated", {
          orgId,
          alertId: alert.id,
          limit: data.limit,
        });
        toast.success(t("spendAlerts.updatedSuccessfully"));
      } else {
        // Create new alert
        await createMutation.mutateAsync({
          orgId,
          title: data.title,
          threshold: data.limit,
        });
        capture("spend_alert:created", {
          orgId,
          limit: data.limit,
        });
        toast.success(t("spendAlerts.createdSuccessfully"));
      }
      onSuccess();
    } catch (error) {
      console.error(t("spendAlerts.saveConsoleError"), error);
      toast.error(
        alert
          ? t("spendAlerts.updateFailed")
          : t("spendAlerts.createFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4 sm:max-w-[425px]">
        <DialogTitle>
          {alert ? t("spendAlerts.editTitle") : t("spendAlerts.createTitle")}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground pt-1 pb-2 text-sm">
          {t("spendAlerts.dialogDescription")}
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("spendAlerts.alertTitle")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("spendAlerts.alertTitlePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("spendAlerts.limitUsd")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max="1000000"
                      placeholder="100.00"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={field.onChange}
                      value={
                        typeof field.value === "number" ||
                        typeof field.value === "string"
                          ? field.value
                          : ""
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-muted-foreground text-xs">
              <div className="flex flex-row items-center">
                <Info className="mr-2 h-3 w-3" />
                <span className="font-medium">
                  {t("spendAlerts.howItWorks")}
                </span>
              </div>
              <ul className="list-disc pl-5">
                <li>{t("spendAlerts.howItWorksLimit")}</li>
                <li>{t("spendAlerts.howItWorksCycle")}</li>
                <li>{t("spendAlerts.howItWorksEmail")}</li>
                <li>{t("spendAlerts.howItWorksDelay")}</li>
              </ul>
            </div>
            <div className="flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? alert
                    ? t("spendAlerts.updating")
                    : t("spendAlerts.creating")
                  : alert
                    ? t("spendAlerts.updateAlert")
                    : t("spendAlerts.createAlert")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
