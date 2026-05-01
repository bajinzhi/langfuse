import { eventsTableCols } from "@langfuse/shared";
import {
  omitFilterFacets,
  type FilterConfig,
} from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";
import { renderFilterIcon } from "@/src/components/ItemBadge";
import { enMessages } from "@/src/features/i18n/messages/en";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

const defaultTranslate: Translate = (key) => enMessages[key];

const EVENT_COLUMN_LABEL_KEYS = {
  id: "observability.columns.id",
  traceId: "observability.columns.traceId",
  startTime: "observability.columns.startTime",
  endTime: "observability.columns.endTime",
  name: "observability.columns.name",
  type: "observability.columns.type",
  environment: "observability.columns.environment",
  version: "observability.columns.version",
  userId: "observability.columns.userId",
  sessionId: "observability.columns.sessionId",
  traceName: "observability.columns.traceName",
  level: "observability.columns.level",
  statusMessage: "observability.columns.statusMessage",
  promptName: "observability.columns.promptName",
  promptVersion: "observability.columns.promptVersion",
  modelId: "observability.columns.modelId",
  providedModelName: "observability.columns.providedModelName",
  totalCost: "observability.columns.totalCost",
  inputTokens: "observability.columns.inputTokens",
  outputTokens: "observability.columns.outputTokens",
  totalTokens: "observability.columns.totalTokens",
  inputCost: "observability.columns.inputCost",
  outputCost: "observability.columns.outputCost",
  latency: "observability.columns.latency",
  timeToFirstToken: "observability.columns.timeToFirstToken",
  tokensPerSecond: "observability.columns.tokensPerSecond",
  input: "observability.columns.input",
  output: "observability.columns.output",
  metadata: "observability.columns.metadata",
  traceTags: "observability.columns.traceTags",
  scores_avg: "observability.columns.numericScores",
  score_categories: "observability.columns.categoricalScores",
  trace_scores_avg: "observability.columns.traceNumericScores",
  trace_score_categories: "observability.columns.traceCategoricalScores",
  commentCount: "observability.columns.commentCount",
  commentContent: "observability.columns.commentContent",
  hasParentObservation: "observability.columns.hasParentObservation",
  experimentDatasetId: "observability.columns.experimentDatasetId",
  experimentId: "observability.columns.experimentId",
  experimentName: "observability.columns.experimentName",
  toolNames: "observability.columns.toolNamesAvailable",
  calledToolNames: "observability.columns.toolNamesCalled",
  toolDefinitions: "observability.columns.availableTools",
  toolCalls: "observability.columns.toolCalls",
  isExperimentItemRootSpan: "observability.columns.isExperimentItemRootSpan",
} satisfies Partial<Record<string, MessageKey>>;

// Helper function to get column name from eventsTableCols by ID
export const getEventsColumnName = (
  id: string,
  t: Translate = defaultTranslate,
): string => {
  const labelKey =
    EVENT_COLUMN_LABEL_KEYS[id as keyof typeof EVENT_COLUMN_LABEL_KEYS];
  if (labelKey) {
    return t(labelKey);
  }

  const column = eventsTableCols.find((col) => col.id === id);
  if (!column) {
    throw new Error(`Column ${id} not found in eventsTableCols`);
  }
  return column.name;
};

/**
 * Maps frontend column IDs to backend-expected column IDs for events table
 * Events table uses different naming conventions than observations table
 */
export const OBSERVATION_EVENTS_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  // No mapping needed currently - events table column names align with UI
};

export type ObservationEventsOmittableFilterColumn = "sessionId" | "userId";

const getEventsColumnDefinitions = (t: Translate) =>
  eventsTableCols.map((column) => ({
    ...column,
    name: getEventsColumnName(column.id, t),
  }));

