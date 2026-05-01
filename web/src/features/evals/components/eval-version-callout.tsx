import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { type EvalCapabilities } from "@/src/features/evals/hooks/useEvalCapabilities";
import {
  isTraceTarget,
  isEventTarget,
  isExperimentTarget,
  isDatasetTarget,
} from "@/src/features/evals/utils/typeHelpers";
import { useI18n, type MessageKey } from "@/src/features/i18n";

interface EvalVersionCalloutProps {
  targetObject: string;
  evalCapabilities: EvalCapabilities;
}

interface CalloutContent {
  visible: boolean;
  title: string;
  description: React.ReactNode;
}

const getCalloutContent = (
  targetObject: string,
  evalCapabilities: EvalCapabilities,
  t: (key: MessageKey) => string,
): CalloutContent => {
  const hidden = { visible: false, title: "", description: "" };

  // For event/observation target
  if (isEventTarget(targetObject)) {
    if (evalCapabilities.isNewCompatible) {
      return hidden;
    }

    return {
      visible: true,
      title: t("evals.versionCallout.verifySdk"),
      description: (
        <>
          {t("evals.versionCallout.observationsDescription")}{" "}
          <a
            href="https://langfuse.com/docs/observability/sdk/upgrade-path"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark-blue font-medium hover:opacity-80"
          >
            {t("evals.versionCallout.learnMore")}
          </a>
          .
        </>
      ),
    };
  }

  // For experiment target (Experiment Runner SDK)
  if (isExperimentTarget(targetObject)) {
    if (!evalCapabilities.isNewCompatible) {
      return {
        visible: true,
        title: t("evals.versionCallout.verifyExperimentRunner"),
        description: (
          <>
            {t("evals.versionCallout.experimentRunnerDescription")}{" "}
            <a
              href="https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk#experiment-runner-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark-blue font-medium hover:opacity-80"
            >
              {t("evals.versionCallout.learnExperimentRunner")}
            </a>
            .
          </>
        ),
      };
    }

    return hidden;
  }

  // For dataset target (legacy dataset run methods)
  if (isDatasetTarget(targetObject)) {
    return {
      visible: true,
      title: t("evals.versionCallout.legacyLowLevel"),
      description: (
        <>
          {t("evals.versionCallout.legacyLowLevelDescription")}{" "}
          <a
            href="https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk#experiment-runner-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark-blue font-medium hover:opacity-80"
          >
            {t("evals.versionCallout.learnMore")}
          </a>
          .
        </>
      ),
    };
  }

  // For trace target
  if (isTraceTarget(targetObject)) {
    return {
      visible: true,
      title: t("evals.versionCallout.considerObservation"),
      description: (
        <>
          {t("evals.versionCallout.considerObservationDescription")}{" "}
          <a
            href="https://langfuse.com/faq/all/llm-as-a-judge-migration"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark-blue font-medium hover:opacity-80"
          >
            {t("evals.versionCallout.learnMore")}
          </a>
          .
        </>
      ),
    };
  }

  return hidden;
};

export function EvalVersionCallout({
  targetObject,
  evalCapabilities,
}: EvalVersionCalloutProps) {
  const { t } = useI18n();
  const content = getCalloutContent(targetObject, evalCapabilities, t);

  if (!content.visible) {
    return null;
  }

  return (
    <Alert
      variant="default"
      className="border-dark-yellow bg-light-yellow mt-2 max-w-4xl"
    >
      <AlertTriangle className="text-dark-yellow h-4 w-4" />
      <AlertDescription>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-foreground font-medium">{content.title}</span>
            <span className="text-foreground text-sm">
              {content.description}
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
