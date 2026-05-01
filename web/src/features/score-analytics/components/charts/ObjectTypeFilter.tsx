import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { type ObjectType } from "@/src/features/score-analytics/lib/analytics-url-state";
import { useI18n, type MessageKey } from "@/src/features/i18n";

const OBJECT_TYPE_OPTIONS: Array<{ value: ObjectType; labelKey: MessageKey }> =
  [
    { value: "all", labelKey: "scoreAnalytics.objectType.all" },
    { value: "trace", labelKey: "scoreAnalytics.objectType.traces" },
    { value: "session", labelKey: "scoreAnalytics.objectType.sessions" },
    {
      value: "observation",
      labelKey: "scoreAnalytics.objectType.observations",
    },
    { value: "dataset_run", labelKey: "scoreAnalytics.objectType.datasetRuns" },
];

interface ObjectTypeFilterProps {
  value: ObjectType;
  onChange: (value: ObjectType) => void;
  className?: string;
}

export function ObjectTypeFilter({
  value,
  onChange,
  className,
}: ObjectTypeFilterProps) {
  const { t } = useI18n();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={t("scoreAnalytics.objectType")}>
        <SelectValue placeholder={t("scoreAnalytics.objectType")} />
      </SelectTrigger>
      <SelectContent>
        {OBJECT_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
