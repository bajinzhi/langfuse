import { useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ZapIcon, X, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/src/components/ui/button";
import useLocalStorage from "@/src/components/useLocalStorage";
import {
  useTopBanner,
  useTopBannerRegistration,
} from "@/src/features/top-banner";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { V4IntroDialog } from "@/src/features/events/components/V4IntroDialog";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { useI18n, type MessageKey } from "@/src/features/i18n";

const CHANGELOG_URL =
  "https://langfuse.com/changelog/2026-03-10-simplify-for-scale";
const DISMISSED_STORAGE_KEY = "v4-beta-promo-banner:v1:dismissed";
const V4_BETA_PROMO_BANNER_ID = "v4-beta-promo-banner";
const V4_BETA_PROMO_BANNER_ORDER = 25;

const PAGE_MESSAGE_KEYS: Record<string, MessageKey> = {
  "/project/[projectId]": "events.v4.promo.dashboardsAvailable",
  "/project/[projectId]/dashboards": "events.v4.promo.dashboardsAvailable",
  "/project/[projectId]/dashboards/[dashboardId]":
    "events.v4.promo.dashboardsAvailable",
  "/project/[projectId]/traces": "events.v4.promo.tracesAvailable",
  "/project/[projectId]/traces/[traceId]": "events.v4.promo.tracesAvailable",
};

export function V4PromoBanner() {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const {
    isBetaEnabled,
    canToggleV4,
    enableWithIntro,
    showIntroDialog,
    confirmIntroDialog,
    dismissIntroDialog,
    isLoading,
  } = useV4Beta();
  const capture = usePostHogClientCapture();
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const { getTopBannerOffset } = useTopBanner();
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    DISMISSED_STORAGE_KEY,
    false,
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = session.status === "authenticated";

  // Match the v4BetaToggleVisible logic from navigationFilters.ts.
  const isToggleVisible = canToggleV4 && isLangfuseCloud;
  const pageMessageKey = PAGE_MESSAGE_KEYS[router.pathname];
  const pageMessage = pageMessageKey ? t(pageMessageKey) : undefined;

  const isVisible =
    isAuthenticated &&
    !isBetaEnabled &&
    !isDismissed &&
    isToggleVisible &&
    !!pageMessage;

  const topOffset = getTopBannerOffset(V4_BETA_PROMO_BANNER_ORDER);

  useTopBannerRegistration({
    bannerId: V4_BETA_PROMO_BANNER_ID,
    order: V4_BETA_PROMO_BANNER_ORDER,
    isVisible,
    elementRef: bannerRef,
  });

  if (!isVisible) {
    return (
      <V4IntroDialog
        open={showIntroDialog}
        onConfirm={confirmIntroDialog}
        onDismiss={dismissIntroDialog}
      />
    );
  }

  return (
    <div
      ref={bannerRef}
      className="bg-light-blue text-foreground fixed right-0 left-0 z-50 border-b"
      style={{ top: `${topOffset}px` }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 py-1.5 pl-3">
        <ZapIcon className="h-4 w-4 shrink-0" />
        <p
          className="flex flex-1 gap-1 overflow-hidden text-sm"
          title={
            pageMessage
              ? t("events.v4.promo.title", { pageMessage })
              : undefined
          }
        >
          <span className="truncate">
            <span className="hidden font-semibold md:inline">
              {pageMessage}
            </span>{" "}
            {t("events.v4.promo.enableThe")}{" "}
            <button
              className="inline cursor-pointer font-semibold underline underline-offset-2"
              onClick={() => {
                enableWithIntro({
                  onSuccess: () => {
                    capture("sidebar:v4_beta_toggled", { enabled: true });
                  },
                });
              }}
              disabled={isLoading}
            >
              {t("events.v4.fastPreview")}
            </button>{" "}
            {t("events.v4.promo.toggleSuffix")}{" "}
          </span>

          <Link
            href={CHANGELOG_URL}
            target="_blank"
            className="flex flex-row items-center gap-1 whitespace-nowrap underline underline-offset-2"
          >
            {t("events.v4.learnMore")}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0"
          onClick={() => setIsDismissed(true)}
          aria-label={t("events.v4.dismissBanner")}
          title={t("events.v4.dismiss")}
        >
          <X className="h-4 w-4 shrink-0" />
        </Button>
      </div>
      <V4IntroDialog
        open={showIntroDialog}
        onConfirm={confirmIntroDialog}
        onDismiss={dismissIntroDialog}
      />
    </div>
  );
}
