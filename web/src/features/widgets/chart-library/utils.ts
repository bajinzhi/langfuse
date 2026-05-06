import { useCallback } from "react";
import { type DataPoint } from "./chart-props";
import { type DashboardWidgetChartType } from "@langfuse/shared/src/db";
import { translateClientMessage, type MessageKey } from "@/src/features/i18n";
import { useCurrencyFormatter } from "@/src/features/currency/useCurrencyFormatter";
import {
  compactNumberFormatter,
  compactSmallNumberFormatter,
  latencyFormatter,
  numberFormatter,
  usdFormatter,
} from "@/src/utils/numbers";

/**
 * Groups data by dimension to prepare it for time series breakdowns
 * @param data
 */
export const groupDataByTimeDimension = (
  data: DataPoint[],
  unknownLabel = translateClientMessage("common.unknown"),
) => {
  // First, group by time_dimension
  const timeGroups = data.reduce(
    (acc: Record<string, Record<string, number>>, item: DataPoint) => {
      const time = item.time_dimension || unknownLabel;
      if (!acc[time]) {
        acc[time] = {};
      }

      const dimension = item.dimension || unknownLabel;
      acc[time][dimension] = item.metric as number;

      return acc;
    },
    {},
  );

  // Convert to array format for Recharts
  return Object.entries(timeGroups).map(([time, dimensions]) => ({
    time_dimension: time,
    ...dimensions,
  }));
};

export const getUniqueDimensions = (data: DataPoint[]) => {
  const uniqueDimensions = new Set<string>();
  data.forEach((item: DataPoint) => {
    if (item.dimension) {
      uniqueDimensions.add(item.dimension);
    }
  });
  return Array.from(uniqueDimensions);
};

export const isTimeSeriesChart = (
  chartType: DashboardWidgetChartType,
): boolean => {
  switch (chartType) {
    case "LINE_TIME_SERIES":
    case "AREA_TIME_SERIES":
    case "BAR_TIME_SERIES":
      return true;
    case "HORIZONTAL_BAR":
    case "VERTICAL_BAR":
    case "PIE":
    case "HISTOGRAM":
    case "NUMBER":
    case "PIVOT_TABLE":
      return false;
    default:
      return false;
  }
};

// Used for a combination of YAxis styling workarounds as discussed in https://github.com/recharts/recharts/issues/2027#issuecomment-769674096.
export const formatAxisLabel = (label: string): string =>
  label.length > 13 ? label.slice(0, 13).concat("…") : label;

/**
 * Maps chart types to their human-readable display names.
 */
export function getChartTypeDisplayName(
  chartType: DashboardWidgetChartType,
): string {
  return translateClientMessage(getChartTypeDisplayNameKey(chartType));
}

export function getChartTypeDisplayNameKey(
  chartType: DashboardWidgetChartType,
): MessageKey {
  switch (chartType) {
    case "LINE_TIME_SERIES":
      return "widgets.chartTypes.lineTimeSeries";
    case "AREA_TIME_SERIES":
      return "widgets.chartTypes.areaTimeSeries";
    case "BAR_TIME_SERIES":
      return "widgets.chartTypes.barTimeSeries";
    case "HORIZONTAL_BAR":
      return "widgets.chartTypes.horizontalBarTotalValue";
    case "VERTICAL_BAR":
      return "widgets.chartTypes.verticalBarTotalValue";
    case "PIE":
      return "widgets.chartTypes.pieTotalValue";
    case "NUMBER":
      return "widgets.chartTypes.bigNumberTotalValue";
    case "HISTOGRAM":
      return "widgets.chartTypes.histogramTotalValue";
    case "PIVOT_TABLE":
      return "widgets.chartTypes.pivotTableTotalValue";
    default:
      return "widgets.chartTypes.unknown";
  }
}

/**
 * Formats a metric value for display, dispatching on the result unit returned
 * by getResultUnit. String values pass through unchanged.
 *
 * - "millisecond" → latencyFormatter (auto-scales ms/s/min/h/d)
 * - "USD" → usdFormatter
 * - any other unit (or undefined):
 *   - sub-unit magnitudes (|value| < 1, non-zero) → compactSmallNumberFormatter
 *     regardless of `compact`, since the regular formatters round small
 *     values toward "0" and lose precision
 *   - else `compact` true → compactNumberFormatter (e.g. "12K") for axis
 *     ticks
 *   - else → numberFormatter with up to 2 fractional digits and no
 *     trailing-zero padding
 *
 * `compact` is intended for axis ticks where space matters; tooltips and
 * tables should leave it off so values keep full precision.
 */
export function valueFormatter(
  value: number | string,
  unit?: string,
  compact?: boolean,
): string {
  if (typeof value === "string") return value;
  switch (unit) {
    case "millisecond":
      return latencyFormatter(value);
    case "USD":
      return usdFormatter(value);
    default:
      if (value !== 0 && Math.abs(value) < 1)
        return compactSmallNumberFormatter(value);
      if (compact) return compactNumberFormatter(value);
      return numberFormatter(value, 0, 2);
  }
}

/**
 * Currency-aware variant of `valueFormatter` for React components.
 *
 * Subscribes to the active project's currency preference so any chart that
 * renders a `USD` unit metric will auto-update when the user switches
 * display currency. Non-currency branches fall back to the plain formatters
 * used by the strict `valueFormatter` above.
 *
 * Strict-USD callers (CSV exports, billing, anywhere we *want* to keep
 * dollars regardless of preference) should keep using `valueFormatter`.
 */
export function useValueFormatter() {
  const { format: formatActiveCurrency } = useCurrencyFormatter();
  return useCallback(
    (value: number | string, unit?: string, compact?: boolean): string => {
      if (typeof value === "string") return value;
      switch (unit) {
        case "millisecond":
          return latencyFormatter(value);
        case "USD":
          return formatActiveCurrency(value, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          });
        default:
          if (value !== 0 && Math.abs(value) < 1)
            return compactSmallNumberFormatter(value);
          if (compact) return compactNumberFormatter(value);
          return numberFormatter(value, 0, 2);
      }
    },
    [formatActiveCurrency],
  );
}
