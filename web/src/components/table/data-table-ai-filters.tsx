import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { Info } from "lucide-react";
import { useQueryProject } from "@/src/features/projects/hooks";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { api } from "@/src/utils/api";
import { type FilterState } from "@langfuse/shared";
import { useI18n } from "@/src/features/i18n";

interface DataTableAIFiltersProps {
  onFiltersGenerated: (filters: FilterState) => void;
}

export function DataTableAIFilters({
  onFiltersGenerated,
}: DataTableAIFiltersProps) {
  const { t } = useI18n();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const projectId = useProjectIdFromURL();
  const { organization } = useQueryProject();

  const createFilterMutation =
    api.naturalLanguageFilters.createCompletion.useMutation();

  const handleAiFilterSubmit = async () => {
    if (aiPrompt.trim() && !createFilterMutation.isPending && projectId) {
      setAiError(null);
      try {
        const result = await createFilterMutation.mutateAsync({
          projectId,
          prompt: aiPrompt.trim(),
        });

        if (result && Array.isArray(result.filters)) {
          if (result.filters.length === 0) {
            setAiError(t("table.filters.failedGenerateTryAgain"));
            return;
          }

          // Set the filters from the API response
          onFiltersGenerated(result.filters as FilterState);
          setAiPrompt("");
        } else {
          console.error(result);
          setAiError(t("table.filters.invalidAIResponse"));
        }
      } catch (error) {
        console.error("Error calling tRPC API:", error);
        setAiError(
          error instanceof Error
            ? error.message
            : t("table.filters.failedGenerate"),
        );
      }
    }
  };

  if (!organization?.aiFeaturesEnabled) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {t("table.filters.filterWithAI")}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="text-muted-foreground h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t("table.filters.aiInfo")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Textarea
        autoFocus
        value={aiPrompt}
        onChange={(e) => {
          setAiPrompt(e.target.value);
          if (aiError) setAiError(null);
        }}
        placeholder={t("table.filters.aiPromptPlaceholder")}
        className="min-h-[80px] resize-none"
        disabled={createFilterMutation.isPending}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !createFilterMutation.isPending
          ) {
            e.preventDefault();
            handleAiFilterSubmit();
          }
        }}
      />
      <Button
        onClick={handleAiFilterSubmit}
        type="button"
        variant="default"
        size="sm"
        disabled={createFilterMutation.isPending || !aiPrompt.trim()}
        className="w-fit"
      >
        {createFilterMutation.isPending
          ? t("table.filters.loading")
          : t("table.filters.generateShort")}
      </Button>
      {aiError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {aiError}
        </div>
      )}
    </div>
  );
}
