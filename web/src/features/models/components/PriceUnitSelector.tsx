import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { PriceUnit } from "@/src/features/models/validation";
import { usePriceUnitMultiplier } from "@/src/features/models/hooks/usePriceUnitMultiplier";
import { useI18n } from "@/src/features/i18n";

export function getPriceUnitLabel(
  priceUnit: PriceUnit,
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (priceUnit) {
    case PriceUnit.Per1KUnits:
      return t("models.price.unit.per1K");
    case PriceUnit.Per1MUnits:
      return t("models.price.unit.per1M");
    case PriceUnit.PerUnit:
    default:
      return t("models.price.unit.perUnit");
  }
}

export const PriceUnitSelector = () => {
  const { t } = useI18n();
  const { priceUnit, setPriceUnit } = usePriceUnitMultiplier();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Select
          value={priceUnit}
          onValueChange={(value: PriceUnit) => setPriceUnit(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("models.price.selectUnit")} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(PriceUnit).map((unit) => (
              <SelectItem key={unit} value={unit}>
                {getPriceUnitLabel(unit, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
};
