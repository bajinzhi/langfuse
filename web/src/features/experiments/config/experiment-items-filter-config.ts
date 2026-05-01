import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import { translateClientMessage } from "@/src/features/i18n";
import type { ColumnDefinition, ObservationLevelType } from "@langfuse/shared";

/**
 * Column definitions for experiment items table.
 * These map to the columns in packages/shared/src/server/tableMappings/mapExperimentItemsTable.ts
 */
export const experimentItemsTableCols: ColumnDefinition[] = [
  {
    name: translateClientMessage("experiments.columns.experimentItemId"),
    id: "id",
    type: "string",
    internal: "experiment_item_id",
  },
  {
    name: translateClientMessage("experiments.columns.experimentId"),
    id: "experimentId",
    type: "string",
    internal: "experiment_id",
  },
  {
    name: translateClientMessage("experiments.columns.traceId"),
    id: "traceId",
    type: "string",
    internal: "trace_id",
  },
  {
    name: translateClientMessage("experiments.columns.datasetItemId"),
    id: "datasetItemId",
    type: "string",
    internal: "dataset_item_id",
  },
  {
    name: translateClientMessage("experiments.columns.startTime"),
    id: "startTime",
    type: "datetime",
    internal: "start_time",
  },
  {
    name: translateClientMessage("experiments.columns.level"),
    id: "level",
    type: "stringOptions",
    internal: "level",
    options: [
      { value: "DEBUG" },
      { value: "DEFAULT" },
      { value: "WARNING" },
      { value: "ERROR" },
    ] as { value: ObservationLevelType }[],
  },
  {
    name: translateClientMessage("experiments.columns.costUsd"),
    id: "totalCost",
    type: "number",
    internal: "total_cost",
    nullable: true,
  },
  {
    name: translateClientMessage("experiments.columns.latencyMs"),
    id: "latencyMs",
    type: "number",
    internal: "latency_ms",
    nullable: true,
  },
  {
    name: translateClientMessage("experiments.columns.scoresNumeric"),
    id: "obs_scores_avg",
    type: "numberObject",
    internal: "obs_scores_avg",
  },
  {
    name: translateClientMessage("experiments.columns.scoresCategorical"),
    id: "obs_score_categories",
    type: "categoryOptions",
    internal: "obs_score_categories",
    options: [],
    nullable: true,
  },
  {
    name: translateClientMessage("experiments.columns.traceScoresNumeric"),
    id: "trace_scores_avg",
    type: "numberObject",
    internal: "trace_scores_avg",
  },
  {
    name: translateClientMessage("experiments.columns.traceScoresCategorical"),
    id: "trace_score_categories",
    type: "categoryOptions",
    internal: "trace_score_categories",
    options: [],
    nullable: true,
  },
  {
    name: translateClientMessage("experiments.columns.itemMetadata"),
    id: "itemMetadata",
    type: "stringObject",
    internal: "itemMetadata",
    nullable: true,
  },
  {
    name: translateClientMessage("experiments.columns.metadata"),
    id: "eventMetadata",
    type: "stringObject",
    internal: "eventMetadata",
    nullable: true,
  },
];

/**
 * Helper function to get column name from experimentItemsTableCols by ID
 */
export const getExperimentItemsColumnName = (id: string): string => {
  const column = experimentItemsTableCols.find((col) => col.id === id);
  if (!column) {
    throw new Error(`Column ${id} not found in experimentItemsTableCols`);
  }
  return column.name;
};

/**
 * Filter configuration for experiment items table.
 * Defines available sidebar filters and their types.
 */
export const experimentItemsFilterConfig: FilterConfig = {
  tableName: "experiment-items",

  columnDefinitions: experimentItemsTableCols,

  facets: [
    {
      type: "stringKeyValue" as const,
      column: "itemMetadata",
      label: getExperimentItemsColumnName("itemMetadata"),
    },
    {
      type: "stringKeyValue" as const,
      column: "eventMetadata",
      label: getExperimentItemsColumnName("eventMetadata"),
    },
    {
      type: "keyValue" as const,
      column: "obs_score_categories",
      label: getExperimentItemsColumnName("obs_score_categories"),
    },
    {
      type: "numericKeyValue" as const,
      column: "obs_scores_avg",
      label: getExperimentItemsColumnName("obs_scores_avg"),
    },
    {
      type: "keyValue" as const,
      column: "trace_score_categories",
      label: getExperimentItemsColumnName("trace_score_categories"),
    },
    {
      type: "numericKeyValue" as const,
      column: "trace_scores_avg",
      label: getExperimentItemsColumnName("trace_scores_avg"),
    },
  ],
};
