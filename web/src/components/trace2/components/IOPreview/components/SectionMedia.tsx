import { LangfuseMediaView } from "@/src/components/ui/LangfuseMediaView";
import { type MediaReturnType } from "@/src/features/media/validation";
import { useI18n } from "@/src/features/i18n";

// SectionMedia props
export interface SectionMediaProps {
  media: MediaReturnType[];
}

/**
 * SectionMedia renders media attachments at the bottom of the message list.
 */
export function SectionMedia({ media }: SectionMediaProps) {
  const { t } = useI18n();
  if (media.length === 0) {
    return null;
  }

  return (
    <>
      <div className="text-muted-foreground my-1 px-2 py-1 text-xs">
        {t("trace.media")}
      </div>
      <div className="flex flex-wrap gap-2 p-4 pt-1">
        {media.map((m) => (
          <LangfuseMediaView
            mediaAPIReturnValue={m}
            asFileIcon={!m.contentType.startsWith("image")}
            key={m.mediaId}
          />
        ))}
      </div>
    </>
  );
}
