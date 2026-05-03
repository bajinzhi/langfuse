import { PagedSettingsContainer } from "@/src/components/PagedSettingsContainer";
import Header from "@/src/components/layouts/header";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api } from "@/src/utils/api";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/src/components/ui/form";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { useSession, signOut } from "next-auth/react";
import { SettingsDangerZone } from "@/src/components/SettingsDangerZone";
import ContainerPage from "@/src/components/layouts/container-page";
import { useRouter } from "next/router";
import { StringNoHTML } from "@langfuse/shared";
import Link from "next/link";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { env } from "@/src/env.mjs";
import {
  LanguageSwitcher,
  type MessageKey,
  useI18n,
} from "@/src/features/i18n";

type Translate = (key: MessageKey, values?: Record<string, string>) => string;

function UpdateDisplayName() {
  const { data: session, update: updateSession } = useSession();
  const utils = api.useUtils();
  const { t } = useI18n();
  const displayNameSchema = z.object({
    name: StringNoHTML.min(1, t("account.displayName.validationEmpty")).max(
      100,
      t("account.displayName.validationMax", { max: 100 }),
    ),
  });

  const form = useForm({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      name: "",
    },
  });

  const updateDisplayName = api.userAccount.updateDisplayName.useMutation({
    onSuccess: async () => {
      await updateSession();
      await utils.invalidate();
      form.reset();
      showSuccessToast({
        title: t("account.displayName.updated"),
        description: t("account.displayName.updatedDescription"),
      });
    },
    onError: (error) => form.setError("name", { message: error.message }),
  });

  function onSubmit(values: z.infer<typeof displayNameSchema>) {
    updateDisplayName.mutate({ name: values.name });
  }

  return (
    <div>
      <Header title={t("account.displayName")} />
      <Card className="p-3">
        {form.getValues().name !== "" ? (
          <p className="text-foreground mb-4 text-sm">
            {t("account.displayName.pending", {
              currentName: session?.user?.name ?? "",
              nextName: form.watch().name,
            })}
          </p>
        ) : (
          <p className="text-foreground mb-4 text-sm">
            {t("account.displayName.current", {
              name: session?.user?.name ?? "",
            })}
          </p>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={session?.user?.name ?? ""}
                      {...field}
                      className="flex-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="secondary"
              type="submit"
              loading={updateDisplayName.isPending}
              disabled={form.getValues().name === ""}
              className="mt-4"
            >
              {t("common.save")}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}

function DeleteAccountButton() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? "";
  const { t } = useI18n();

  const { data: canDeleteData } = api.userAccount.checkCanDelete.useQuery();
  const deleteAccount = api.userAccount.delete.useMutation();

  const formSchema = z.object({
    email: z.string().refine((val) => val === userEmail, {
      message: t("account.delete.validationEmail", { email: userEmail }),
    }),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const canDelete = canDeleteData?.canDelete ?? false;
  const blockingOrganizations = canDeleteData?.blockingOrganizations ?? [];

  const onSubmit = async () => {
    if (!canDelete) return;
    try {
      await deleteAccount.mutateAsync();
      showSuccessToast({
        title: t("account.delete.success"),
        description: t("account.delete.successDescription"),
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await signOut();
    } catch (error) {
      console.error(error);
      showErrorToast(
        t("account.delete.failed"),
        error instanceof Error ? error.message : t("common.unexpectedError"),
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive-secondary">
          {t("account.delete.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("account.delete.confirmTitle")}
          </DialogTitle>
          <DialogDescription>
            {!canDelete && blockingOrganizations.length > 0 ? (
              <div>
                <p className="mb-2">{t("account.delete.blockedLastOwner")}</p>
                <ul className="list-inside list-disc space-y-1">
                  {blockingOrganizations.map((org) => (
                    <li key={org.id}>
                      <Link
                        href={`/organization/${org.id}/settings`}
                        className="text-primary hover:text-primary/80 font-semibold underline"
                      >
                        {org.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2">{t("account.delete.fixOwnership")}</p>
              </div>
            ) : (
              t("account.delete.confirmEmail", { email: userEmail })
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {canDelete && (
              <DialogBody>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder={userEmail} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogBody>
            )}
            <DialogFooter>
              <Button
                type="submit"
                variant="destructive"
                loading={deleteAccount.isPending}
                disabled={!canDelete}
                className="w-full"
              >
                {t("account.delete.button")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type AccountSettingsPage = {
  title: string;
  slug: string;
  content: React.ReactNode;
  cmdKKeywords?: string[];
};

export function useAccountSettingsPages(): AccountSettingsPage[] {
  const { data: session } = useSession();
  const { t } = useI18n();
  const userEmail = session?.user?.email ?? "";

  return getAccountSettingsPages(userEmail, t);
}

const getAccountSettingsPages = (
  userEmail: string,
  t: Translate,
): AccountSettingsPage[] => [
  {
    title: t("account.general"),
    slug: "index",
    cmdKKeywords: [
      "account",
      "user",
      "profile",
      "email",
      "password",
      "name",
      "display",
      "delete",
      "remove",
    ],
    content: (
      <div className="flex flex-col gap-6">
        <div>
          <Header title={t("account.email")} />
          <Card className="p-3">
            <p className="text-foreground text-sm">
              {t("account.email.current", { email: userEmail })}
            </p>
          </Card>
        </div>
        <div>
          <Header title={t("account.language")} />
          <Card className="space-y-3 p-3">
            <p className="text-muted-foreground text-sm">
              {t("account.language.description")}
            </p>
            <LanguageSwitcher className="w-full sm:w-[220px]" />
          </Card>
        </div>
        <UpdateDisplayName />
        <div>
          <Header title={t("account.password")} />
          <Card className="p-3">
            <p className="text-foreground mb-4 text-sm">
              {t("account.password.description")}
            </p>
            <Button asChild variant="secondary">
              <Link
                href={`${env.NEXT_PUBLIC_BASE_PATH ?? ""}/auth/reset-password`}
              >
                {t("account.password.change")}
              </Link>
            </Button>
          </Card>
        </div>
        <SettingsDangerZone
          items={[
            {
              title: t("account.delete.title"),
              description: t("account.delete.description"),
              button: <DeleteAccountButton />,
            },
          ]}
        />
      </div>
    ),
  },
];

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const userEmail = session?.user?.email ?? "";

  const pages = getAccountSettingsPages(userEmail, t);

  return (
    <ContainerPage
      headerProps={{
        title: t("account.settings.title"),
      }}
    >
      <PagedSettingsContainer
        activeSlug={router.query.page as string | undefined}
        pages={pages}
      />
    </ContainerPage>
  );
}
