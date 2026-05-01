import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { Info } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

export function ExperimentsBetaSwitch({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex items-center gap-1">
        <Label htmlFor="experiments-beta-toggle">
          {t("experiments.beta.title")}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="text-muted-foreground h-3.5 w-3.5 cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                {t("experiments.beta.description")}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch
        id="experiments-beta-toggle"
        checked={enabled}
        onCheckedChange={onEnabledChange}
      />
    </div>
  );
}
