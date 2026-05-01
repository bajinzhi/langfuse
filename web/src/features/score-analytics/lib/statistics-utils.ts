/**
 * Statistical calculation utilities for score comparison analytics
 * Provides functions for calculating Cohen's Kappa, F1 Score, Overall Agreement,
 * and interpretation functions for various statistical metrics.
 */
import { translateClientMessage } from "@/src/features/i18n";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConfusionMatrixRow {
  rowCategory: string;
  colCategory: string;
  count: number;
}

export interface InterpretationResult {
  strength: string;
  color: string;
  description: string;
}

type MessageKey = Parameters<typeof translateClientMessage>[0];
type MessageValues = Parameters<typeof translateClientMessage>[1];

const t = translateClientMessage;

function getDirection(value: number): string {
  if (value > 0) return t("scoreAnalytics.interpretation.direction.positive");
  if (value < 0) return t("scoreAnalytics.interpretation.direction.negative");
  return t("scoreAnalytics.interpretation.direction.none");
}

function makeInterpretation(
  strengthKey: MessageKey,
  color: string,
  descriptionKey: MessageKey,
  values?: MessageValues,
): InterpretationResult {
  return {
    strength: t(strengthKey),
    color,
    description: t(descriptionKey, values),
  };
}

// ============================================================================
// Categorical Statistics Calculations
// ============================================================================

/**
 * Calculate Cohen's Kappa for inter-rater agreement
 * Cohen's Kappa measures agreement between two raters while accounting for
 * chance agreement. Range: [-1, 1] where 1 = perfect agreement.
 *
 * Formula: κ = (Po - Pe) / (1 - Pe)
 * Where Po = observed agreement, Pe = expected agreement by chance
 *
 * @param confusionMatrix - Array of confusion matrix cells
 * @returns Cohen's Kappa coefficient or null if calculation not possible
 */
export function calculateCohensKappa(
  confusionMatrix: ConfusionMatrixRow[],
): number | null {
  if (!confusionMatrix || confusionMatrix.length === 0) {
    return null;
  }

  // Calculate total count
  const total = confusionMatrix.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return null;
  }

  // Build set of all categories
  const categories = Array.from(
    new Set([
      ...confusionMatrix.map((r) => r.rowCategory),
      ...confusionMatrix.map((r) => r.colCategory),
    ]),
  ).sort();

  // Calculate observed agreement (Po)
  const observedAgreement =
    confusionMatrix
      .filter((r) => r.rowCategory === r.colCategory)
      .reduce((sum, r) => sum + r.count, 0) / total;

  // Calculate marginal totals for expected agreement
  const score1Totals: Record<string, number> = {};
  const score2Totals: Record<string, number> = {};

  confusionMatrix.forEach((r) => {
    score1Totals[r.rowCategory] = (score1Totals[r.rowCategory] || 0) + r.count;
    score2Totals[r.colCategory] = (score2Totals[r.colCategory] || 0) + r.count;
  });

  // Calculate expected agreement (Pe)
  const expectedAgreement = categories.reduce((sum, cat) => {
    const p1 = (score1Totals[cat] || 0) / total;
    const p2 = (score2Totals[cat] || 0) / total;
    return sum + p1 * p2;
  }, 0);

  // Calculate Kappa
  const denominator = 1 - expectedAgreement;
  if (Math.abs(denominator) < 1e-10) {
    // Perfect expected agreement - return 1 if observed is also perfect
    return observedAgreement === 1 ? 1 : null;
  }

  const kappa = (observedAgreement - expectedAgreement) / denominator;

  // Round to 3 decimal places
  return Math.round(kappa * 1000) / 1000;
}

/**
 * Calculate weighted F1 score for multi-class classification
 * F1 is the harmonic mean of precision and recall, weighted by support.
 * Range: [0, 1] where 1 = perfect classification.
 *
 * @param confusionMatrix - Array of confusion matrix cells
 * @returns Weighted F1 score or null if calculation not possible
 */
export function calculateWeightedF1Score(
  confusionMatrix: ConfusionMatrixRow[],
): number | null {
  if (!confusionMatrix || confusionMatrix.length === 0) {
    return null;
  }

  const total = confusionMatrix.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return null;
  }

  // Get all unique categories
  const categories = Array.from(
    new Set(confusionMatrix.flatMap((r) => [r.rowCategory, r.colCategory])),
  ).sort();

  // Calculate F1 score for each category
  const f1Scores = categories.map((cat) => {
    // True Positives: both scores match this category
    const tp =
      confusionMatrix.find(
        (r) => r.rowCategory === cat && r.colCategory === cat,
      )?.count || 0;

    // False Positives: score2 is this category but score1 is not
    const fp = confusionMatrix
      .filter((r) => r.colCategory === cat && r.rowCategory !== cat)
      .reduce((sum, r) => sum + r.count, 0);

    // False Negatives: score1 is this category but score2 is not
    const fn = confusionMatrix
      .filter((r) => r.rowCategory === cat && r.colCategory !== cat)
      .reduce((sum, r) => sum + r.count, 0);

    // Calculate precision and recall
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

    // Calculate F1 score
    const f1 =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    // Support is the number of actual instances of this category
    const support = tp + fn;

    return { f1, support };
  });

  // Calculate weighted average F1 score
  const weightedF1 =
    f1Scores.reduce((sum, { f1, support }) => sum + f1 * support, 0) / total;

  // Round to 3 decimal places
  return Math.round(weightedF1 * 1000) / 1000;
}

