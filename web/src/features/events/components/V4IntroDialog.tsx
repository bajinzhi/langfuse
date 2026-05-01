import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { useI18n } from "@/src/features/i18n";

export function V4IntroDialog({
  open,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent
        className="[&>div:last-child]:hidden"
        aria-label={t("events.v4.intro.title")}
      >
        <DialogBody>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/v4-beta-intro.jpg"
            alt={t("events.v4.intro.imageAlt")}
            className="w-full rounded-md"
          />
          <ul className="flex flex-col gap-3">
            <li className="text-muted-foreground text-sm">
              <span className="text-foreground block font-medium">
                {t("events.v4.intro.title")}
              </span>{" "}
              {t("events.v4.intro.description")}
            </li>
            <li className="text-muted-foreground text-sm">
              <span className="text-foreground block font-medium">
                {t("events.v4.intro.observationsTitle")}
              </span>{" "}
              {t("events.v4.intro.observationsDescription")}{" "}
              <span className="font-medium">
                {t("events.v4.intro.rootObservationFilter")}
              </span>
              {t("events.v4.intro.sentenceEnd")}
            </li>
            <li className="text-muted-foreground text-sm">
              <span className="text-foreground block font-medium">
                {t("events.v4.intro.savedViewsTitle")}
              </span>{" "}
              {t("events.v4.intro.savedViewsDescription")}{" "}
              <a
                href="https://langfuse.com/faq/all/explore-observations-in-v4"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                {t("events.v4.intro.bestPractices")}
              </a>
            </li>
          </ul>
          <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-700 dark:bg-yellow-950">
            <p className="text-yellow-900 dark:text-yellow-200">
              <span className="font-medium">
                {t("events.v4.intro.liveTracesTitle")}
              </span>{" "}
              {t("events.v4.intro.liveTracesDescription")}{" "}
              <a
                href="https://langfuse.com/docs/observability/sdk/upgrade-path"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:no-underline"
              >
                {t("events.v4.intro.upgradeGuide")}
              </a>
            </p>
          </div>
        </DialogBody>
        <DialogFooter className="items-center sm:justify-between">
          <a
            href="https://langfuse.com/docs/v4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm font-medium hover:underline"
          >
            {t("events.v4.intro.readDocs")}
          </a>
          <Button onClick={onConfirm}>{t("events.v4.intro.understood")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
