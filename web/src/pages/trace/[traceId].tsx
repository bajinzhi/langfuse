// Redirect helper for /trace/[traceId] URLs
// Looks up the projectId for a trace and redirects to /project/[projectId]/traces/[traceId]
// which displays the current trace view

import { ErrorPage } from "@/src/components/error-page";
import { getTracesByIdsForAnyProject } from "@langfuse/shared/src/server";
import { type GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useI18n } from "@/src/features/i18n";

export const getServerSideProps: GetServerSideProps = async (context) => {
  if (!context.params) {
    return {
      props: {
        notFound: true,
      },
    };
  }

  const traceId = context.params.traceId as string;

  const traces = await getTracesByIdsForAnyProject([traceId]);

  if (!traces || traces.length === 0) {
    return {
      props: {
        notFound: true,
      },
    };
  }

  if (traces.length > 1) {
    return {
      props: {
        duplicatesFound: true,
      },
    };
  }

  return {
    redirect: {
      destination: `/project/${traces[0].projectId}/traces/${traceId}`,
      permanent: false,
    },
  };
};

const TraceRedirectPage = ({
  notFound,
  duplicatesFound,
}: {
  notFound?: boolean;
  duplicatesFound?: boolean;
}) => {
  const { t } = useI18n();
  const router = useRouter();
  if (router.isFallback) {
    return <div className="p-3">{t("common.loadingDots")}</div>;
  }

  if (notFound) {
    return (
      <ErrorPage
        title={t("trace.redirect.notFoundTitle")}
        message={t("trace.redirect.notFoundMessage")}
        additionalButton={{
          label: t("common.retry"),
          onClick: () => void window.location.reload(),
        }}
      />
    );
  }

  if (duplicatesFound) {
    return (
      <ErrorPage
        title={t("trace.redirect.notFoundTitle")}
        message={t("trace.redirect.sdkUrlChanged")}
      />
    );
  }

  return null;
};

export default TraceRedirectPage;
