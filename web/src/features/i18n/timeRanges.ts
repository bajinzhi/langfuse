import { type MessageKey } from "./messages";

const timeRangeMessageKeys: Record<string, MessageKey> = {
  allTime: "timeRange.allTime",
  custom: "timeRange.custom",
  last1Day: "timeRange.last1Day",
  last1Hour: "timeRange.last1Hour",
  last1Year: "timeRange.last1Year",
  last3Days: "timeRange.last3Days",
  last3Hours: "timeRange.last3Hours",
  last5Minutes: "timeRange.last5Minutes",
  last6Hours: "timeRange.last6Hours",
  last7Days: "timeRange.last7Days",
  last14Days: "timeRange.last14Days",
  last30Days: "timeRange.last30Days",
  last30Minutes: "timeRange.last30Minutes",
  last90Days: "timeRange.last90Days",
};

export function getTimeRangeMessageKey(option: string) {
  return timeRangeMessageKeys[option] ?? null;
}
