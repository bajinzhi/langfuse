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

const PROMPTFOO_DATASET_ITEM_PAGE_SIZE = 100;

function isValidPromptfooDatasetItem(params: {
  item: DatasetItemDomain;
  variables: string[];
  requiresExpectedOutput: boolean;
}) {
  return (
    validateDatasetItem(params.item.input, params.variables) &&
    (!params.requiresExpectedOutput ||
      (params.item.expectedOutput !== null &&
        params.item.expectedOutput !== undefined))
  );
}

function toPromptfooDatasetTest(params: {
  item: DatasetItemDomain;
  variables: string[];
}): PromptfooDatasetTest {
  const normalizedInput = normalizeDatasetItemInput(
    params.item.input,
    params.variables,
  );
  const vars = normalizePromptfooVars(normalizedInput, params.variables);

  return {
    description: `Dataset item ${params.item.id}`,
    vars: {
      ...vars,
      ...(params.item.expectedOutput !== null &&
        params.item.expectedOutput !== undefined && {
          [PROMPTFOO_EXPECTED_OUTPUT_VAR]: stringifyValue(
            params.item.expectedOutput,
          ),
        }),
      [PROMPTFOO_DATASET_ITEM_ID_VAR]: params.item.id,
      [PROMPTFOO_DATASET_ITEM_VERSION_VAR]: params.item.validFrom.toISOString(),
    },
    datasetItem: params.item,
  };
}

export class LangfuseDatasetAdapter {
  async getTests(params: {
    projectId: string;
    datasetId: string;
    datasetVersion?: Date;
    variables: string[];
    requiresExpectedOutput: boolean;
    maxTests?: number;
  }): Promise<PromptfooDatasetTest[]> {
    const reservedVariableConflicts =
      getPromptfooReservedPromptVariableConflicts(params.variables);
    if (reservedVariableConflicts.length > 0) {
      throw new Error(
        formatPromptfooReservedPromptVariableError(reservedVariableConflicts),
      );
    }

    const tests: PromptfooDatasetTest[] = [];
    const seenDatasetItemIds = new Set<string>();
    const filterState = createDatasetItemFilterState({
      datasetIds: [params.datasetId],
      status: "ACTIVE",
    });

    for (let page = 0; ; page += 1) {
      const datasetItems = await getDatasetItems({
        projectId: params.projectId,
        filterState,
        version: params.datasetVersion,
        includeIO: true,
        limit: PROMPTFOO_DATASET_ITEM_PAGE_SIZE,
        page,
      });

      if (datasetItems.length === 0) {
        break;
      }

      for (const item of datasetItems) {
        if (seenDatasetItemIds.has(item.id)) {
          continue;
        }
        seenDatasetItemIds.add(item.id);

        if (
          isValidPromptfooDatasetItem({
            item,
            variables: params.variables,
            requiresExpectedOutput: params.requiresExpectedOutput,
          })
        ) {
          tests.push(
            toPromptfooDatasetTest({
              item,
              variables: params.variables,
            }),
          );
        }

        if (params.maxTests !== undefined && tests.length > params.maxTests) {
          return tests;
        }
      }
    }

    return tests;
  }
}
