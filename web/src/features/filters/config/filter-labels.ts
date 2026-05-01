import type { ColumnDefinition } from "@langfuse/shared";
import { enMessages } from "@/src/features/i18n/messages/en";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

export type Translate = (key: MessageKey, values?: MessageValues) => string;

export const defaultTranslate: Translate = (key) => enMessages[key];

type LabelOverrides = Partial<Record<string, MessageKey>>;

const FILTER_COLUMN_LABEL_KEYS = {
  id: "observability.columns.id",
  bookmarked: "observability.columns.bookmarked",
  name: "observability.columns.name",
  traceName: "observability.columns.traceName",
  environment: "observability.columns.environment",
  timestamp: "observability.columns.timestamp",
  userId: "observability.columns.userId",
  userIds: "observability.columns.userIds",
  sessionId: "observability.columns.sessionId",
  metadata: "observability.columns.metadata",
  version: "observability.columns.version",
  release: "observability.columns.release",
  level: "observability.columns.level",
  traceTags: "observability.columns.traceTags",
  tags: "observability.columns.tags",
  inputTokens: "observability.columns.inputTokens",
  outputTokens: "observability.columns.outputTokens",
  totalTokens: "observability.columns.totalTokens",
  tokens: "observability.columns.tokens",
  inputCost: "observability.columns.inputCost",
  outputCost: "observability.columns.outputCost",
  totalCost: "observability.columns.totalCost",
  latency: "observability.columns.latency",
  timeToFirstToken: "observability.columns.timeToFirstToken",
  tokensPerSecond: "observability.columns.tokensPerSecond",
  scores_avg: "observability.columns.numericScores",
  score_categories: "observability.columns.categoricalScores",
  trace_scores_avg: "observability.columns.traceNumericScores",
  trace_score_categories: "observability.columns.traceCategoricalScores",
  commentCount: "observability.columns.commentCount",
  commentContent: "observability.columns.commentContent",
  errorCount: "observability.columns.errorLevelCount",
  warningCount: "observability.columns.warningLevelCount",
  defaultCount: "observability.columns.defaultLevelCount",
  debugCount: "observability.columns.debugLevelCount",
  traceId: "observability.columns.traceId",
  parentObservationId: "observability.columns.parentObservationId",
  type: "observability.columns.type",
  startTime: "observability.columns.startTime",
  endTime: "observability.columns.endTime",
  statusMessage: "observability.columns.statusMessage",
  model: "observability.columns.model",
  modelId: "observability.columns.modelId",
  promptName: "observability.columns.promptName",
  promptVersion: "observability.columns.promptVersion",
  toolNames: "observability.columns.toolNamesAvailable",
  calledToolNames: "observability.columns.toolNamesCalled",
  toolDefinitions: "observability.columns.availableTools",
  toolCalls: "observability.columns.toolCalls",
  source: "observability.columns.source",
  dataType: "observability.columns.dataType",
  value: "observability.columns.value",
  stringValue: "observability.columns.scoreStringValue",
  labels: "observability.columns.labels",
  config: "observability.columns.config",
  createdAt: "observability.columns.createdAt",
  updatedAt: "observability.columns.updatedAt",
  status: "observability.columns.status",
  target: "observability.columns.target",
  executionTraceId: "observability.columns.executionTraceId",
  sessionDuration: "observability.columns.sessionDuration",
  countTraces: "observability.columns.tracesCount",
  datasetId: "observability.columns.dataset",
} satisfies Partial<Record<string, MessageKey>>;

export const getFilterColumnLabel = (
  columns: ColumnDefinition[],
  id: string,
  t: Translate = defaultTranslate,
  overrides: LabelOverrides = {},
): string => {
  const labelKey =
    overrides[id] ??
    FILTER_COLUMN_LABEL_KEYS[id as keyof typeof FILTER_COLUMN_LABEL_KEYS];

  if (labelKey) {
    return t(labelKey);
  }

  const column = columns.find((col) => col.id === id);
  if (!column) {
    throw new Error(`Column ${id} not found in filter column definitions`);
  }

  return column.name;
};

export const translateFilterColumnDefinitions = (
  columns: ColumnDefinition[],
  t: Translate = defaultTranslate,
  overrides: LabelOverrides = {},
): ColumnDefinition[] =>
  columns.map((column) => ({
    ...column,
    name: getFilterColumnLabel(columns, column.id, t, overrides),
  }));
