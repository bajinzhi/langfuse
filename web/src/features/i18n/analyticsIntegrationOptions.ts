import { EXPORT_SOURCE_OPTIONS } from "@langfuse/shared";
import { type MessageValues } from "./format";
import { type MessageKey } from "./messages";

type Translate = (key: MessageKey, values?: MessageValues) => string;
type ExportSourceValue = (typeof EXPORT_SOURCE_OPTIONS)[number]["value"];

const exportSourceTranslationKeys: Record<
  ExportSourceValue,
  { label: MessageKey; description: MessageKey }
> = {
  TRACES_OBSERVATIONS: {
    label: "integrations.exportSource.tracesObservations.label",
    description: "integrations.exportSource.tracesObservations.description",
  },
  TRACES_OBSERVATIONS_EVENTS: {
    label: "integrations.exportSource.tracesObservationsEvents.label",
    description:
      "integrations.exportSource.tracesObservationsEvents.description",
  },
  EVENTS: {
    label: "integrations.exportSource.events.label",
    description: "integrations.exportSource.events.description",
  },
};

export function getExportSourceOptionText(
  t: Translate,
  value: ExportSourceValue,
) {
  const keys = exportSourceTranslationKeys[value];

  return {
    label: t(keys.label),
    description: t(keys.description),
  };
}
