import startCase from "lodash/startCase";

import type { MessageKey, MessageValues } from "@/src/features/i18n";

export type Translate = (key: MessageKey, values?: MessageValues) => string;

const queryViewLabelKeys: Partial<Record<string, MessageKey>> = {
  traces: "widgets.query.views.traces",
  observations: "widgets.query.views.observations",
  "scores-numeric": "widgets.query.views.scoresNumeric",
  "scores-categorical": "widgets.query.views.scoresCategorical",
};

const queryFieldLabelKeys: Partial<Record<string, MessageKey>> = {
  calledToolNames: "widgets.query.fields.calledToolNames",
  configId: "widgets.query.fields.configId",
  costByType: "widgets.query.fields.costByType",
  costType: "widgets.query.fields.costType",
  count: "widgets.query.fields.count",
  countScores: "widgets.query.fields.countScores",
  dataType: "widgets.query.fields.dataType",
  environment: "widgets.query.fields.environment",
  id: "widgets.query.fields.id",
  inputCost: "widgets.query.fields.inputCost",
  inputTokens: "widgets.query.fields.inputTokens",
  latency: "widgets.query.fields.latency",
  level: "widgets.query.fields.level",
  name: "widgets.query.fields.name",
  observationId: "widgets.query.fields.observationId",
  observationModelName: "widgets.query.fields.observationModelName",
  observationName: "widgets.query.fields.observationName",
  observationPromptName: "widgets.query.fields.observationPromptName",
  observationPromptVersion: "widgets.query.fields.observationPromptVersion",
  observationsCount: "widgets.query.fields.observationsCount",
  outputCost: "widgets.query.fields.outputCost",
  outputTokens: "widgets.query.fields.outputTokens",
  outputTokensPerSecond: "widgets.query.fields.outputTokensPerSecond",
  parentObservationId: "widgets.query.fields.parentObservationId",
  promptName: "widgets.query.fields.promptName",
  promptVersion: "widgets.query.fields.promptVersion",
  providedModelName: "widgets.query.fields.providedModelName",
  release: "widgets.query.fields.release",
  scoresCount: "widgets.query.fields.scoresCount",
  sessionId: "widgets.query.fields.sessionId",
  source: "widgets.query.fields.source",
  startTimeMonth: "widgets.query.fields.startTimeMonth",
  streamingLatency: "widgets.query.fields.streamingLatency",
  stringValue: "widgets.query.fields.stringValue",
  tags: "widgets.query.fields.tags",
  timeToFirstToken: "widgets.query.fields.timeToFirstToken",
  timestampDay: "widgets.query.fields.timestampDay",
  timestampMonth: "widgets.query.fields.timestampMonth",
  tokensPerSecond: "widgets.query.fields.tokensPerSecond",
  toolCalls: "widgets.query.fields.toolCalls",
  toolDefinitions: "widgets.query.fields.toolDefinitions",
  toolNames: "widgets.query.fields.toolNames",
  totalCost: "widgets.query.fields.totalCost",
  totalTokens: "widgets.query.fields.totalTokens",
  traceId: "widgets.query.fields.traceId",
  traceName: "widgets.query.fields.traceName",
  traceRelease: "widgets.query.fields.traceRelease",
  traceVersion: "widgets.query.fields.traceVersion",
  type: "widgets.query.fields.type",
  uniqueSessionIds: "widgets.query.fields.uniqueSessionIds",
  uniqueUserIds: "widgets.query.fields.uniqueUserIds",
  usageByType: "widgets.query.fields.usageByType",
  usageType: "widgets.query.fields.usageType",
  userId: "widgets.query.fields.userId",
  value: "widgets.query.fields.value",
  version: "widgets.query.fields.version",
};

const queryAggregationLabelKeys: Partial<Record<string, MessageKey>> = {
  avg: "widgets.query.aggregations.avg",
  count: "widgets.query.aggregations.count",
  histogram: "widgets.query.aggregations.histogram",
  max: "widgets.query.aggregations.max",
  min: "widgets.query.aggregations.min",
  p50: "widgets.query.aggregations.p50",
  p75: "widgets.query.aggregations.p75",
  p90: "widgets.query.aggregations.p90",
  p95: "widgets.query.aggregations.p95",
  p99: "widgets.query.aggregations.p99",
  sum: "widgets.query.aggregations.sum",
  uniq: "widgets.query.aggregations.uniq",
};

