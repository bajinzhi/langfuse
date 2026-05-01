import { type ScoreData } from "./types";
import { type MessageKey } from "@/src/features/i18n";
import {
  type ScoreDataTypeType,
  type ScoreTargetTrace,
  type ScoreTarget,
  type ScoreTargetSession,
  ScoreDataTypeEnum,
} from "@langfuse/shared";

export const isNumericDataType = (dataType: ScoreDataTypeType) =>
  dataType === ScoreDataTypeEnum.NUMERIC;

export const isCategoricalDataType = (dataType: ScoreDataTypeType) =>
  dataType === ScoreDataTypeEnum.CATEGORICAL;

export const isBooleanDataType = (dataType: ScoreDataTypeType) =>
  dataType === ScoreDataTypeEnum.BOOLEAN;

export const isTextDataType = (dataType: ScoreDataTypeType) =>
  dataType === ScoreDataTypeEnum.TEXT;

export const isScoreUnsaved = (scoreId?: string | null): boolean => !scoreId;

export const toOrderedScoresList = (list: ScoreData[]): ScoreData[] =>
  list.sort((a, b) => a.key.localeCompare(b.key));

export const isTraceScore = (
  scoreTarget: ScoreTarget,
): scoreTarget is ScoreTargetTrace => scoreTarget.type === "trace";

export const isSessionScore = (
  scoreTarget: ScoreTarget,
): scoreTarget is ScoreTargetSession => scoreTarget.type === "session";

export const getAnnotateTargetKey = <Target extends ScoreTarget>(
  scoreTarget: Target,
): MessageKey => {
  let targetKey: MessageKey = "scores.target.session";
  if (isTraceScore(scoreTarget)) {
    targetKey = scoreTarget.observationId
      ? "scores.target.observation"
      : "scores.target.trace";
  }
  return targetKey;
};
