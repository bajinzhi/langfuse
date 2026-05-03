import { api } from "@/src/utils/api";
import type { ExperimentRunCallbackData } from "@/src/features/experiments/types";
import { useMemo, useState } from "react";
import { useQueryParams, withDefault, ArrayParam } from "use-query-params";

export function useDatasetRunsCompare(projectId: string, datasetId: string) {
  const [runState, setRunState] = useQueryParams({
    runs: withDefault(ArrayParam, []),
  });

  const [localRuns, setLocalRuns] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const runIds = runState.runs as undefined | string[];

  const dataset = api.datasets.byId.useQuery({
    datasetId,
    projectId,
  });

  const runsData = api.datasets.baseRunDataByDatasetId.useQuery(
    {
      projectId,
      datasetId,
    },
    {
      enabled: !!dataset.data,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  const utils = api.useUtils();

  const handleExperimentSettled = async (data?: ExperimentRunCallbackData) => {
    if (!data) return;
    const newRunIds = data.runIds?.length ? data.runIds : [data.runId];
    const nextRunIds = Array.from(new Set([...(runIds ?? []), ...newRunIds]));

    void utils.datasets.baseRunDataByDatasetId.invalidate();
    setLocalRuns((prev) => {
      const knownRunIds = new Set(prev.map((run) => run.key));
      const localRunsToAdd = newRunIds
        .filter((runId) => !knownRunIds.has(runId))
        .map((runId) => ({ key: runId, value: data.runName }));

      return [...prev, ...localRunsToAdd];
    });
    setRunState({
      runs: nextRunIds,
    });
  };

  const runs = useMemo(() => {
    const apiRuns =
      runsData.data?.map((run) => ({
        key: run.id,
        value: run.name,
      })) ?? [];

    return [...apiRuns, ...localRuns];
  }, [runsData.data, localRuns]);

  return {
    runIds,
    runs,
    dataset,
    runsData,
    handleExperimentSettled,
    setRunState,
    localRuns,
    setLocalRuns,
  };
}
