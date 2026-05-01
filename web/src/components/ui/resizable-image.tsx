import { cn } from "@/src/utils/tailwind";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/src/components/ui/button";
import { ImageOff, Maximize2, Minimize2 } from "lucide-react";
import { api } from "@/src/utils/api";
import { Skeleton } from "@/src/components/ui/skeleton";
import { captureException } from "@sentry/nextjs";
import { useSession } from "next-auth/react";
import { buildResizableImageSrc } from "./resizable-image.utils";
import { useI18n } from "@/src/features/i18n";

/**
 * Implemented customLoader as we cannot whitelist user provided image domains
 * Security risks are taken care of by a validation in api.utilities.validateImgUrl
 * Fetching image will fail if SSL/TLS certificate is invalid or expired, will be handled by onError
 * Do not use this customLoader in production if you are not using the above mentioned security measures */
const customLoader = ({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) => buildResizableImageSrc({ src, width, quality });

const ImageErrorDisplay = ({
  src,
  displayError,
}: {
  src: string;
  displayError: string;
}) => (
  <div className="grid grid-cols-[auto_1fr] items-center gap-2">
    <span title={displayError} className="h-4 w-4">
      <ImageOff className="h-4 w-4" />
    </span>
    <Link href={src} className="truncate text-sm underline" target="_blank">
      {src}
    </Link>
  </div>
);

export const ResizableImage = ({
  src,
  alt,
  isDefaultVisible = false,
  shouldValidateImageSource = true,
}: {
  src: string;
  alt?: string;
  isDefaultVisible?: boolean;
  shouldValidateImageSource?: boolean;
}) => {
  const [isZoomedIn, setIsZoomedIn] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(isDefaultVisible);
  const session = useSession();
  const { t } = useI18n();
  const isValidImage = api.utilities.validateImgUrl.useQuery(src, {
    enabled:
      session.status === "authenticated" &&
      isImageVisible &&
      shouldValidateImageSource,
    initialData: { isValid: true },
  });

  if (session.status !== "authenticated") {
    return (
      <ImageErrorDisplay
        src={src}
        displayError={t("common.imagesNotRenderedPublic")}
      />
    );
  }

  if (isValidImage.isLoading && isImageVisible) {
    return (
      <Skeleton className="h-8 w-1/2 items-center p-2 text-xs">
        <span className="opacity-80">{t("common.loadingImage")}</span>
      </Skeleton>
    );
  }

  const displayError = t("common.cannotLoadImage", {
    reason: src.includes("http")
      ? t("common.httpImagesNotRendered")
      : t("common.invalidImageUrl"),
  });

  return (
    <div>
      {hasFetchError ? (
        <ImageErrorDisplay src={src} displayError={displayError} />
      ) : (
        <div
          className={cn(
            "group relative w-full overflow-hidden",
            isZoomedIn ? "h-1/2 w-1/2" : "h-full w-full",
          )}
        >
          {isImageVisible && isValidImage.data?.isValid ? (
            <>
              <Image
                loader={customLoader}
                src={src}
                alt={alt ?? t("common.markdownImage")}
                loading="lazy"
                width={0}
                height={0}
                title={src}
                className="h-full w-full rounded border object-contain"
                onError={(error) => {
                  setHasFetchError(true);
                  captureException(error);
                }}
              />
              <Button
                type="button"
                className="group-hover:bg-accent/30! absolute top-0 right-0 mt-1 mr-1 h-8 w-8 opacity-0 group-hover:opacity-100"
                variant="ghost"
                size="icon"
                title={t("common.toggleImageSize")}
                onClick={() => setIsZoomedIn(!isZoomedIn)}
              >
                {isZoomedIn ? (
                  <Maximize2 className="h-4 w-4"></Maximize2>
                ) : (
                  <Minimize2 className="h-4 w-4"></Minimize2>
                )}
              </Button>
            </>
          ) : (
            <div className="bg-muted/30 text-muted-foreground/60 flex w-full items-center gap-2 rounded border border-dashed p-2 text-xs">
              <Button
                title={t("common.renderImage")}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsImageVisible(!isImageVisible)}
              >
                {t("common.loadImage")}
              </Button>
              <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                <Link
                  href={src}
                  title={src}
                  className="truncate underline"
                  target="_blank"
                >
                  {src}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
