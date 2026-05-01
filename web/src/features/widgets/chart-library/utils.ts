import { type DataPoint } from "./chart-props";
import { type DashboardWidgetChartType } from "@langfuse/shared/src/db";
import { translateClientMessage, type MessageKey } from "@/src/features/i18n";

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
