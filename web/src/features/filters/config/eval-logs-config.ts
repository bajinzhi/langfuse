import { evalExecutionsFilterCols } from "@/src/server/api/definitions/evalExecutionsTable";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

const evalLogColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(evalExecutionsFilterCols, id, t);

const createEvalLogFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "evalLogs",

  columnDefinitions: translateFilterColumnDefinitions(
    evalExecutionsFilterCols,
    t,
  ),

  defaultExpanded: ["status"],

  defaultSidebarCollapsed: true,

  facets: [
    {
      type: "categorical" as const,
      column: "status",
      label: evalLogColumnLabel("status", t),
    },
    {
      type: "string" as const,
      column: "traceId",
      label: evalLogColumnLabel("traceId", t),
    },
    {
      type: "string" as const,
      column: "executionTraceId",
      label: evalLogColumnLabel("executionTraceId", t),
    },
  ],
});

export const evalLogFilterConfig: FilterConfig = createEvalLogFilterConfig();

export const getEvalLogFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => createEvalLogFilterConfig(t);
