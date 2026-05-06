import { cn } from "@/src/utils/tailwind";

export default function TableIdOrName({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div
      title={value}
      // Inherits the table body font size (13px in DataTable) so id pills
      // align with the rest of the row text.
      className={cn(
        "inline-block max-w-full overflow-hidden rounded py-0.5 font-semibold text-nowrap text-ellipsis",
        className,
      )}
    >
      {value}
    </div>
  );
}