const queryDescriptionKeysByText: Partial<Record<string, MessageKey>> = {
  "Average number of output tokens produced per second between completion start time and span end time.":
    "widgets.query.descriptions.outputTokensPerSecond",
  "Average number of tokens consumed per second by the observation.":
    "widgets.query.descriptions.tokensPerSecond",
  "Cost category key from cost_details map (e.g. 'input', 'output', 'total').":
    "widgets.query.descriptions.costType",
  "Count of unique sessionIds.":
    "widgets.query.descriptions.uniqueSessionIdsCount",
  "Count of unique userIds.": "widgets.query.descriptions.uniqueUserIdsCount",
  "Day of the score timestamp in YYYY-MM-DD format.":
    "widgets.query.descriptions.scoreTimestampDay",
  "Deployment environment (e.g., production, staging).":
    "widgets.query.descriptions.environment",
  "Elapsed time between the first and last observation inside the trace.":
    "widgets.query.descriptions.traceLatency",
  "Identifier linking the observation to its parent trace.":
    "widgets.query.descriptions.observationTraceId",
  "Identifier of the config associated with the score.":
    "widgets.query.descriptions.scoreConfigId",
  "Identifier of the observation associated with the score.":
    "widgets.query.descriptions.scoreObservationId",
  "Identifier of the parent observation. Empty for the root span.":
    "widgets.query.descriptions.parentObservationId",
  "Identifier of the parent trace.": "widgets.query.descriptions.parentTraceId",
  "Identifier of the session triggering the observation.":
    "widgets.query.descriptions.observationSessionId",
  "Identifier of the session triggering the trace.":
    "widgets.query.descriptions.traceSessionId",
  "Identifier of the session.": "widgets.query.descriptions.sessionId",
  "Identifier of the user triggering the observation.":
    "widgets.query.descriptions.observationUserId",
  "Identifier of the user triggering the trace.":
    "widgets.query.descriptions.traceUserId",
  "Identifier of the user.": "widgets.query.descriptions.userId",
  "Internal data type of the score (NUMERIC, BOOLEAN, CATEGORICAL).":
    "widgets.query.descriptions.scoreDataType",
  "Latency of an individual observation (start time to end time).":
    "widgets.query.descriptions.observationLatency",
  "Latency of the generation step (completion start time to end time).":
    "widgets.query.descriptions.streamingLatency",
  "Logging level of the observation.":
    "widgets.query.descriptions.observationLevel",
  "Month of the observation start_time in YYYY-MM format.":
    "widgets.query.descriptions.observationStartMonth",
  "Month of the score timestamp in YYYY-MM format.":
    "widgets.query.descriptions.scoreTimestampMonth",
  "Month of the trace timestamp in YYYY-MM format.":
    "widgets.query.descriptions.traceTimestampMonth",
  "Name assigned to the trace (often the endpoint or operation).":
    "widgets.query.descriptions.traceName",
  "Name of the model used for the observation.":
    "widgets.query.descriptions.observationModelName",
  "Name of the observation associated with the score.":
    "widgets.query.descriptions.scoreObservationName",
  "Name of the observation.": "widgets.query.descriptions.observationName",
  "Name of the parent trace (backwards-compatible with v1).":
    "widgets.query.descriptions.parentTraceNameBackcompat",
  "Name of the parent trace.": "widgets.query.descriptions.parentTraceName",
  "Name of the prompt used for the observation.":
    "widgets.query.descriptions.observationPromptName",
  "Name of the score (e.g., accuracy, toxicity).":
    "widgets.query.descriptions.scoreName",
  "Names of available tools defined for the observation.":
    "widgets.query.descriptions.toolNames",
  "Names of tools that were called by the observation.":
    "widgets.query.descriptions.calledToolNames",
  "Number of available tools per observation.":
    "widgets.query.descriptions.toolDefinitions",
  "Number of tool calls per observation.":
    "widgets.query.descriptions.toolCalls",
  "Observations represent individual requests or operations within a trace. They are grouped into Spans, Generations, and Events.":
    "widgets.query.descriptions.observationsView",
  "Origin of the score. Can be API, ANNOTATION, or EVAL.":
    "widgets.query.descriptions.scoreSource",
  "Release version of the parent trace (backwards-compatible with v1, maps to denormalized release field).":
    "widgets.query.descriptions.parentTraceReleaseBackcompat",
  "Release version of the parent trace.":
    "widgets.query.descriptions.parentTraceRelease",
  "Release version of the trace.": "widgets.query.descriptions.traceRelease",
  "Release version.": "widgets.query.descriptions.release",
  "Scores are flexible objects that are used for evaluations. This view contains categorical scores.":
    "widgets.query.descriptions.scoresCategoricalView",
  "Scores are flexible objects that are used for evaluations. This view contains numeric and boolean scores.":
    "widgets.query.descriptions.scoresNumericView",
  "Session identifier; apply uniq aggregation to count distinct sessions.":
    "widgets.query.descriptions.sessionIdUniq",
  "Sum of cost per category. The costType dimension is auto-included to emit the ARRAY JOIN that brings cost_value into scope.":
    "widgets.query.descriptions.costByType",
  "Sum of input cost incurred by the observation.":
    "widgets.query.descriptions.inputCost",
  "Sum of input tokens consumed by the observation.":
    "widgets.query.descriptions.inputTokens",
  "Sum of output cost incurred by the observation.":
    "widgets.query.descriptions.outputCost",
  "Sum of output tokens produced by the observation.":
    "widgets.query.descriptions.outputTokens",
  "Sum of token usage per category. The usageType dimension is auto-included to emit the ARRAY JOIN that brings usage_value into scope.":
    "widgets.query.descriptions.usageByType",
  "Sum of tokens consumed by all observations in the trace.":
    "widgets.query.descriptions.traceTotalTokens",
  "Sum of tokens consumed by the observation.":
    "widgets.query.descriptions.totalTokens",
  "Time to first token for the observation.":
    "widgets.query.descriptions.timeToFirstToken",
  "Token usage category key from usage_details map (e.g. 'input', 'output', 'total').":
    "widgets.query.descriptions.usageType",
  "Total cost accumulated across observations in the trace.":
    "widgets.query.descriptions.traceTotalCost",
  "Total cost incurred by the observation.":
    "widgets.query.descriptions.totalCost",
  "Total number of observations.":
    "widgets.query.descriptions.observationCount",
  "Total number of scores.": "widgets.query.descriptions.scoreCount",
  "Total number of traces.": "widgets.query.descriptions.traceCount",
  "Trace identifier; apply uniq aggregation to count distinct traces.":
    "widgets.query.descriptions.traceIdUniq",
  "Traces built from events table aggregation - mirrors v1 traces view with 100% API compatibility.":
    "widgets.query.descriptions.eventsTracesView",
  "Traces represent a group of observations and typically represent a single request or operation.":
    "widgets.query.descriptions.tracesView",
  "Type of the observation. Can be a SPAN, GENERATION, or EVENT.":
    "widgets.query.descriptions.observationType",
  "Unique identifier for the observation.":
    "widgets.query.descriptions.observationId",
  "Unique identifier of the score entry.": "widgets.query.descriptions.scoreId",
  "Unique identifier of the trace.": "widgets.query.descriptions.traceId",
  "Unique observations linked to the trace.":
    "widgets.query.descriptions.observationsCount",
  "Unique scores attached to the observation.":
    "widgets.query.descriptions.observationScoresCount",
  "Unique scores attached to the trace.":
    "widgets.query.descriptions.traceScoresCount",
  "User identifier; apply uniq aggregation to count distinct users.":
    "widgets.query.descriptions.userIdUniq",
  "User-defined tags associated with the trace.":
    "widgets.query.descriptions.traceTags",
  "User-defined tags.": "widgets.query.descriptions.tags",
  "Value of the score.": "widgets.query.descriptions.scoreValue",
  "Version of the observation.":
    "widgets.query.descriptions.observationVersion",
  "Version of the parent trace (backwards-compatible with v1, maps to denormalized version field).":
    "widgets.query.descriptions.parentTraceVersionBackcompat",
  "Version of the parent trace.":
    "widgets.query.descriptions.parentTraceVersion",
  "Version of the prompt used for the observation.":
    "widgets.query.descriptions.observationPromptVersion",
  "Version of the trace.": "widgets.query.descriptions.traceVersion",
};

