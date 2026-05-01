import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { IntroSection } from "@/src/features/support-chat/IntroSection";
import { useI18n } from "@/src/features/i18n";

export function SuccessSection({ onAnother }: { onAnother: () => void }) {
  const { t } = useI18n();

  return (
    <div className="mt-1 flex flex-col gap-6">
      {/* Success card */}
      <div className="rounded-md border p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <div className="space-y-0.5">
            <div className="text-sm font-medium">
              {t("support.success.title")}
            </div>
            <div className="text-muted-foreground text-sm">
              {t("support.success.description")}
            </div>
          </div>
        </div>

        {/* Primary actions */}
        <div className="mt-4 flex flex-wrap items-center justify-start gap-2 pl-7">
          <Button variant="outline" size="sm" onClick={onAnother}>
            {t("support.success.another")}
          </Button>
        </div>
      </div>

      <Separator />

      <IntroSection onStartForm={() => onAnother()} />
    </div>
  );
}
