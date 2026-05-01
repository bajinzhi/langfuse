import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  InputCommand,
  InputCommandEmpty,
  InputCommandGroup,
  InputCommandInput,
  InputCommandItem,
  InputCommandList,
} from "@/src/components/ui/input-command";
import { MultiSelect } from "@/src/features/filters/components/multi-select";
import { Plus, X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/src/utils/tailwind";
import type {
  KeyValueFilterEntry,
  NumericKeyValueFilterEntry,
  StringKeyValueFilterEntry,
} from "@/src/features/filters/hooks/useSidebarFilterState";
import { useI18n, type MessageKey } from "@/src/features/i18n";

type KeyValueFilterBuilderProps =
  | {
      mode: "categorical";
      keyOptions?: string[];
      availableValues: Record<string, string[]>;
      activeFilters: KeyValueFilterEntry[];
      onChange: (filters: KeyValueFilterEntry[]) => void;
      keyPlaceholder?: string;
    }
  | {
      mode: "numeric";
      keyOptions?: string[];
      activeFilters: NumericKeyValueFilterEntry[];
      onChange: (filters: NumericKeyValueFilterEntry[]) => void;
      keyPlaceholder?: string;
    }
  | {
      mode: "string";
      keyOptions?: string[];
      activeFilters: StringKeyValueFilterEntry[];
      onChange: (filters: StringKeyValueFilterEntry[]) => void;
      keyPlaceholder?: string;
    };

const NUMERIC_OPERATOR_MESSAGE_KEYS = {
  "=": "table.filters.equals",
  ">": "table.filters.greaterThan",
  "<": "table.filters.lessThan",
  ">=": "table.filters.greaterThanOrEquals",
  "<=": "table.filters.lessThanOrEquals",
} satisfies Record<string, MessageKey>;

const STRING_OPERATOR_MESSAGE_KEYS = {
  "=": "table.filters.equals",
  contains: "table.filters.contains",
  "does not contain": "table.filters.doesNotContain",
} satisfies Record<string, MessageKey>;

export function KeyValueFilterBuilder(props: KeyValueFilterBuilderProps) {
  const { mode, keyOptions, activeFilters, onChange, keyPlaceholder } = props;
  const { t } = useI18n();
  const keyPlaceholderLabel = keyPlaceholder ?? t("table.filters.key");
  const availableValues = mode === "categorical" ? props.availableValues : {};

  // Track which popover is open (by index)
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);

  // Local UI state for filter rows (includes incomplete filters)
  // Initialize once from activeFilters but don't sync on every change
  // This allows incomplete filter rows to persist in the UI while being edited
  const [localFilters, setLocalFilters] = useState<
    | KeyValueFilterEntry[]
    | NumericKeyValueFilterEntry[]
    | StringKeyValueFilterEntry[]
  >(() => (activeFilters.length > 0 ? activeFilters : []));

  const handleFilterChange = (
    index: number,
    updates:
      | Partial<KeyValueFilterEntry>
      | Partial<NumericKeyValueFilterEntry>
      | Partial<StringKeyValueFilterEntry>,
  ) => {
    // TypeScript can't narrow the union array type automatically, so we narrow explicitly based on mode
    if (mode === "categorical") {
      const filters = localFilters as KeyValueFilterEntry[];
      const newFilters = [...filters];
      newFilters[index] = {
        ...newFilters[index],
        ...updates,
      } as KeyValueFilterEntry;
      setLocalFilters(newFilters);
      (onChange as (filters: KeyValueFilterEntry[]) => void)(newFilters);
    } else if (mode === "numeric") {
      const filters = localFilters as NumericKeyValueFilterEntry[];
      const newFilters = [...filters];
      newFilters[index] = {
        ...newFilters[index],
        ...updates,
      } as NumericKeyValueFilterEntry;
      setLocalFilters(newFilters);
      (onChange as (filters: NumericKeyValueFilterEntry[]) => void)(newFilters);
    } else {
      const filters = localFilters as StringKeyValueFilterEntry[];
      const newFilters = [...filters];
      newFilters[index] = {
        ...newFilters[index],
        ...updates,
      } as StringKeyValueFilterEntry;
      setLocalFilters(newFilters);
      (onChange as (filters: StringKeyValueFilterEntry[]) => void)(newFilters);
    }
  };

  const handleAddFilter = () => {
    if (mode === "categorical") {
      const newFilter: KeyValueFilterEntry = {
        key: "",
        operator: "any of" as const,
        value: [],
      };
      const filters = localFilters as KeyValueFilterEntry[];
      const newFilters = [...filters, newFilter];
      setLocalFilters(newFilters);
    } else if (mode === "numeric") {
      const newFilter: NumericKeyValueFilterEntry = {
        key: "",
        operator: "=" as const,
        value: "",
      };
      const filters = localFilters as NumericKeyValueFilterEntry[];
      const newFilters = [...filters, newFilter];
      setLocalFilters(newFilters);
    } else {
      const newFilter: StringKeyValueFilterEntry = {
        key: "",
        operator: "=" as const,
        value: "",
      };
      const filters = localFilters as StringKeyValueFilterEntry[];
      const newFilters = [...filters, newFilter];
      setLocalFilters(newFilters);
    }
  };

  const handleRemoveFilter = (index: number) => {
    if (mode === "categorical") {
      const filters = localFilters as KeyValueFilterEntry[];
      const newFilters = filters.filter((_, i) => i !== index);
      setLocalFilters(newFilters);
      (onChange as (filters: KeyValueFilterEntry[]) => void)(newFilters);
    } else if (mode === "numeric") {
      const filters = localFilters as NumericKeyValueFilterEntry[];
      const newFilters = filters.filter((_, i) => i !== index);
      setLocalFilters(newFilters);
      (onChange as (filters: NumericKeyValueFilterEntry[]) => void)(newFilters);
    } else {
      const filters = localFilters as StringKeyValueFilterEntry[];
      const newFilters = filters.filter((_, i) => i !== index);
      setLocalFilters(newFilters);
      (onChange as (filters: StringKeyValueFilterEntry[]) => void)(newFilters);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-1">
      {/* Filter rows */}
      {localFilters.map((filter, index) => {
        const availableValuesForKey = filter.key
          ? (availableValues[filter.key] ?? [])
          : [];

        return (
          <div
            key={index}
            className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0"
          >
            {/* Key input and delete button row */}
            <div className="flex items-center gap-2">
              {keyOptions ? (
                // Combobox for known keys
                <Popover
                  open={openPopoverIndex === index}
                  onOpenChange={(open) =>
                    setOpenPopoverIndex(open ? index : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between text-left font-normal"
                    >
                      <span
                        className={cn(!filter.key && "text-muted-foreground")}
                      >
                        {filter.key || keyPlaceholderLabel}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <InputCommand>
                      <InputCommandInput
                        placeholder={t("table.filters.searchKeys")}
                        variant="bottom"
                      />
                      <InputCommandList>
                        <InputCommandEmpty>
                          {t("table.filters.noKeys")}
                        </InputCommandEmpty>
                        <InputCommandGroup>
                          {keyOptions.map((option) => (
                            <InputCommandItem
                              key={option}
                              value={option}
                              onSelect={(value) => {
                                // Only update the key, preserve the existing value
                                handleFilterChange(index, {
                                  key: value,
                                });
                                setOpenPopoverIndex(null); // Close after selection
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  option === filter.key
                                    ? "visible"
                                    : "invisible",
                                )}
                              />
                              {option}
                            </InputCommandItem>
                          ))}
                        </InputCommandGroup>
                      </InputCommandList>
                    </InputCommand>
                  </PopoverContent>
                </Popover>
              ) : (
                // Text input for free-form keys
                <Input
                  placeholder={keyPlaceholderLabel}
                  value={filter.key}
                  onChange={(e) => {
                    // Only update the key, preserve the existing value
                    handleFilterChange(index, {
                      key: e.target.value,
                    });
                  }}
                  className="flex-1"
                />
              )}

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFilter(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {mode === "categorical" ? (
              <>
                {/* Operator select */}
                <Select
                  value={filter.operator}
                  onValueChange={(value) =>
                    handleFilterChange(index, {
                      operator: value as "any of" | "none of",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any of">
                      {t("table.filters.anyOf")}
                    </SelectItem>
                    <SelectItem value="none of">
                      {t("table.filters.noneOf")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Values multi-select */}
                <MultiSelect
                  title={t("table.filters.values")}
                  options={availableValuesForKey.map((v) => ({ value: v }))}
                  values={filter.value as string[]}
                  onValueChange={(values) =>
                    handleFilterChange(index, { value: values })
                  }
                  disabled={!filter.key}
                />
              </>
            ) : mode === "numeric" ? (
              <>
                {/* Numeric operator select */}
                <Select
                  value={filter.operator}
                  onValueChange={(value) =>
                    handleFilterChange(index, {
                      operator: value as "=" | ">" | "<" | ">=" | "<=",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NUMERIC_OPERATOR_MESSAGE_KEYS).map(
                      ([op, labelKey]) => (
                        <SelectItem key={op} value={op}>
                          {t(labelKey)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {/* Numeric value input */}
                <Input
                  type="number"
                  placeholder={t("table.filters.value")}
                  value={filter.value}
                  onChange={(e) =>
                    handleFilterChange(index, {
                      value:
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                    })
                  }
                  disabled={!filter.key}
                />
              </>
            ) : (
              <>
                {/* String operator select */}
                <Select
                  value={filter.operator}
                  onValueChange={(value) =>
                    handleFilterChange(index, {
                      operator: value as "=" | "contains" | "does not contain",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STRING_OPERATOR_MESSAGE_KEYS).map(
                      ([op, labelKey]) => (
                        <SelectItem key={op} value={op}>
                          {t(labelKey)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {/* String value input */}
                <Input
                  type="text"
                  placeholder={t("table.filters.value")}
                  value={filter.value as string}
                  onChange={(e) =>
                    handleFilterChange(index, {
                      value: e.target.value,
                    })
                  }
                  disabled={!filter.key}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Add filter button */}
      <Button
        onClick={handleAddFilter}
        size="sm"
        variant="outline"
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("table.filters.add")}
      </Button>
    </div>
  );
}
