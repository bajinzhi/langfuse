import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { type ExperimentDetailsStepProps } from "@/src/features/experiments/types/stepProps";
import { StepHeader } from "@/src/features/experiments/components/shared/StepHeader";
import { useI18n } from "@/src/features/i18n";

export const ExperimentDetailsStep: React.FC<ExperimentDetailsStepProps> = ({
  formState,
}) => {
  const { t } = useI18n();
  const { form } = formState;
  return (
    <div className="space-y-6">
      <StepHeader
        title={t("experiments.details.title")}
        description={t("experiments.details.description")}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("experiments.details.experimentName")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t("experiments.details.namePlaceholder")}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("experiments.details.descriptionOptional")}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("experiments.details.descriptionPlaceholder")}
                className="min-h-[100px] w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
