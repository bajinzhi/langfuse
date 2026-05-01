import { omitFilterFacets } from "@/src/features/filters/lib/filter-config";
import { sessionsViewCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

export type SessionOmittableFilterColumn = "userIds";

/**
 * Maps frontend column IDs to backend-expected column IDs
 * Frontend uses "tags" but backend CH mapping expects "traceTags" for trace tags on sessions table
 */
export const SESSION_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  tags: "traceTags",
};

const SESSION_LABEL_OVERRIDES = {
  id: "observability.columns.sessionId",
  tags: "observability.columns.traceTags",
} as const;

const sessionColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(sessionsViewCols, id, t, SESSION_LABEL_OVERRIDES);

const createSessionFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "sessions",

  columnDefinitions: translateFilterColumnDefinitions(
    sessionsViewCols,
    t,
    SESSION_LABEL_OVERRIDES,
  ),

  defaultExpanded: ["environment", "bookmarked"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: sessionColumnLabel("environment", t),
    },
    {
      type: "string" as const,
      column: "id",
      label: sessionColumnLabel("id", t),
    },
    {
      type: "categorical" as const,
      column: "userIds",
      label: sessionColumnLabel("userIds", t),
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: sessionColumnLabel("tags", t),
    },
    {
      type: "boolean" as const,
      column: "bookmarked",
      label: sessionColumnLabel("bookmarked", t),
      trueLabel: t("observability.filters.bookmarkedTrue"),
      falseLabel: t("observability.filters.bookmarkedFalse"),
    },
    {
      type: "numeric" as const,
      column: "sessionDuration",
      label: sessionColumnLabel("sessionDuration", t),
      min: 0,
      max: 3600,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "countTraces",
      label: sessionColumnLabel("countTraces", t),
      min: 0,
      max: 1000,
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: sessionColumnLabel("inputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: sessionColumnLabel("outputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: sessionColumnLabel("totalTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: sessionColumnLabel("inputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: sessionColumnLabel("outputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: sessionColumnLabel("totalCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: sessionColumnLabel("score_categories", t),
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: sessionColumnLabel("scores_avg", t),
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: sessionColumnLabel("commentCount", t),
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: sessionColumnLabel("commentContent", t),
    },
  ],
});

export const sessionFilterConfig: FilterConfig = createSessionFilterConfig();

export function getSessionFilterConfig(
  omittedFilter: SessionOmittableFilterColumn[] = [],
  t: Translate = defaultTranslate,
): FilterConfig {
  return omitFilterFacets(createSessionFilterConfig(t), omittedFilter);
}
