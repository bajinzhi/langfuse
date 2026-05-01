import { Button } from "@/src/components/ui/button";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { Trash } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { useRouter } from "next/router";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useI18n } from "@/src/features/i18n";

export function DeletePromptVersion({
  promptVersionId,
  version,
  countVersions,
}: {
  promptVersionId: string;
  version: number;
  countVersions: number;
}) {
  const { t } = useI18n();
  const capture = usePostHogClientCapture();
  const projectId = useProjectIdFromURL();
  const utils = api.useUtils();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAccess = useHasProjectAccess({ projectId, scope: "prompts:CUD" });

  const mutDeletePromptVersion = api.prompts.deleteVersion.useMutation({
    onSuccess: () => {
      void utils.prompts.invalidate();
      setError(null);
      setIsOpen(false);
      if (countVersions > 1) {
        void router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, version: undefined },
          },
          undefined,
          { shallow: true },
        );
      } else {
        void router.push(`/project/${projectId}/prompts`);
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  return (
    <Popover
      key={promptVersionId}
      open={isOpen}
      onOpenChange={() => {
        if (isOpen) {
          capture("prompt_detail:version_delete_open");
        }
        setIsOpen(!isOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          disabled={!hasAccess}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Trash className="mr-2 h-4 w-4" />
          {t("prompts.delete.version")}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <h2 className="text-md mb-3 font-semibold">
          {t("common.pleaseConfirm")}
        </h2>
        <p className="mb-3 text-sm">
          {t("prompts.delete.versionBodyBefore")}{" "}
          <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {version}
          </code>{" "}
          {t("prompts.delete.versionBodyAfter")}
        </p>
        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">{t("prompts.errorPrefix")}</p>
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="destructive"
            loading={mutDeletePromptVersion.isPending}
            onClick={() => {
              if (!projectId) {
                console.error("Project ID is missing");
                return;
              }
              capture("prompt_detail:version_delete_submit");
              setError(null);

              void mutDeletePromptVersion.mutate({
                promptVersionId,
                projectId,
              });
            }}
          >
            {t("prompts.delete.versionConfirm")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
