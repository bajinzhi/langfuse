import { signIn } from "next-auth/react";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ErrorPageWithSentry } from "@/src/components/error-page";
import { Spinner } from "@/src/components/layouts/spinner";
import { useI18n } from "@/src/features/i18n";

export default function SSOInitiate() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for router to be ready
    if (!router.isReady) {
      return;
    }

    const provider = router.query.provider as string | undefined;

    // If provider is missing or empty, show error
    if (!provider || provider === "") {
      setError(t("auth.sso.noProvider"));
      return;
    }

    // Automatically trigger sign-in with the provider
    signIn(provider)
      .then(() => {
        // signIn will redirect automatically on success
        // No need to do anything here
      })
      .catch((error) => {
        console.error("SSO initiation error:", error);
        setError(
          error instanceof Error
            ? error.message
            : t("auth.sso.initiateFailed"),
        );
      });
  }, [router.isReady, router.query.provider, t]);

  // Show error page if sign-in failed
  if (error) {
    return (
      <>
        <Head>
          <title>{t("auth.sso.signInErrorHead")}</title>
        </Head>
        <ErrorPageWithSentry
          title={t("auth.sso.signInFailed")}
          message={error}
        />
      </>
    );
  }

  // Show loading spinner while processing
  return (
    <>
      <Head>
        <title>{t("auth.sso.signingInHead")}</title>
      </Head>
      <Spinner message={t("auth.sso.redirecting")} />
    </>
  );
}