/**
 * Calculate overall agreement (simple accuracy)
 * This is the percentage of cases where both scores agree.
 * Range: [0, 1] where 1 = 100% agreement.
 *
 * @param confusionMatrix - Array of confusion matrix cells
 * @returns Overall agreement percentage or null if calculation not possible
 */
export function calculateOverallAgreement(
  confusionMatrix: ConfusionMatrixRow[],
): number | null {
  if (!confusionMatrix || confusionMatrix.length === 0) {
    return null;
  }

  const total = confusionMatrix.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return null;
  }

  // Sum diagonal (matching categories)
  const matching = confusionMatrix
    .filter((r) => r.rowCategory === r.colCategory)
    .reduce((sum, r) => sum + r.count, 0);

  const agreement = matching / total;

  // Round to 3 decimal places
  return Math.round(agreement * 1000) / 1000;
}

// ============================================================================
// Interpretation Functions
// ============================================================================

/**
 * Interpret Pearson correlation coefficient
 * Reference: Cohen, J. (1988). Statistical power analysis for the behavioral sciences.
 *
 * @param r - Pearson correlation coefficient
 * @returns Interpretation with strength, color, and description
 */
export function interpretPearsonCorrelation(
  r: number | null,
): InterpretationResult {
  if (r === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  const abs = Math.abs(r);
  const direction = getDirection(r);

  if (abs >= 0.9) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.veryStrong",
      "green",
      "scoreAnalytics.interpretation.linear.veryStrong",
      { direction },
    );
  }
  if (abs >= 0.7) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.strong",
      "blue",
      "scoreAnalytics.interpretation.linear.strong",
      { direction },
    );
  }
  if (abs >= 0.5) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.moderate",
      "yellow",
      "scoreAnalytics.interpretation.linear.moderate",
      { direction },
    );
  }
  if (abs >= 0.3) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.weak",
      "orange",
      "scoreAnalytics.interpretation.linear.weak",
      { direction },
    );
  }
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.veryWeak",
    "red",
    "scoreAnalytics.interpretation.linear.veryWeak",
  );
}

/**
 * Interpret Spearman rank correlation coefficient
 * Similar interpretation to Pearson but for monotonic relationships
 *
 * @param rho - Spearman's rho coefficient
 * @returns Interpretation with strength, color, and description
 */
export function interpretSpearmanCorrelation(
  rho: number | null,
): InterpretationResult {
  if (rho === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  const abs = Math.abs(rho);
  const direction = getDirection(rho);

  if (abs >= 0.9) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.veryStrong",
      "green",
      "scoreAnalytics.interpretation.monotonic.veryStrong",
      { direction },
    );
  }
  if (abs >= 0.7) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.strong",
      "blue",
      "scoreAnalytics.interpretation.monotonic.strong",
      { direction },
    );
  }
  if (abs >= 0.5) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.moderate",
      "yellow",
      "scoreAnalytics.interpretation.monotonic.moderate",
      { direction },
    );
  }
  if (abs >= 0.3) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.weak",
      "orange",
      "scoreAnalytics.interpretation.monotonic.weak",
      { direction },
    );
  }
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.veryWeak",
    "red",
    "scoreAnalytics.interpretation.monotonic.veryWeak",
  );
}

/**
 * Interpret Cohen's Kappa coefficient
 * Reference: Landis, J. R., & Koch, G. G. (1977). The measurement of observer
 * agreement for categorical data. Biometrics, 159-174.
 *
 * @param kappa - Cohen's Kappa coefficient
 * @returns Interpretation with strength, color, and description
 */
export function interpretCohensKappa(
  kappa: number | null,
): InterpretationResult {
  if (kappa === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  if (kappa >= 1.0) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.perfect",
      "green",
      "scoreAnalytics.interpretation.kappa.perfect",
    );
  }
  if (kappa >= 0.81) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.almostPerfect",
      "green",
      "scoreAnalytics.interpretation.kappa.almostPerfect",
    );
  }
  if (kappa >= 0.61) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.substantial",
      "blue",
      "scoreAnalytics.interpretation.kappa.substantial",
    );
  }
  if (kappa >= 0.41) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.moderate",
      "yellow",
      "scoreAnalytics.interpretation.kappa.moderate",
    );
  }
  if (kappa >= 0.21) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.fair",
      "orange",
      "scoreAnalytics.interpretation.kappa.fair",
    );
  }
  if (kappa > 0) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.slight",
      "red",
      "scoreAnalytics.interpretation.kappa.slight",
    );
  }
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.poor",
    "red",
    "scoreAnalytics.interpretation.kappa.poor",
  );
}

