import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogPortal,
  DialogBody,
} from "@/src/components/ui/dialog";
import { useState } from "react";
import Link from "next/link";
import { Bug, Sparkles } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

interface FeedbackDialogProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function FeedbackButtonWrapper({
  className,
  children,
  description,
  title,
}: FeedbackDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={className}
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title ?? t("feedback.provideFeedback")}</DialogTitle>
            <DialogDescription>
              {description ?? t("feedback.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Link href="https://langfuse.com/ideas" target="_blank">
                <Button variant="secondary">
                  <Sparkles className="mr-2 h-4 w-4" />{" "}
                  {t("feedback.submitFeatureRequest")}
                </Button>
              </Link>
              <Link href="https://langfuse.com/issues" target="_blank">
                <Button variant="secondary">
                  <Bug className="mr-2 h-4 w-4" /> {t("feedback.reportBug")}
                </Button>
              </Link>
            </div>
          </DialogBody>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
