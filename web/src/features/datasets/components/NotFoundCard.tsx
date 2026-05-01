import { Card } from "@/src/components/ui/card";
import { translateClientMessage } from "@/src/features/i18n";

export const NotFoundCard = ({
  itemType,
  singleLine = false,
}: {
  itemType: "trace" | "observation";
  singleLine?: boolean;
}) => {
  const translatedItemType = translateClientMessage(
    itemType === "trace" ? "datasets.trace" : "datasets.observation",
  );
  const description = translateClientMessage("datasets.notFoundDescription", {
    itemType: translatedItemType,
  });

  if (singleLine) {
    return (
      <Card className="flex h-full w-full items-center justify-start overflow-hidden rounded-sm px-2">
        <p
          className="text-muted-foreground truncate text-xs"
          title={description}
        >
          {description}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-sm p-3">
      <h2 className="mb-1.5 text-sm font-semibold">
        {translateClientMessage("datasets.notFound")}
      </h2>
      <p className="text-muted-foreground max-w-xs text-center text-xs">
        {description}
      </p>
    </Card>
  );
};
