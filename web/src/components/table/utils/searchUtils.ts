import type { TracingSearchType } from "@langfuse/shared";

// Helper function to get the current search mode value for the radio group
export function getSearchMode(
  searchType: TracingSearchType[] | undefined,
  tableAllowsFullTextSearch = false,
): string {
  if (!searchType || !tableAllowsFullTextSearch) return "metadata";
  if (searchType.includes("content")) return "metadata_fulltext";
  if (searchType.includes("input")) return "metadata_fulltext_input";
  if (searchType.includes("output")) return "metadata_fulltext_output";
  return "metadata";
}

// Helper function to get the button label based on current search type
export function getSearchButtonLabel(
  searchType: TracingSearchType[] | undefined,
  metadataLabel?: string,
  labels?: {
    fullText: string;
    content: string;
    input: string;
    output: string;
  },
): string {
  if (!searchType) return metadataLabel ?? "IDs / Names";
  const fullTextLabel = labels?.fullText ?? "Full Text";
  if (searchType.includes("content")) {
    return `${fullTextLabel}: ${labels?.content ?? "Content"}`;
  }
  if (searchType.includes("input")) {
    return `${fullTextLabel}: ${labels?.input ?? "Input"}`;
  }
  if (searchType.includes("output")) {
    return `${fullTextLabel}: ${labels?.output ?? "Output"}`;
  }
  return metadataLabel ?? "IDs / Names";
}

// Helper function to convert search mode value to search type array
export function searchModeToType(mode: string): TracingSearchType[] {
  switch (mode) {
    case "metadata_fulltext":
      return ["id", "content"];
    case "metadata_fulltext_input":
      return ["id", "input"];
    case "metadata_fulltext_output":
      return ["id", "output"];
    default:
      return ["id"];
  }
}