/**
 * Interpret F1 score
 * Common thresholds for classification performance
 *
 * @param f1 - F1 score
 * @returns Interpretation with strength, color, and description
 */
export function interpretF1Score(f1: number | null): InterpretationResult {
  if (f1 === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  if (f1 >= 0.9) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.excellent",
      "green",
      "scoreAnalytics.interpretation.classification.excellent",
    );
  }
  if (f1 >= 0.8) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.good",
      "blue",
      "scoreAnalytics.interpretation.classification.good",
    );
  }
  if (f1 >= 0.6) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.fair",
      "yellow",
      "scoreAnalytics.interpretation.classification.fair",
    );
  }
  if (f1 >= 0.4) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.poor",
      "orange",
      "scoreAnalytics.interpretation.classification.poor",
    );
  }
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.veryPoor",
    "red",
    "scoreAnalytics.interpretation.classification.veryPoor",
  );
}

/**
 * Interpret overall agreement percentage
 *
 * @param agreement - Overall agreement (0-1)
 * @returns Interpretation with strength, color, and description
 */
export function interpretOverallAgreement(
  agreement: number | null,
): InterpretationResult {
  if (agreement === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  const percentage = Math.round(agreement * 100);
  const descriptionValues = { percentage };

  if (agreement >= 0.9) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.excellent",
      "green",
      "scoreAnalytics.interpretation.predictionsMatch",
      descriptionValues,
    );
  }
  if (agreement >= 0.8) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.good",
      "blue",
      "scoreAnalytics.interpretation.predictionsMatch",
      descriptionValues,
    );
  }
  if (agreement >= 0.6) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.fair",
      "yellow",
      "scoreAnalytics.interpretation.predictionsMatch",
      descriptionValues,
    );
  }
  if (agreement >= 0.4) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.poor",
      "orange",
      "scoreAnalytics.interpretation.predictionsMatch",
      descriptionValues,
    );
  }
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.veryPoor",
    "red",
    "scoreAnalytics.interpretation.predictionsMatch",
    descriptionValues,
  );
}

/**
 * Interpret Mean Absolute Error (MAE)
 * Context-dependent interpretation based on scale
 *
 * @param mae - Mean Absolute Error
 * @param scale - Optional scale information {min, max} for contextual interpretation
 * @returns Interpretation with strength, color, and description
 */
export function interpretMAE(
  mae: number | null,
  scale?: { min: number; max: number },
): InterpretationResult {
  if (mae === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  if (scale) {
    const range = scale.max - scale.min;
    const relativeError = mae / range;

    if (relativeError <= 0.05) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.excellent",
        "green",
        "scoreAnalytics.interpretation.error.veryLow",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.1) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.good",
        "blue",
        "scoreAnalytics.interpretation.error.low",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.2) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.fair",
        "yellow",
        "scoreAnalytics.interpretation.error.moderate",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.3) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.poor",
        "orange",
        "scoreAnalytics.interpretation.error.high",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.veryPoor",
      "red",
      "scoreAnalytics.interpretation.error.veryHigh",
      { percentage: (relativeError * 100).toFixed(1) },
    );
  }

  // Without scale context, just report the value
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.na",
    "gray",
    "scoreAnalytics.interpretation.error.average",
    { value: mae.toFixed(3) },
  );
}

/**
 * Interpret Root Mean Squared Error (RMSE)
 * Context-dependent interpretation based on scale
 * RMSE penalizes large errors more than MAE
 *
 * @param rmse - Root Mean Squared Error
 * @param scale - Optional scale information {min, max} for contextual interpretation
 * @returns Interpretation with strength, color, and description
 */
export function interpretRMSE(
  rmse: number | null,
  scale?: { min: number; max: number },
): InterpretationResult {
  if (rmse === null) {
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.na",
      "gray",
      "scoreAnalytics.noDataAvailable",
    );
  }

  if (scale) {
    const range = scale.max - scale.min;
    const relativeError = rmse / range;

    if (relativeError <= 0.05) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.excellent",
        "green",
        "scoreAnalytics.interpretation.error.veryLow",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.1) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.good",
        "blue",
        "scoreAnalytics.interpretation.error.low",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.2) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.fair",
        "yellow",
        "scoreAnalytics.interpretation.error.moderate",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    if (relativeError <= 0.3) {
      return makeInterpretation(
        "scoreAnalytics.interpretation.strength.poor",
        "orange",
        "scoreAnalytics.interpretation.error.high",
        { percentage: (relativeError * 100).toFixed(1) },
      );
    }
    return makeInterpretation(
      "scoreAnalytics.interpretation.strength.veryPoor",
      "red",
      "scoreAnalytics.interpretation.error.veryHigh",
      { percentage: (relativeError * 100).toFixed(1) },
    );
  }

  // Without scale context, just report the value
  return makeInterpretation(
    "scoreAnalytics.interpretation.strength.na",
    "gray",
    "scoreAnalytics.interpretation.error.rootMeanSquared",
    { value: rmse.toFixed(3) },
  );
}
