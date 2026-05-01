import Header from "@/src/components/layouts/header";
import ModelTable from "@/src/components/table/use-cases/models";
import { useI18n } from "@/src/features/i18n";

export function ModelsSettings(props: { projectId: string }) {
  const { t } = useI18n();

  return (
    <>
      <Header title={t("models.title")} />
      <p className="mb-2 text-sm">{t("models.helpDescription")}</p>
      <ModelTable projectId={props.projectId} />
    </>
  );
}
