import { observationsTableCols } from "@langfuse/shared";
import {
  omitFilterFacets,
  type FilterConfig,
} from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";
import { renderFilterIcon } from "@/src/components/ItemBadge";
import {
  defaultTranslate,
  getFilterColumnLabel,
  translateFilterColumnDefinitions,
  type Translate,
} from "@/src/features/filters/config/filter-labels";

export type ObservationsOmittableFilterColumn = "model" | "promptName";

/**
 * Maps frontend column IDs to backend-expected column IDs
 * Frontend uses "tags" but backend CH mapping expects "traceTags" for trace tags on observations table
 */
export const OBSERVATION_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  tags: "traceTags",
};

const observationColumnLabel = (id: string, t: Translate) =>
  getFilterColumnLabel(observationsTableCols, id, t);

const createObservationFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "observations",

  columnDefinitions: translateFilterColumnDefinitions(observationsTableCols, t),

  defaultExpanded: ["environment", "name"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: observationColumnLabel("environment", t),
    },
    {
      type: "categorical" as const,
      column: "type",
      label: observationColumnLabel("type", t),
      renderIcon: renderFilterIcon,
    },
    {
      type: "categorical" as const,
      column: "name",
      label: observationColumnLabel("name", t),
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: observationColumnLabel("traceName", t),
    },
    {
      type: "categorical" as const,
      column: "level",
      label: observationColumnLabel("level", t),
    },
    {
      type: "categorical" as const,
      column: "model",
      label: observationColumnLabel("model", t),
    },
    {
      type: "categorical" as const,
      column: "modelId",
      label: observationColumnLabel("modelId", t),
    },
    {
      type: "categorical" as const,
      column: "promptName",
      label: observationColumnLabel("promptName", t),
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: observationColumnLabel("tags", t),
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: observationColumnLabel("metadata", t),
    },
    {
      type: "string" as const,
      column: "version",
      label: observationColumnLabel("version", t),
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: observationColumnLabel("latency", t),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "timeToFirstToken",
      label: observationColumnLabel("timeToFirstToken", t),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: observationColumnLabel("inputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: observationColumnLabel("outputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: observationColumnLabel("totalTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: observationColumnLabel("inputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: observationColumnLabel("outputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: observationColumnLabel("totalCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "categorical" as const,
      column: "toolNames",
      label: observationColumnLabel("toolNames", t),
    },
    {
      type: "categorical" as const,
      column: "calledToolNames",
      label: observationColumnLabel("calledToolNames", t),
    },
    {
      type: "numeric" as const,
      column: "toolDefinitions",
      label: observationColumnLabel("toolDefinitions", t),
      min: 0,
      max: 25,
    },
    {
      type: "numeric" as const,
      column: "toolCalls",
      label: observationColumnLabel("toolCalls", t),
      min: 0,
      max: 25,
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: observationColumnLabel("score_categories", t),
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: observationColumnLabel("scores_avg", t),
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: observationColumnLabel("commentCount", t),
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: observationColumnLabel("commentContent", t),
    },
  ],
});

export const observationFilterConfig: FilterConfig =
  createObservationFilterConfig();

export function getObservationsFilterConfig(
  omittedFilter: ObservationsOmittableFilterColumn[] = [],
  t: Translate = defaultTranslate,
): FilterConfig {
  return omitFilterFacets(createObservationFilterConfig(t), omittedFilter);
}
