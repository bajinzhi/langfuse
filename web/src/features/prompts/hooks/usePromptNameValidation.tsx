import { useEffect } from "react";
import { type UseFormReturn } from "react-hook-form";
import { useI18n } from "@/src/features/i18n";

interface UsePromptNameValidationProps {
  currentName: string | undefined;
  allPrompts: { value: string }[] | undefined;
  form: UseFormReturn<any>;
  errorMessage?: string;
}

export const usePromptNameValidation = ({
  currentName,
  allPrompts,
  form,
  errorMessage,
}: UsePromptNameValidationProps) => {
  const { t } = useI18n();
  const duplicateNameMessage = errorMessage ?? t("prompts.nameAlreadyExists");

  useEffect(() => {
    if (!currentName || !allPrompts) return;

    const isNewPrompt = !allPrompts
      ?.map((prompt) => prompt.value)
      .includes(currentName);

    if (!isNewPrompt) {
      form.setError("name", { message: duplicateNameMessage });
    } else {
      const currentError = form.getFieldState("name").error;
      if (
        currentError?.message === duplicateNameMessage ||
        currentError?.message === errorMessage
      ) {
        form.clearErrors("name");
      }
    }
  }, [currentName, allPrompts, form, duplicateNameMessage, errorMessage]);
};
