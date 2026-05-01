import {
  type ColumnDefinition,
  type SingleValueOption,
} from "@langfuse/shared";
import { type views } from "@/src/features/query/types";
import { type ViewVersion } from "@/src/features/query";
import { type z } from "zod";
import type { MessageKey, MessageValues } from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: MessageValues) => string;

type GetWidgetFilterColumnsParams = {
  t: Translate;
  selectedView: z.infer<typeof views>;
  viewVersion: ViewVersion;
  environmentOptions: SingleValueOption[];
  nameOptions: SingleValueOption[];
  tagsOptions: SingleValueOption[];
  modelOptions: SingleValueOption[];
  toolNamesOptions: SingleValueOption[];
  calledToolNamesOptions: SingleValueOption[];
  observationLevelOptions: SingleValueOption[];
};

type WidgetFilterColumnSpec = {
  column: ColumnDefinition;
  customSelect?: boolean;
};

const getWidgetFilterColumnSpecs = ({
  t,
  selectedView,
  viewVersion,
  environmentOptions,
  nameOptions,
  tagsOptions,
  modelOptions,
  toolNamesOptions,
  calledToolNamesOptions,
  observationLevelOptions,
}: GetWidgetFilterColumnsParams): WidgetFilterColumnSpec[] => {
  const filterColumns: WidgetFilterColumnSpec[] = [
    {
      column: {
        name: t("observability.columns.environment"),
        id: "environment",
        type: "stringOptions",
        options: environmentOptions,
        internal: "internalValue",
      },
      customSelect: true,
    },
    {
      column: {
        name: t("observability.columns.traceName"),
        id: "traceName",
        type: "stringOptions",
        options: nameOptions,
        internal: "internalValue",
      },
      customSelect: true,
    },
    {
      column: {
        name: t("observability.columns.observationName"),
        id: "observationName",
        type: "string",
        internal: "internalValue",
      },
    },
    {
      column: {
        name: t("observability.columns.scoreName"),
        id: "scoreName",
        type: "string",
        internal: "internalValue",
      },
    },
    {
      column: {
        name: t("observability.columns.tags"),
        id: "tags",
        type: "arrayOptions",
        options: tagsOptions,
        internal: "internalValue",
      },
      customSelect: true,
    },
    {
      column: {
        name: t("observability.columns.user"),
        id: "user",
        type: "string",
        internal: "internalValue",
      },
    },
    {
      column: {
        name: t("observability.columns.session"),
        id: "session",
        type: "string",
        internal: "internalValue",
      },
    },
    {
      column: {
        name: t("observability.columns.metadata"),
        id: "metadata",
        type: "stringObject",
        internal: "internalValue",
      },
    },
    {
      column: {
        name: t("observability.columns.version"),
        id: "version",
        type: "string",
        internal: "internalValue",
      },
    },
  ];

  if (selectedView !== "observations") {
    filterColumns.push({
      column: {
        name: t("observability.columns.release"),
        id: "release",
        type: "string",
        internal: "internalValue",
      },
    });
  }

  if (selectedView === "observations") {
    filterColumns.push(
      ...(viewVersion === "v2"
        ? [
            {
              column: {
                name: t("observability.columns.observationRelease"),
                id: "release",
                type: "string",
                internal: "internalValue",
              },
            } satisfies WidgetFilterColumnSpec,
          ]
        : []),
      {
        column: {
          name: t("observability.columns.toolNamesAvailable"),
          id: "toolNames",
          type: "arrayOptions",
          options: toolNamesOptions,
          internal: "internalValue",
        },
        customSelect: true,
      },
      {
        column: {
          name: t("observability.columns.toolNamesCalled"),
          id: "calledToolNames",
          type: "arrayOptions",
          options: calledToolNamesOptions,
          internal: "internalValue",
        },
        customSelect: true,
      },
      {
        column: {
          name: t("observability.columns.traceRelease"),
          id: "traceRelease",
          type: "string",
          internal: "internalValue",
        },
      },
      {
        column: {
          name: t("observability.columns.traceVersion"),
          id: "traceVersion",
          type: "string",
          internal: "internalValue",
        },
      },
      {
        column: {
          name: t("observability.columns.model"),
          id: "providedModelName",
          type: "stringOptions",
          options: modelOptions,
          internal: "internalValue",
        },
        customSelect: true,
      },
      {
        column: {
          name: t("observability.columns.level"),
          id: "level",
          type: "stringOptions",
          options: observationLevelOptions,
          internal: "internalValue",
        },
      },
    );
  }

  if (selectedView === "scores-categorical") {
    filterColumns.push({
      column: {
        name: t("observability.columns.scoreStringValue"),
        id: "stringValue",
        type: "string",
        internal: "internalValue",
      },
    });
  }

  if (selectedView === "scores-numeric") {
    filterColumns.push({
      column: {
        name: t("observability.columns.scoreValue"),
        id: "value",
        type: "number",
        internal: "internalValue",
      },
    });
  }

  return filterColumns;
};

export const getWidgetFilterColumns = (
  params: GetWidgetFilterColumnsParams,
): ColumnDefinition[] =>
  getWidgetFilterColumnSpecs(params).map((spec) => spec.column);

export const getWidgetColumnsWithCustomSelect = (
  params: GetWidgetFilterColumnsParams,
): string[] =>
  getWidgetFilterColumnSpecs(params)
    .filter((spec) => spec.customSelect)
    .map((spec) => spec.column.id);
