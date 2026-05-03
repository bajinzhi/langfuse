import {
  createDatasetItemFilterState,
  getDatasetItems,
} from "@langfuse/shared/src/server";
import {
  normalizeDatasetItemInput,
  stringifyValue,
  validateDatasetItem,
  formatPromptfooReservedPromptVariableError,
  getPromptfooReservedPromptVariableConflicts,
  type DatasetItemDomain,
} from "@langfuse/shared";
import {
  PROMPTFOO_DATASET_ITEM_ID_VAR,
  PROMPTFOO_DATASET_ITEM_VERSION_VAR,
  PROMPTFOO_EXPECTED_OUTPUT_VAR,
} from "./constants";
import { normalizePromptfooVars } from "./promptAdapter";

export type PromptfooDatasetTest = {
  description: string;
  vars: Record<string, string>;
  datasetItem: DatasetItemDomain;
};

export class LangfuseDatasetAdapter {
  async getTests(params: {
    projectId: string;
    datasetId: string;
    datasetVersion?: Date;
    variables: string[];
    requiresExpectedOutput: boolean;
  }): Promise<PromptfooDatasetTest[]> {
    const reservedVariableConflicts =
      getPromptfooReservedPromptVariableConflicts(params.variables);
    if (reservedVariableConflicts.length > 0) {
      throw new Error(
        formatPromptfooReservedPromptVariableError(reservedVariableConflicts),
      );
    }

    const datasetItems = await getDatasetItems({
      projectId: params.projectId,
      filterState: createDatasetItemFilterState({
        datasetIds: [params.datasetId],
        status: "ACTIVE",
      }),
      version: params.datasetVersion,
      includeIO: true,
    });

    return datasetItems
      .filter(
        (item) =>
          validateDatasetItem(item.input, params.variables) &&
          (!params.requiresExpectedOutput ||
            (item.expectedOutput !== null &&
              item.expectedOutput !== undefined)),
      )
      .map((item) => {
        const normalizedInput = normalizeDatasetItemInput(
          item.input,
          params.variables,
        );
        const vars = normalizePromptfooVars(normalizedInput, params.variables);

        return {
          description: `Dataset item ${item.id}`,
          vars: {
            ...vars,
            ...(item.expectedOutput !== null &&
              item.expectedOutput !== undefined && {
                [PROMPTFOO_EXPECTED_OUTPUT_VAR]: stringifyValue(
                  item.expectedOutput,
                ),
              }),
            [PROMPTFOO_DATASET_ITEM_ID_VAR]: item.id,
            [PROMPTFOO_DATASET_ITEM_VERSION_VAR]: item.validFrom.toISOString(),
          },
          datasetItem: item,
        };
      });
  }
}
