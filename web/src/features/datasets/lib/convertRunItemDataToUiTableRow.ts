import {
  type DatasetRunItemByRunRowData,
  type DatasetRunItemByItemRowData,
} from "./types";
import { type EnrichedDatasetRunItem } from "@langfuse/shared/src/server";
import { isPresent } from "@langfuse/shared";

/**
 * Resolve the USD cost for a dataset run item, preferring the linked
 * observation's calculated cost (more accurate, post-tier) and falling
 * back to the trace's aggregate cost. Returned as a raw number so cells
 * render via `<CurrencyAmount>` and respect the active currency.
 */
function resolveUsdCost(item: EnrichedDatasetRunItem): number | undefined {
  if (isPresent(item.observation?.calculatedTotalCost)) {
    return item.observation.calculatedTotalCost.toNumber();
  }
  if (isPresent(item.trace?.totalCost)) {
    const traceCost = item.trace.totalCost;
    return typeof traceCost === "number" ? traceCost : Number(traceCost);
  }
  return undefined;
}

export const convertRunItemToItemsByItemUiTableRow = (
  item: EnrichedDatasetRunItem,
): DatasetRunItemByItemRowData => {
  return {
    id: item.id,
    runAt: item.createdAt,
    datasetRunName: item.datasetRunName,
    trace: !!item.trace?.id
      ? {
          traceId: item.trace.id,
          observationId: item.observation?.id,
        }
      : undefined,
    scores: item.scores,
    totalCost: resolveUsdCost(item),
    latency: item.observation?.latency ?? item.trace?.duration ?? undefined,
  };
};

export const convertRunItemToItemsByRunUiTableRow = (
  item: EnrichedDatasetRunItem,
): DatasetRunItemByRunRowData => {
  return {
    id: item.id,
    runAt: item.createdAt,
    datasetItemId: item.datasetItemId,
    datasetItemVersion: item.datasetItemVersion ?? undefined,
    trace: !!item.trace?.id
      ? {
          traceId: item.trace.id,
          observationId: item.observation?.id,
        }
      : undefined,
    scores: item.scores,
    totalCost: resolveUsdCost(item),
    latency: item.observation?.latency ?? item.trace?.duration ?? undefined,
  };
};
