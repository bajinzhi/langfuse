import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import type { SourceField } from "../types";
import { useI18n } from "@/src/features/i18n";

type SourceFieldSelectorProps = {
  value: SourceField;
  onChange: (field: SourceField) => void;
  disabled?: boolean;
};

export function SourceFieldSelector({
  value,
  onChange,
  disabled = false,
}: SourceFieldSelectorProps) {
  const { t } = useI18n();

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SourceField)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="input">{t("datasets.input")}</SelectItem>
        <SelectItem value="output">{t("datasets.output")}</SelectItem>
        <SelectItem value="metadata">{t("datasets.metadata")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
