import { Label } from "@/src/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import type { MappingMode } from "../types";
import { useI18n } from "@/src/features/i18n";

type MappingModeSelectorProps = {
  value: MappingMode;
  onChange: (mode: MappingMode) => void;
  fullLabel: string; // e.g., "Full observation input"
  fieldName: string; // e.g., "input", "output", "metadata"
};

export function MappingModeSelector({
  value,
  onChange,
  fullLabel,
  fieldName,
}: MappingModeSelectorProps) {
  const { t } = useI18n();

  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as MappingMode)}>
      <div className="hover:bg-muted/50 flex items-center space-x-3 rounded-md border px-3">
        <RadioGroupItem value="full" id={`${fieldName}-full`} />
        <Label
          htmlFor={`${fieldName}-full`}
          className="flex-1 cursor-pointer py-3 text-sm font-medium"
        >
          {fullLabel}
        </Label>
      </div>
      <div className="hover:bg-muted/50 flex items-center space-x-3 rounded-md border px-3">
        <RadioGroupItem value="custom" id={`${fieldName}-custom`} />
        <Label
          htmlFor={`${fieldName}-custom`}
          className="flex-1 cursor-pointer py-3 text-sm font-medium"
        >
          {t("batchActions.customMapping")}
        </Label>
      </div>
      {fieldName !== "input" && (
        <div className="hover:bg-muted/50 flex items-center space-x-3 rounded-md border px-3">
          <RadioGroupItem
            value="none"
            id={`${fieldName}-none`}
            disabled={fieldName === "input"}
          />
          <Label
            htmlFor={`${fieldName}-none`}
            className="flex-1 cursor-pointer py-3 text-sm font-medium"
          >
            {t("common.none")}
          </Label>
        </div>
      )}
    </RadioGroup>
  );
}