const createObservationEventsFilterConfig = (
  t: Translate = defaultTranslate,
): FilterConfig => ({
  tableName: "observations-events",

  columnDefinitions: getEventsColumnDefinitions(t),

  defaultExpanded: ["environment", "name", "hasParentObservation", "type"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: getEventsColumnName("environment", t),
    },
    {
      type: "categorical" as const,
      column: "type",
      label: getEventsColumnName("type", t),
      renderIcon: renderFilterIcon,
    },
    {
      type: "boolean" as const,
      column: "hasParentObservation",
      label: t("observability.events.filters.isRootObservation"),
      tooltip: t("observability.events.filters.isRootObservationTooltip"),
      invertValue: true, // "True" = hasParentObservation=false (is root)
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: getEventsColumnName("traceName", t),
    },
    {
      type: "categorical" as const,
      column: "name",
      label: getEventsColumnName("name", t),
    },
    {
      type: "categorical" as const,
      column: "level",
      label: getEventsColumnName("level", t),
    },
    {
      type: "categorical" as const,
      column: "providedModelName",
      label: getEventsColumnName("providedModelName", t),
    },
    {
      type: "categorical" as const,
      column: "modelId",
      label: getEventsColumnName("modelId", t),
    },
    {
      type: "categorical" as const,
      column: "promptName",
      label: getEventsColumnName("promptName", t),
    },
    {
      type: "categorical" as const,
      column: "traceTags",
      label: getEventsColumnName("traceTags", t),
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: getEventsColumnName("metadata", t),
    },
    {
      type: "categorical" as const,
      column: "version",
      label: getEventsColumnName("version", t),
    },
    {
      type: "string" as const,
      column: "statusMessage",
      label: getEventsColumnName("statusMessage", t),
    },
    {
      type: "string" as const,
      column: "traceId",
      label: getEventsColumnName("traceId", t),
    },
    {
      type: "categorical" as const,
      column: "sessionId",
      label: getEventsColumnName("sessionId", t),
    },
    {
      type: "categorical" as const,
      column: "userId",
      label: getEventsColumnName("userId", t),
    },
    {
      type: "categorical" as const,
      column: "experimentDatasetId",
      label: getEventsColumnName("experimentDatasetId", t),
    },
    {
      type: "categorical" as const,
      column: "experimentId",
      label: getEventsColumnName("experimentId", t),
    },
    {
      type: "categorical" as const,
      column: "experimentName",
      label: getEventsColumnName("experimentName", t),
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: getEventsColumnName("latency", t),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "timeToFirstToken",
      label: getEventsColumnName("timeToFirstToken", t),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: getEventsColumnName("inputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: getEventsColumnName("outputTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: getEventsColumnName("totalTokens", t),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: getEventsColumnName("inputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: getEventsColumnName("outputCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: getEventsColumnName("totalCost", t),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "categorical" as const,
      column: "toolNames",
      label: t("observability.columns.toolNamesAvailable"),
    },
    {
      type: "categorical" as const,
      column: "calledToolNames",
      label: t("observability.columns.toolNamesCalled"),
    },
    {
      type: "numeric" as const,
      column: "toolDefinitions",
      label: t("observability.columns.availableTools"),
      min: 0,
      max: 25,
    },
    {
      type: "numeric" as const,
      column: "toolCalls",
      label: t("observability.columns.toolCalls"),
      min: 0,
      max: 25,
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: t("observability.columns.categoricalScores"),
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: t("observability.columns.numericScores"),
    },
    {
      type: "keyValue" as const,
      column: "trace_score_categories",
      label: t("observability.columns.traceCategoricalScores"),
    },
    {
      type: "numericKeyValue" as const,
      column: "trace_scores_avg",
      label: t("observability.columns.traceNumericScores"),
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: t("observability.columns.commentCount"),
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: t("observability.columns.commentContent"),
    },
  ],
});

export const observationEventsFilterConfig =
  createObservationEventsFilterConfig();

export function getObservationEventsFilterConfig(
  omittedFilter: ObservationEventsOmittableFilterColumn[] = [],
  t: Translate = defaultTranslate,
): FilterConfig {
  return omitFilterFacets(
    createObservationEventsFilterConfig(t),
    omittedFilter,
  );
}
