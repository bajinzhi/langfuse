import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Label } from "@/src/components/ui/label";
import { api } from "@/src/utils/api";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { copyTextToClipboard } from "@/src/utils/clipboard";
import { useI18n } from "@/src/features/i18n";

type PromptSelectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (tag: string) => void;
  projectId: string;
};

export function PromptSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  projectId,
}: PromptSelectionDialogProps) {
  const { t } = useI18n();
  const [selectedPromptName, setSelectedPromptName] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectionType, setSelectionType] = useState<"version" | "label">(
    "label",
  );
  const [selectedVersionOrLabel, setSelectedVersionOrLabel] =
    useState<string>("");

  const copySelectedTag = useCallback(() => {
    copyTextToClipboard(selectedTag);
  }, [selectedTag]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPromptName("");
      setSelectedTag("");
      setSelectionType("label");
      setSelectedVersionOrLabel("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPromptName && selectedVersionOrLabel) {
      if (selectionType === "version") {
        setSelectedTag(
          `@@@langfusePrompt:name=${selectedPromptName}|version=${selectedVersionOrLabel}@@@`,
        );
      } else {
        setSelectedTag(
          `@@@langfusePrompt:name=${selectedPromptName}|label=${selectedVersionOrLabel}@@@`,
        );
      }
    } else {
      setSelectedTag("");
    }
  }, [selectedPromptName, selectedVersionOrLabel, selectionType]);

  const { data: promptOptions } = api.prompts.getPromptLinkOptions.useQuery(
    {
      projectId,
    },
    {
      enabled: Boolean(projectId),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
    },
  );

  const selectedPrompt = promptOptions?.find(
    (option) => option.name === selectedPromptName,
  );

  const handleConfirm = useCallback(() => {
    if (!selectedTag) return;
    if (onSelect) {
      onSelect(selectedTag);
    } else {
      copySelectedTag();
    }
    onClose();
  }, [copySelectedTag, selectedTag, onSelect, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("prompts.reference.addInline")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              {t("prompts.reference.description")}
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="prompt-name">
                {t("prompts.reference.promptName")}
              </Label>
              <Select
                value={selectedPromptName}
                onValueChange={(value) => {
                  setSelectedPromptName(value);
                  setSelectedVersionOrLabel("");
                }}
              >
                <SelectTrigger id="prompt-name">
                  <SelectValue
                    placeholder={t("prompts.reference.selectPrompt")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {promptOptions?.map((prompt) => (
                    <SelectItem key={prompt.name} value={prompt.name}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {t("prompts.reference.onlyText")}
              </p>
            </div>

            {selectedPromptName && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="selection-type">
                  {t("prompts.reference.referenceBy")}
                </Label>
                <Select
                  value={selectionType}
                  onValueChange={(value: "version" | "label") => {
                    setSelectionType(value);
                    setSelectedVersionOrLabel("");
                  }}
                >
                  <SelectTrigger id="selection-type">
                    <SelectValue
                      placeholder={t("prompts.reference.selectLinkType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label">{t("prompts.label")}</SelectItem>
                    <SelectItem value="version">
                      {t("prompts.version")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedPromptName && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="version-or-label">
                  {selectionType === "version"
                    ? t("prompts.version")
                    : t("prompts.label")}
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedVersionOrLabel}
                    onValueChange={setSelectedVersionOrLabel}
                  >
                    <SelectTrigger id="version-or-label">
                      <SelectValue
                        placeholder={
                          selectionType === "version"
                            ? t("prompts.reference.selectVersion")
                            : t("prompts.reference.selectLabel")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectionType === "version"
                        ? selectedPrompt?.versions.map((version) => (
                            <SelectItem
                              key={version.toString()}
                              value={version.toString()}
                            >
                              {version}
                            </SelectItem>
                          ))
                        : selectedPrompt?.labels.map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  {selectedVersionOrLabel && (
                    <Link
                      href={`/project/${projectId}/prompts/${selectedPromptName}?${selectionType}=${selectedVersionOrLabel}`}
                      target="_blank"
                      passHref
                    >
                      <Button type="button" variant="outline" size="icon">
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedTag && (
            <div className="space-y-2">
              <Label>{t("prompts.reference.tagPreview")}</Label>
              <div className="relative">
                <div className="bg-muted rounded-md border p-3 pr-10 font-mono text-xs">
                  {selectedTag}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="bg-opacity-70 absolute top-2 right-2"
                  onClick={copySelectedTag}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {onSelect
                  ? t("prompts.reference.inserted")
                  : t("prompts.reference.copied")}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedTag}>
            {onSelect ? t("prompts.insert") : t("prompts.copyAndClose")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