export const getQueryViewLabel = (view: string, t: Translate) =>
  t(queryViewLabelKeys[view] ?? "widgets.query.views.unknown", { view });

export const getQueryFieldLabel = (field: string, t: Translate) =>
  queryFieldLabelKeys[field]
    ? t(queryFieldLabelKeys[field])
    : /\s|,/.test(field)
      ? field
      : startCase(field);

export const getQueryAggregationLabel = (aggregation: string, t: Translate) =>
  queryAggregationLabelKeys[aggregation]
    ? t(queryAggregationLabelKeys[aggregation])
    : startCase(aggregation);

export const getQueryPropertyDescription = (
  description: string | undefined,
  t: Translate,
) =>
  description
    ? t(queryDescriptionKeysByText[description] ?? "widgets.query.raw", {
        value: description,
      })
    : undefined;

export const formatQueryMetricName = (metricName: string, t: Translate) => {
  if (metricName === "count_count") {
    return getQueryFieldLabel("count", t);
  }

  const [aggregation, ...measureParts] = metricName.split("_");
  const measure = measureParts.join("_");

  if (aggregation && measure && queryAggregationLabelKeys[aggregation]) {
    return t("widgets.query.metricWithAggregation", {
      aggregation: getQueryAggregationLabel(aggregation, t),
      measure: getQueryFieldLabel(measure, t),
    });
  }

  return getQueryFieldLabel(metricName, t);
};
