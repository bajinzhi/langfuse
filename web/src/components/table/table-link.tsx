import { cn } from "@/src/utils/tailwind";
import Link from "next/link";

export type TableLinkProps = {
  path: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  title?: string;
};

export default function TableLink({
  path,
  value,
  icon,
  className,
  onClick,
  title,
}: TableLinkProps) {
  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.preventDefault();
      onClick(event);
    }
  };

  return (
    <Link
      // No explicit font-size here — the link inherits the table body's
      // font size (13px in our DataTable) so cell text and link text line
      // up. Callers can still override via `className` if needed.
      className={cn(
        "text-accent-dark-blue hover:text-primary-accent inline-block max-w-full font-semibold",
        className,
        icon && "max-h-4",
      )}
      href={path}
      title={title || value}
      prefetch={false}
      onClick={handleClick}
    >
      <span className="inline-block max-w-full overflow-hidden text-nowrap text-ellipsis">
        {icon ? <span className="inline-block">{icon}</span> : value}
      </span>
    </Link>
  );
}
