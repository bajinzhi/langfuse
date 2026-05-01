import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { Info } from "lucide-react";
import { useI18n } from "@/src/features/i18n";

interface SamplingMetadata {
  samplingRate: number;
  preflightEstimates?: {
    score1Count: number;
    score2Count: number;
    estimatedMatchedCount: number;
  };
  adaptiveFinal?: {
    usedFinal: boolean;
    reason: string;
  };
}

interface SamplingDetailsHoverCardProps {
  samplingMetadata: SamplingMetadata;
  mode?: "single" | "two";
  showLabel?: boolean;
}

export function SamplingDetailsHoverCard({
  samplingMetadata,
  mode = "two",
  showLabel = false,
}: SamplingDetailsHoverCardProps) {
  const { t } = useI18n();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className={
            showLabel
              ? "text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
              : "hover:bg-muted-foreground/10 inline-flex h-4 w-4 items-center justify-center rounded-full"
          }
          aria-label={t("scoreAnalytics.viewSamplingDetails")}
        >
          {showLabel && <span>{t("scoreAnalytics.sampledData")}</span>}
          <Info
            className={showLabel ? "h-3 w-3" : "text-muted-foreground h-3 w-3"}
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              {mode === "single"
                ? t("scoreAnalytics.estimatedScoreCount")
                : t("scoreAnalytics.estimatedScores")}
            </h4>
            <dl className="space-y-1 text-sm">
              {mode === "single" ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("scoreAnalytics.totalScores")}
                  </dt>
                  <dd className="font-medium">
                    ~
                    {samplingMetadata.preflightEstimates?.score1Count.toLocaleString()}
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {t("scoreAnalytics.score1")}
                    </dt>
                    <dd className="font-medium">
                      ~
                      {samplingMetadata.preflightEstimates?.score1Count.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {t("scoreAnalytics.score2")}
                    </dt>
                    <dd className="font-medium">
                      ~
                      {samplingMetadata.preflightEstimates?.score2Count.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {t("scoreAnalytics.estimatedMatches")}
                    </dt>
                    <dd className="font-medium">
                      ~
                      {samplingMetadata.preflightEstimates?.estimatedMatchedCount.toLocaleString()}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">
              {t("scoreAnalytics.queryOptimizations")}
            </h4>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("scoreAnalytics.sampling")}
                </dt>
                <dd className="font-medium">
                  {(samplingMetadata.samplingRate * 100).toFixed(1)}%
                  (hash-based)
                </dd>
              </div>
              {samplingMetadata.adaptiveFinal && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("scoreAnalytics.deduplication")}
                  </dt>
                  <dd className="font-medium">
                    {samplingMetadata.adaptiveFinal.usedFinal
                      ? t("scoreAnalytics.enabled")
                      : t("scoreAnalytics.skippedForPerformance")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <p className="text-muted-foreground text-xs">
            {t("scoreAnalytics.hashSamplingDescription")}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
