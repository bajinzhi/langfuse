import { Button } from "@/src/components/ui/button";
import { useEffect } from "react";
import type * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { api } from "@/src/utils/api";
import { useSession } from "next-auth/react";
import { organizationFormSchema } from "@/src/features/organizations/utils/organizationNameSchema";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { SurveyName } from "@prisma/client";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { useI18n } from "@/src/features/i18n";

export const NewOrganizationForm = ({
  onSuccess,
}: {
  onSuccess: (orgId: string) => void | Promise<void>;
}) => {
  const { t } = useI18n();
  const { update: updateSession } = useSession();

  const form = useForm({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      type: "Personal",
      size: undefined,
    },
  });
  const capture = usePostHogClientCapture();
  const createOrgMutation = api.organizations.create.useMutation({
    onError: (error) => form.setError("name", { message: error.message }),
  });
  const createSurveyMutation = api.surveys.create.useMutation();
  const watchedType = form.watch("type");
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const typeLabels: Record<string, string> = {
    Personal: t("organizations.type.personal"),
    Educational: t("organizations.type.educational"),
    Company: t("organizations.type.company"),
    Startup: t("organizations.type.startup"),
    Agency: t("organizations.type.agency"),
    "N/A": t("organizations.type.na"),
  };
  const watchedTypeLabel = typeLabels[watchedType] ?? watchedType;

  function onSubmit(values: z.infer<typeof organizationFormSchema>) {
    capture("organizations:new_form_submit");
    createOrgMutation
      .mutateAsync({
        name: values.name,
      })
      .then(async (org) => {
        // Submit survey with organization data only on Cloud and if type is provided
        if (isLangfuseCloud && values.type) {
          const surveyResponse: Record<string, string> = {
            type: values.type,
          };
          if (values.size) {
            surveyResponse.size = values.size;
          }

          try {
            await createSurveyMutation.mutateAsync({
              surveyName: SurveyName.ORG_ONBOARDING,
              response: surveyResponse,
              orgId: org.id,
            });
          } catch (error) {
            console.error("Failed to submit survey:", error);
            // Continue with organization creation even if survey fails
          }
        }

        // the setup (next step) resolves the current org from session state,
        // so we refresh it, so that the UI doesn't render stale state.
        // for example, it could otherwise show the v4 enable toggle.
        await updateSession();
        await onSuccess(org.id);
        form.reset();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  // Clear size whenever type is not Company or Agency to avoid submitting hidden values
  useEffect(() => {
    if (watchedType !== "Company" && watchedType !== "Agency") {
      form.setValue("size", undefined);
    }
  }, [watchedType, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
        data-testid="new-org-form"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void form.handleSubmit(onSubmit)();
          }
        }}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("organizations.name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="my-org"
                  {...field}
                  data-testid="new-org-name-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isLangfuseCloud && (
          <>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("organizations.type")}</FormLabel>
                  <FormDescription>
                    {t("organizations.type.description")}
                  </FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger ref={field.ref}>
                        <SelectValue
                          placeholder={t("organizations.typePlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Personal">
                        {t("organizations.type.personal")}
                      </SelectItem>
                      <SelectItem value="Educational">
                        {t("organizations.type.educational")}
                      </SelectItem>
                      <SelectItem value="Company">
                        {t("organizations.type.company")}
                      </SelectItem>
                      <SelectItem value="Startup">
                        {t("organizations.type.startup")}
                      </SelectItem>
                      <SelectItem value="Agency">
                        {t("organizations.type.agency")}
                      </SelectItem>
                      <SelectItem value="N/A">
                        {t("organizations.type.na")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(watchedType === "Company" || watchedType === "Agency") && (
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("organizations.size", { type: watchedTypeLabel })}
                    </FormLabel>
                    <FormDescription>
                      {t("organizations.sizeDescription", {
                        type: watchedTypeLabel,
                      })}
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
                          <SelectValue
                            placeholder={t("organizations.typePlaceholder")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="10-49">10-49</SelectItem>
                        <SelectItem value="50-99">50-99</SelectItem>
                        <SelectItem value="100-299">100-299</SelectItem>
                        <SelectItem value="More than 300">
                          {t("organizations.size.moreThan300")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
        <Button type="submit" loading={createOrgMutation.isPending}>
          {t("organizations.create")}
        </Button>
      </form>
    </Form>
  );
};
