import React from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { type Prompt } from "@langfuse/shared";
import { type NewPromptFormSchemaType } from "./validation";
import DiffViewer from "@/src/components/DiffViewer";
import { useI18n } from "@/src/features/i18n";

type ReviewPromptDialogProps = {
  initialPrompt: Prompt;
  isLoading: boolean;
  children: React.ReactNode;
  onConfirm: () => void;
  getNewPromptValues: () => NewPromptFormSchemaType;
};

const formatMessages = (messages: any[], excludeKeys: string[] = []) => {
  return JSON.stringify(
    messages.map((m) =>
      Object.fromEntries(
        Object.entries(m)
          .filter(
            ([k]) =>
              !excludeKeys.includes(k) &&
              (k !== "type" || m.type === "placeholder"),
          )
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    ),
    null,
    2,
  );
};

export const ReviewPromptDialog: React.FC<ReviewPromptDialogProps> = (
  props,
) => {
  const { t } = useI18n();
  const { initialPrompt, children, getNewPromptValues, onConfirm, isLoading } =
    props;
  const [newPromptValue, setNewPromptValues] =
    React.useState<NewPromptFormSchemaType | null>(null);
  const [open, setOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      setNewPromptValues(getNewPromptValues());
    }
  }, [open, setNewPromptValues, getNewPromptValues]);

  const initialPromptContent =
    initialPrompt.type === "text"
      ? (initialPrompt.prompt as string)
      : formatMessages(initialPrompt.prompt as any[]);

  const newPromptContent =
    initialPrompt.type === "text"
      ? (newPromptValue?.textPrompt ?? "")
      : formatMessages(newPromptValue?.chatPrompt ?? [], ["id"]);

  const newConfig = JSON.stringify(
    JSON.parse(newPromptValue?.config ?? "{}"),
    null,
    2,
  );

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("prompts.review.title")}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="font-medium">{initialPrompt.name}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="max-h-[80vh] max-w-(--breakpoint-xl) space-y-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-base font-medium">
                    {t("prompts.content")}
                  </h3>
                  <DiffViewer
                    oldString={initialPromptContent}
                    newString={newPromptContent}
                    oldLabel={t("prompts.review.previousContent", {
                      version: initialPrompt.version,
                    })}
                    newLabel={t("prompts.review.newContent")}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-medium">
                    {t("prompts.config")}
                  </h3>
                  <DiffViewer
                    oldString={JSON.stringify(initialPrompt.config, null, 2)}
                    newString={newConfig ?? "failed"}
                    oldLabel={t("prompts.review.previousConfig", {
                      version: initialPrompt.version,
                    })}
                    newLabel={t("prompts.review.newConfig")}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            className="min-w-32"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            loading={isLoading}
            variant={newPromptValue?.isActive ? "destructive" : "default"}
            className="min-w-32"
          >
            {newPromptValue?.isActive
              ? t("prompts.review.saveAndPromote")
              : t("prompts.review.saveNewVersion")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
