import { DatasetItemDiffView } from "./DatasetItemDiffView";
import type { DatasetItemDomain } from "@langfuse/shared";
import {
  stringifyDatasetItemData,
  type DatasetSchema,
} from "../utils/datasetItemUtils";
import { DatasetItemFields } from "@/src/features/datasets/components/DatasetItemFields";
import { translateClientMessage } from "@/src/features/i18n";

type DatasetItemVersionedContentProps = {
  itemAtVersion: DatasetItemDomain | null;
  latestItem: DatasetItemDomain | null;
  isLoadingVersioned: boolean;
  isLoadingLatest: boolean;
  showDiffMode: boolean;
  itemChangedAtVersion: boolean;
  dataset: DatasetSchema | null;
};

/**
 * Renders a dataset item at a specific historical version.
 * Supports diff view comparison with the latest version.
 * Handles loading states and cases where item doesn't exist at that version.
 */
export const DatasetItemVersionedContent = ({
  itemAtVersion,
  latestItem,
  isLoadingVersioned,
  isLoadingLatest,
  showDiffMode,
  itemChangedAtVersion,
  dataset,
}: DatasetItemVersionedContentProps) => {
  // Loading states
  if (isLoadingVersioned) {
    return (
      <div className="text-muted-foreground text-sm">
        {translateClientMessage("datasets.loading")}
      </div>
    );
  }

  // Item doesn't exist at this version
  if (itemAtVersion === null) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">
            {translateClientMessage("datasets.itemDoesNotExistAtVersion")}
          </p>
          <p className="mt-2 text-sm">
            {translateClientMessage(
              "datasets.itemDoesNotExistAtVersionDescription",
            )}
          </p>
        </div>
      </div>
    );
  }

  // Show diff mode if enabled and item changed at this version
  if (showDiffMode && itemChangedAtVersion) {
    if (isLoadingLatest) {
      return (
        <div className="text-muted-foreground text-sm">
          {translateClientMessage("datasets.loading")}
        </div>
      );
    }

    // Can't show diff if latest doesn't exist
    if (latestItem === null) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">
              {translateClientMessage("datasets.cannotShowDiff")}
            </p>
            <p className="mt-2 text-sm">
              {translateClientMessage("datasets.cannotShowDiffDescription")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <DatasetItemDiffView
        selectedVersion={itemAtVersion}
        latestVersion={latestItem}
      />
    );
  }

  // Show normal view of selected version
  return (
    <DatasetItemFields
      inputValue={stringifyDatasetItemData(itemAtVersion.input)}
      expectedOutputValue={stringifyDatasetItemData(
        itemAtVersion.expectedOutput,
      )}
      metadataValue={stringifyDatasetItemData(itemAtVersion.metadata)}
      dataset={dataset}
      editable={false}
    />
  );
};
