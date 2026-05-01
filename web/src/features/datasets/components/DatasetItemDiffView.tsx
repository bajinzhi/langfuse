import type { DatasetItemDomain } from "@langfuse/shared";
import DiffViewer from "@/src/components/DiffViewer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/components/ui/accordion";
import { stringifyDatasetItemData } from "../utils/datasetItemUtils";
import { useI18n } from "@/src/features/i18n";

type DatasetItemDiffViewProps = {
  selectedVersion: DatasetItemDomain;
  latestVersion: DatasetItemDomain;
};

export const DatasetItemDiffView = ({
  selectedVersion,
  latestVersion,
}: DatasetItemDiffViewProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={["input", "output"]}
        className="w-full"
      >
        <AccordionItem value="input">
          <AccordionTrigger>{t("datasets.input")}</AccordionTrigger>
          <AccordionContent>
            <DiffViewer
              oldString={stringifyDatasetItemData(selectedVersion.input)}
              newString={stringifyDatasetItemData(latestVersion.input)}
              oldLabel={t("datasets.selectedVersion")}
              newLabel={t("datasets.latestVersion")}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="output">
          <AccordionTrigger>{t("datasets.expectedOutput")}</AccordionTrigger>
          <AccordionContent>
            <DiffViewer
              oldString={stringifyDatasetItemData(
                selectedVersion.expectedOutput,
              )}
              newString={stringifyDatasetItemData(latestVersion.expectedOutput)}
              oldLabel={t("datasets.selectedVersion")}
              newLabel={t("datasets.latestVersion")}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="metadata">
          <AccordionTrigger>{t("datasets.metadata")}</AccordionTrigger>
          <AccordionContent>
            <DiffViewer
              oldString={stringifyDatasetItemData(selectedVersion.metadata)}
              newString={stringifyDatasetItemData(latestVersion.metadata)}
              oldLabel={t("datasets.selectedVersion")}
              newLabel={t("datasets.latestVersion")}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
