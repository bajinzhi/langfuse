import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Head from "next/head";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { LangfuseIcon } from "@/src/components/LangfuseLogo";
import { useSession } from "next-auth/react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/src/utils/api";
import { useRouter } from "next/router";
import { RequestResetPasswordEmailButton } from "@/src/features/auth-credentials/components/ResetPasswordButton";
import { TRPCClientError } from "@trpc/client";
import { isEmailVerifiedWithinCutoff } from "@/src/features/auth-credentials/lib/credentialsUtils";
import Link from "next/link";
import { ErrorPage } from "@/src/components/error-page";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { passwordSchema } from "@/src/features/auth/lib/signupSchema";
import { useI18n } from "@/src/features/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

const getResetPasswordSchema = (t: Translate) =>
  z
    .object({
      email: z.email(),
      password: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.password.noMatch"),
      path: ["confirmPassword"],
    });

type ResetPasswordForm = z.infer<ReturnType<typeof getResetPasswordSchema>>;

export function ResetPasswordPage({
  passwordResetAvailable,
}: {
  passwordResetAvailable: boolean;
}) {
  const session = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const resetPasswordSchema = useMemo(() => getResetPasswordSchema(t), [t]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showResetPasswordEmailButton, setShowResetPasswordEmailButton] =
    useState(false);

  const capture = usePostHogClientCapture();

  const mutResetPassword = api.credentials.resetPassword.useMutation();
  const emailVerified = isEmailVerifiedWithinCutoff(
    session.data?.user?.emailVerified,
  );

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: session.data?.user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordForm) {
    setFormError(null);
    setShowResetPasswordEmailButton(false);
    setIsSuccess(false);
    capture("auth:update_password_form_submit");
    await mutResetPassword
      .mutateAsync({ password: values.password })
      .then(() => {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/");
          setIsSuccess(false);
        }, 2000);
      })
      .catch((error) => {
        console.log(error.message);
        if (error instanceof TRPCClientError) {
          if (error.data?.code === "UNAUTHORIZED") {
            setShowResetPasswordEmailButton(true);
          }
          setFormError(error.message);
        } else {
          console.error(error);
          setFormError(t("common.unexpectedError"));
        }
      });
  }

  if (!passwordResetAvailable)
    return (
      <ErrorPage
        title={t("auth.password.resetUnavailableTitle")}
        message={t("auth.password.resetUnavailable")}
        additionalButton={{
          label: t("auth.password.setupInstructions"),
          href: "https://langfuse.com/self-hosting/security/authentication-and-sso#auth-email-password",
        }}
      />
    );

  return (
    <>
      <Head>
        <title>{`${t("auth.password.reset.title")} | Langfuse`}</title>
      </Head>
      <div className="flex flex-1 flex-col py-6 sm:min-h-full sm:justify-center sm:px-6 sm:py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/">
            <LangfuseIcon className="mx-auto" />
          </Link>
          <h2 className="text-foreground mt-4 text-center text-2xl leading-9 font-bold tracking-tight">
            {t("auth.password.reset.title")}
          </h2>
          {session.status !== "authenticated" && (
            <div className="mt-2 flex justify-center">
              <Button asChild variant="ghost">
                <Link href="/auth/sign-in">
                  <ArrowLeft className="mr-2 h-3 w-3" />
                  {t("auth.backToSignIn")}
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="bg-background mt-10 px-6 py-10 shadow-sm sm:mx-auto sm:w-full sm:max-w-[480px] sm:rounded-lg sm:px-12">
          <div className="space-y-6">
            <Form {...form}>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.email")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="jsdoe@example.com"
                            disabled={session.status === "authenticated"}
                            allowPasswordManager
                            autoComplete="email"
                            {...field}
                          />
                          {emailVerified.verified && (
                            <span title={t("auth.emailVerified")}>
                              <ShieldCheck className="text-muted-green absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 transform" />
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {emailVerified.verified && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password.new")}</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password.confirmNew")}</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <div className="pt-4">
                  {emailVerified.verified ? (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={mutResetPassword.isPending}
                      loading={mutResetPassword.isPending}
                      variant={
                        showResetPasswordEmailButton ? "secondary" : "default"
                      }
                    >
                      {t("auth.password.update")}
                    </Button>
                  ) : (
                    <RequestResetPasswordEmailButton
                      email={form.watch("email")}
                      className="w-full"
                    />
                  )}
                </div>
              </form>
            </Form>
            {formError ? (
              <div className="text-destructive text-center text-sm font-medium">
                {formError}
              </div>
            ) : null}
            {isSuccess && (
              <div className="text-center text-sm font-medium">
                {t("auth.password.success")}
              </div>
            )}
            {showResetPasswordEmailButton && (
              <RequestResetPasswordEmailButton
                email={form.getValues("email")}
                className="w-full"
              />
            )}
          </div>
        </div>
        {session.status !== "authenticated" && (
          <div className="text-muted-foreground mx-auto mt-10 max-w-lg text-center text-xs">
            {t("auth.password.resetHelpBeforeLink")}
            <Link href="/auth/sign-in" className="underline">
              {t("auth.password.resetHelpLink")}
            </Link>
            {t("auth.password.resetHelpAfterLink")}
          </div>
        )}
      </div>
    </>
  );
}
