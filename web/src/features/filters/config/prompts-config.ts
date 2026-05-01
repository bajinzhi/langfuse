import { promptsTableCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

const promptColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(promptsTableCols, id, t);

const createPromptFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "prompts",

  columnDefinitions: translateFilterColumnDefinitions(promptsTableCols, t),

  defaultExpanded: ["type"],

  defaultSidebarCollapsed: true,

  facets: [
    {
      type: "categorical" as const,
      column: "type",
      label: promptColumnLabel("type", t),
    },
    {
      type: "categorical" as const,
      column: "labels",
      label: promptColumnLabel("labels", t),
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: promptColumnLabel("tags", t),
    },
    {
      type: "numeric" as const,
      column: "version",
      label: promptColumnLabel("version", t),
      min: 1,
      max: 100,
    },
  ],
});

export const promptFilterConfig: FilterConfig = createPromptFilterConfig();

export const getPromptFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => createPromptFilterConfig(t);
