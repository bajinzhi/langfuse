import { tracesTableCols } from "@langfuse/shared";
import {
  omitFilterFacets,
  type FilterConfig,
} from "@/src/features/filters/lib/filter-config";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

export type TraceOmittableFilterColumn = "userId" | "sessionId";

const TRACE_LABEL_OVERRIDES = {
  id: "observability.columns.traceId",
} as const;

const traceColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(tracesTableCols, id, t, TRACE_LABEL_OVERRIDES);

const createTraceFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "traces",

  columnDefinitions: translateFilterColumnDefinitions(
    tracesTableCols,
    t,
    TRACE_LABEL_OVERRIDES,
  ),

  defaultExpanded: ["environment", "traceName"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: traceColumnLabel("environment", t),
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: traceColumnLabel("traceName", t),
    },
    {
      type: "string" as const,
      column: "id",
      label: traceColumnLabel("id", t),
    },
    {
      type: "categorical" as const,
      column: "userId",
      label: traceColumnLabel("userId", t),
    },
    {
      type: "categorical" as const,
      column: "sessionId",
      label: traceColumnLabel("sessionId", t),
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: traceColumnLabel("metadata", t),
    },
    {
      type: "string" as const,
      column: "version",
      label: traceColumnLabel("version", t),
    },
    {
      type: "string" as const,
      column: "release",
      label: traceColumnLabel("release", t),
    },
    {
      type: "boolean" as const,
      column: "bookmarked",
      label: traceColumnLabel("bookmarked", t),
      trueLabel: t("observability.filters.bookmarkedTrue"),
      falseLabel: t("observability.filters.bookmarkedFalse"),
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: traceColumnLabel("commentCount", t),
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: traceColumnLabel("commentContent", t),
    },
    {
      type: "categorical" as const,
      column: "traceTags",
      label: traceColumnLabel("traceTags", t),
    },
    {
      type: "categorical" as const,
      column: "level",
      label: traceColumnLabel("level", t),
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: traceColumnLabel("latency", t),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: traceColumnLabel("inputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: traceColumnLabel("outputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: traceColumnLabel("totalTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: traceColumnLabel("inputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: traceColumnLabel("outputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: traceColumnLabel("totalCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: traceColumnLabel("score_categories", t),
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: traceColumnLabel("scores_avg", t),
    },
  ],
});

export const traceFilterConfig: FilterConfig = createTraceFilterConfig();

export function getTraceFilterConfig(
  omittedFilter: TraceOmittableFilterColumn[] = [],
  t: Translate = defaultTranslate,
): FilterConfig {
  return omitFilterFacets(createTraceFilterConfig(t), omittedFilter);
}
