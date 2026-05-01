import startCase from "lodash/startCase";
import { type FilterState } from "@langfuse/shared";
import { type DashboardWidgetChartType } from "@langfuse/shared/src/db";
import {
  formatQueryMetricName,
  getQueryAggregationLabel,
  getQueryFieldLabel,
  getQueryViewLabel,
  type Translate,
} from "@/src/features/widgets/lib/queryMetadataI18n";
import { translateClientMessage } from "@/src/features/i18n";

// Shared widget chart configuration types
export type WidgetChartConfig = {
  type: DashboardWidgetChartType;
  row_limit?: number;
  bins?: number;
  defaultSort?: {
    column: string;
    order: "ASC" | "DESC";
  };
};

type PivotSortMetric = {
  measure: string;
  agg: string;
};

type PivotSortDimension = {
  field: string;
};

type PivotDefaultSort = NonNullable<WidgetChartConfig["defaultSort"]>;

/**
 * Old widgets can retain stale pivot defaultSort fields after metrics or
 * dimensions change. Ignore those persisted sort keys instead of letting them
 * reach QueryBuilder as invalid orderBy columns.
 */
export function sanitizePivotTableDefaultSort(
  defaultSort: WidgetChartConfig["defaultSort"] | undefined,
  params: {
    dimensions: PivotSortDimension[];
    metrics: PivotSortMetric[];
  },
): PivotDefaultSort | undefined {
  if (!defaultSort) {
    return undefined;
  }

  const validDimensionSort = params.dimensions.some(
    (dimension) => dimension.field === defaultSort.column,
  );
  const validMetricSort = params.metrics.some(
    (metric) => `${metric.agg}_${metric.measure}` === defaultSort.column,
  );

  return validDimensionSort || validMetricSort ? defaultSort : undefined;
}

/**
 * Formats a metric name for display, handling special cases like count_count -> Count
 */
export function formatMetricName(metricName: string, t?: Translate): string {
  if (t) {
    return formatQueryMetricName(metricName, t);
  }

  return formatQueryMetricName(metricName, translateClientMessage);
}

/**
 * Formats multiple metric names for display, showing first 3 and "+ X more" if needed
 */
export function formatMultipleMetricNames(
  metricNames: string[],
  t?: Translate,
): string {
  if (metricNames.length === 0) {
    return t
      ? t("widgets.generated.noMetrics")
      : translateClientMessage("widgets.generated.noMetrics");
  }
  if (metricNames.length === 1) return formatMetricName(metricNames[0], t);

  const formattedNames = metricNames.map((metricName) =>
    formatMetricName(metricName, t),
  );

  if (metricNames.length <= 3) {
    return formattedNames.join(", ");
  }

  const firstThree = formattedNames.slice(0, 3).join(", ");
  const remaining = metricNames.length - 3;
  if (t) {
    return t("widgets.generated.moreMetrics", {
      metrics: firstThree,
      count: remaining,
    });
  }
  return `${firstThree} + ${remaining} more`;
}

export function buildWidgetName({
  aggregation,
  measure,
  dimension,
  view,
  metrics,
  isMultiMetric = false,
  t,
}: {
  aggregation: string;
  measure: string;
  dimension: string;
  view: string;
  metrics?: string[];
  isMultiMetric?: boolean;
  t?: Translate;
}) {
  let base: string;

  if (isMultiMetric && metrics && metrics.length > 0) {
    // Handle multi-metric scenarios (like pivot tables)
    const metricDisplay = formatMultipleMetricNames(metrics, t);
    base = metricDisplay;
  } else {
    // Handle single metric scenarios (existing logic)
    const meas = formatMetricName(measure, t);
    if (measure.toLowerCase() === "count") {
      // For count measures, ignore aggregation and only show the measure
      base = meas;
    } else {
      const agg = t
        ? getQueryAggregationLabel(aggregation, t)
        : startCase(aggregation.toLowerCase());
      base = t
        ? t("widgets.query.metricWithAggregation", {
            aggregation: agg,
            measure: meas,
          })
        : `${agg} ${meas}`;
    }
  }

  const viewLabel = t ? getQueryViewLabel(view, t) : startCase(view);
  if (dimension && dimension !== "none") {
    const dimensionLabel = t
      ? getQueryFieldLabel(dimension, t)
      : startCase(dimension);
    return t
      ? t("widgets.generated.nameWithDimension", {
          base,
          dimension: dimensionLabel,
          view: viewLabel,
        })
      : `${base} by ${dimensionLabel} (${viewLabel})`;
  }
  return t
    ? t("widgets.generated.nameWithoutDimension", { base, view: viewLabel })
    : `${base} (${viewLabel})`;
}

