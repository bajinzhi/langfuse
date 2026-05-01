import { evalConfigsTableCols } from "@/src/server/api/definitions/evalConfigsTable";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

const evaluatorColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(evalConfigsTableCols, id, t);

const createEvaluatorFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "evaluators",

  columnDefinitions: translateFilterColumnDefinitions(evalConfigsTableCols, t),

  defaultExpanded: ["status"],

  defaultSidebarCollapsed: true,

  facets: [
    {
      type: "categorical" as const,
      column: "status",
      label: evaluatorColumnLabel("status", t),
    },
    {
      type: "categorical" as const,
      column: "target",
      label: evaluatorColumnLabel("target", t),
    },
  ],
});

export const evaluatorFilterConfig: FilterConfig =
  createEvaluatorFilterConfig();

export const getEvaluatorFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => createEvaluatorFilterConfig(t);
