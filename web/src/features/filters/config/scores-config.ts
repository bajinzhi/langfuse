import { scoresTableCols } from "@/src/server/api/definitions/scoresTable";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

// Maps frontend column IDs to backend-expected column IDs
// Frontend uses "tags" but backend CH mapping expects "trace_tags" for trace tags on scores table
export const SCORE_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  tags: "trace_tags",
};

export type ScoresTableHiddenColumn =
  | "traceId"
  | "traceName"
  | "observationId"
  | "jobConfigurationId"
  | "userId"
  | "traceTags";

const SCORES_HIDDEN_COLUMN_TO_FILTER_COLUMN: Partial<
  Record<ScoresTableHiddenColumn, string>
> = {
  traceTags: "tags",
};

const SCORE_LABEL_OVERRIDES = {
  tags: "observability.columns.traceTags",
} as const;

const scoreColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(scoresTableCols, id, t, SCORE_LABEL_OVERRIDES);

const createScoreFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "scores",

  columnDefinitions: translateFilterColumnDefinitions(
    scoresTableCols,
    t,
    SCORE_LABEL_OVERRIDES,
  ),

  defaultExpanded: ["environment", "name"],

  defaultSidebarCollapsed: true,

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: scoreColumnLabel("environment", t),
    },
    {
      type: "categorical" as const,
      column: "name",
      label: scoreColumnLabel("name", t),
    },
    {
      type: "categorical" as const,
      column: "source",
      label: scoreColumnLabel("source", t),
    },
    {
      type: "categorical" as const,
      column: "dataType",
      label: scoreColumnLabel("dataType", t),
    },
    {
      type: "numeric" as const,
      column: "value",
      label: scoreColumnLabel("value", t),
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      type: "categorical" as const,
      column: "stringValue",
      label: scoreColumnLabel("stringValue", t),
    },
    {
      type: "string" as const,
      column: "traceId",
      label: scoreColumnLabel("traceId", t),
    },
    {
      type: "string" as const,
      column: "sessionId",
      label: scoreColumnLabel("sessionId", t),
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: scoreColumnLabel("traceName", t),
    },
    {
      type: "string" as const,
      column: "observationId",
      label: scoreColumnLabel("observationId", t),
    },
    {
      type: "categorical" as const,
      column: "userId",
      label: scoreColumnLabel("userId", t),
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: scoreColumnLabel("tags", t),
    },
  ],
});

export const scoreFilterConfig: FilterConfig = createScoreFilterConfig();

export function getScoreFilterConfig(
  hiddenColumns: ScoresTableHiddenColumn[] = [],
  t: Translate = defaultTranslate,
): FilterConfig {
  const scoreFilterConfig = createScoreFilterConfig(t);
  if (hiddenColumns.length === 0) {
    return scoreFilterConfig;
  }
  const hiddenColumnSet = new Set<string>(
    hiddenColumns.map(
      (column) => SCORES_HIDDEN_COLUMN_TO_FILTER_COLUMN[column] ?? column,
    ),
  );

  return {
    ...scoreFilterConfig,
    defaultExpanded: scoreFilterConfig.defaultExpanded?.filter(
      (column) => !hiddenColumnSet.has(column),
    ),
    facets: scoreFilterConfig.facets.filter(
      (facet) => !hiddenColumnSet.has(facet.column),
    ),
  };
}