export function buildWidgetDescription({
  aggregation,
  measure,
  dimension,
  view,
  filters,
  metrics,
  isMultiMetric = false,
  t,
}: {
  aggregation: string;
  measure: string;
  dimension: string;
  view: string;
  filters: FilterState;
  metrics?: string[];
  isMultiMetric?: boolean;
  t?: Translate;
}) {
  const viewLabel = t ? getQueryViewLabel(view, t) : startCase(view);
  let sentence: string;

  if (isMultiMetric && metrics && metrics.length > 0) {
    // Handle multi-metric scenarios
    const metricDisplay = formatMultipleMetricNames(metrics, t);
    sentence = t
      ? t("widgets.generated.description.multi", {
          metrics: metricDisplay,
          view: viewLabel,
        })
      : `Shows ${metricDisplay.toLowerCase()} of ${viewLabel}`;
  } else {
    // Handle single metric scenarios (existing logic)
    const measLabel = formatMetricName(measure, t);

    if (measure.toLowerCase() === "count") {
      sentence = t
        ? t("widgets.generated.description.count", { view: viewLabel })
        : `Shows the count of ${viewLabel}`;
    } else {
      const aggLabel = t
        ? getQueryAggregationLabel(aggregation, t)
        : startCase(aggregation.toLowerCase());
      sentence = t
        ? t("widgets.generated.description.single", {
            aggregation: aggLabel,
            measure: measLabel,
            view: viewLabel,
          })
        : `Shows the ${aggLabel.toLowerCase()} ${measLabel.toLowerCase()} of ${viewLabel}`;
    }
  }

  // Dimension clause
  if (dimension && dimension !== "none") {
    const dimensionLabel = t
      ? getQueryFieldLabel(dimension, t)
      : startCase(dimension);
    sentence = t
      ? t("widgets.generated.description.withDimension", {
          description: sentence,
          dimension: dimensionLabel,
        })
      : `${sentence} by ${dimensionLabel.toLowerCase()}`;
  }

  // Filters clause
  if (filters && filters.length > 0) {
    if (filters.length <= 2) {
      const cols = filters
        .map((f) => (t ? getQueryFieldLabel(f.column, t) : startCase(f.column)))
        .join(t ? t("common.andSeparator") : " and ");
      sentence = t
        ? t("widgets.generated.description.filteredByColumns", {
            description: sentence,
            columns: cols,
          })
        : `${sentence}, filtered by ${cols}`;
    } else {
      sentence = t
        ? t("widgets.generated.description.filteredByCount", {
            description: sentence,
            count: filters.length,
          })
        : `${sentence}, filtered by ${filters.length} conditions`;
    }
  }

  return sentence;
}

/**
 * Returns the default view for the new widget form.
 * When v4 beta is enabled, defaults to "observations" because "traces"
 * is excluded from viewsV2 (no v2-specific API support).
 */
export function getDefaultView(
  isBetaEnabled: boolean,
): "traces" | "observations" {
  return isBetaEnabled ? "observations" : "traces";
}

/**
 * SSE progress is only enabled on the v4 beta dashboard query path.
 */
export function shouldUseWidgetSSE({
  isV4Enabled,
  version,
}: {
  isV4Enabled: boolean;
  version: "v1" | "v2";
}): boolean {
  return isV4Enabled && version === "v2";
}
