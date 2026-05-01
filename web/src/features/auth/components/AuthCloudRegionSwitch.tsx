import { env } from "@/src/env.mjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { getAvailableCloudRegionOptions } from "@/src/features/organizations/cloudRegions";
import { useI18n } from "@/src/features/i18n";

export function CloudRegionSwitch({
  isSignUpPage,
}: {
  isSignUpPage?: boolean;
}) {
  const { t } = useI18n();
  const capture = usePostHogClientCapture();
  const { isLangfuseCloud, region: cloudRegion } = useLangfuseCloudRegion();
  const regions = getAvailableCloudRegionOptions(
    env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION ?? cloudRegion,
  );

  if (!isLangfuseCloud) return null;

  const currentRegion = regions.find((region) => region.name === cloudRegion);

  return (
    <div className="bg-card mt-8 -mb-10 rounded-lg px-6 py-6 text-sm sm:mx-auto sm:w-full sm:max-w-[480px] sm:rounded-lg sm:px-10">
      <div className="flex w-full flex-col gap-2">
        <div>
          <span className="text-sm leading-none font-medium">
            {t("auth.cloudRegion.dataRegion")}
            <DataRegionInfo />
          </span>
          {isSignUpPage && cloudRegion === "HIPAA" ? (
            <p className="text-muted-foreground text-xs">
              {t("auth.cloudRegion.demoUnavailable")}
            </p>
          ) : null}
        </div>
        <Select
          value={currentRegion?.name}
          onValueChange={(value) => {
            const region = regions.find((region) => region.name === value);
            if (!region) return;
            capture(
              "sign_in:cloud_region_switch",
              {
                region: region.name,
              },
              {
                send_instantly: true,
              },
            );
            if (region.hostname) {
              window.location.hostname = region.hostname;
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.name} value={region.name}>
                <span className="mr-2 text-xl leading-none">{region.flag}</span>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {cloudRegion === "HIPAA" && (
          <div className="bg-muted/50 text-muted-foreground mt-2 rounded-md p-3 text-xs">
            <p>
              {t("auth.cloudRegion.baaPrefix")}{" "}
              <a
                href="https://langfuse.com/security/hipaa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-accent hover:text-hover-primary-accent underline"
              >
                {t("auth.cloudRegion.hipaaLearnMore")}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const DataRegionInfo = () => {
  const { t } = useI18n();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <a
          href="#"
          className="text-primary-accent hover:text-hover-primary-accent ml-1 text-xs"
          title={t("auth.cloudRegion.whatIsThisTitle")}
          tabIndex={-1}
        >
          {t("auth.cloudRegion.whatIsThis")}
        </a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("auth.cloudRegion.dataRegions")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription className="flex flex-col gap-2">
            <p>{t("auth.cloudRegion.availableRegions")}</p>
            <ul className="list-disc pl-5">
              <li>{t("auth.cloudRegion.usRegion")}</li>
              <li>{t("auth.cloudRegion.euRegion")}</li>
              <li>{t("auth.cloudRegion.jpRegion")}</li>
              <li>{t("auth.cloudRegion.hipaaRegion")}</li>
            </ul>
            <p>{t("auth.cloudRegion.separatedDescription")}</p>
            <p>{t("auth.cloudRegion.multipleAccounts")}</p>
            <p>
              {t("auth.cloudRegion.learnMorePrefix")}{" "}
              <a
                href="https://langfuse.com/security/data-regions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-accent underline"
              >
                {t("auth.cloudRegion.dataRegionsLink")}
              </a>{" "}
              {t("common.or")}{" "}
              <a
                href="https://langfuse.com/docs/data-security-privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-accent underline"
              >
                {t("auth.cloudRegion.securityPrivacyLink")}
              </a>
              .
            </p>
          </DialogDescription>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
