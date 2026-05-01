/**
 * TraceSearchList - Search results view
 *
 * Displays filtered list of observations based on search query.
 * Uses VirtualizedList for performance with large result sets.
 * Filtering is co-located to avoid unnecessary re-renders.
 */

import { useMemo } from "react";
import { useTraceData } from "../contexts/TraceDataContext";
import { useSearch } from "../contexts/SearchContext";
import { useSelection } from "../contexts/SelectionContext";
import { useHandlePrefetchObservation } from "../hooks/useHandlePrefetchObservation";
import { VirtualizedList } from "./_shared/VirtualizedList";
import { TraceSearchListItem } from "./TraceSearchListItem";
import { Button } from "@/src/components/ui/button";
import { XIcon } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

export function TraceSearchList() {
  const { t } = useI18n();
  const { searchItems } = useTraceData();
  const { searchQuery, setSearchInputValue } = useSearch();
  const { selectedNodeId, setSelectedNodeId } = useSelection();
  const { handleHover } = useHandlePrefetchObservation();

  // Co-located filtering - only this component re-renders on search query change
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return searchItems.filter((item) => {
      const node = item.node;
      return (
        node.type.toLowerCase().includes(query) ||
        node.name.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
      );
    });
  }, [searchItems, searchQuery]);

  // Empty state
  if (searchResults.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <p className="text-muted-foreground">{t("commandMenu.noResults")}</p>
          <p className="text-muted-foreground text-sm">
            {t("trace.searchHint")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchInputValue("")}
          >
            <XIcon className="mr-2 h-4 w-4" />
            {t("trace.clearSearch")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <VirtualizedList
      items={searchResults}
      selectedItemId={selectedNodeId}
      onSelectItem={setSelectedNodeId}
      getItemId={(item) => item.node.id}
      estimatedItemSize={48}
      overscan={500}
      renderItem={({ item, isSelected, onSelect }) => (
        <TraceSearchListItem
          item={item}
          isSelected={isSelected}
          onSelect={onSelect}
          onHover={() => handleHover(item.node)}
        />
      )}
    />
  );
}
