import {
  BASE_CURRENCY,
  CURRENCY_DESCRIPTORS,
  isSupportedCurrency,
  normalizeRate,
  type SupportedCurrency,
} from "@langfuse/shared";

/**
 * Per-project currency preference persisted in localStorage.
 *
 * Storage layout: each project stores a JSON record under
 * `langfuse:currency:project:{projectId}`. We use a single key per project
 * (rather than one key per setting) so a partial write can never leave the
 * preference in an inconsistent state.
 */

const STORAGE_KEY_PREFIX = "langfuse:currency:project:";

export interface ProjectCurrencyPreference {
  activeCurrency: SupportedCurrency;
  /**
   * User-customised conversion rates per currency, expressed as
   * "1 USD = N units of the target currency". Missing entries fall back
   * to the descriptor's defaultRate.
   */
  rates: Partial<Record<SupportedCurrency, number>>;
}

export const DEFAULT_PREFERENCE: ProjectCurrencyPreference = {
  // Default to CNY so Chinese users see localized pricing on first visit.
  // USD users can switch back via the project settings page.
  activeCurrency: "CNY",
  rates: {},
};

function storageKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}${projectId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Read and sanitize the preference for a project. Always returns a
 * usable preference: missing/corrupt data falls back to DEFAULT_PREFERENCE.
 *
 * Sanitization rules:
 * - Unsupported activeCurrency → DEFAULT_PREFERENCE.activeCurrency
 * - Non-numeric / non-positive rates → drop that entry (caller resolves
 *   to descriptor.defaultRate via `getRateFor`)
 */
export function readProjectCurrencyPreference(
  projectId: string,
): ProjectCurrencyPreference {
  if (!isBrowser()) return DEFAULT_PREFERENCE;
  if (!projectId) return DEFAULT_PREFERENCE;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey(projectId));
  } catch {
    return DEFAULT_PREFERENCE;
  }
  if (!raw) return DEFAULT_PREFERENCE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCE;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCE;

  const candidate = parsed as Partial<ProjectCurrencyPreference>;

  const activeCurrency: SupportedCurrency = isSupportedCurrency(
    candidate.activeCurrency,
  )
    ? candidate.activeCurrency
    : DEFAULT_PREFERENCE.activeCurrency;

  const rates: Partial<Record<SupportedCurrency, number>> = {};
  if (candidate.rates && typeof candidate.rates === "object") {
    for (const [code, rateValue] of Object.entries(candidate.rates)) {
      if (!isSupportedCurrency(code)) continue;
      if (code === BASE_CURRENCY) continue; // USD rate is always 1
      if (typeof rateValue !== "number" || !Number.isFinite(rateValue)) continue;
      if (rateValue <= 0) continue;
      rates[code] = rateValue;
    }
  }

  return { activeCurrency, rates };
}

export function writeProjectCurrencyPreference(
  projectId: string,
  preference: ProjectCurrencyPreference,
): void {
  if (!isBrowser() || !projectId) return;
  try {
    window.localStorage.setItem(
      storageKey(projectId),
      JSON.stringify(preference),
    );
  } catch {
    // Quota exceeded or storage disabled — silent failure is acceptable
    // because the in-memory store still reflects the new preference for
    // the current tab.
  }
}

export function clearProjectCurrencyPreference(projectId: string): void {
  if (!isBrowser() || !projectId) return;
  try {
    window.localStorage.removeItem(storageKey(projectId));
  } catch {
    // ignore
  }
}

/**
 * Resolve the effective rate for a currency given a preference: user
 * override if present, descriptor default otherwise.
 */
export function getRateFor(
  preference: ProjectCurrencyPreference,
  currency: SupportedCurrency,
): number {
  if (currency === BASE_CURRENCY) return 1;
  return normalizeRate(
    currency,
    preference.rates[currency] ?? CURRENCY_DESCRIPTORS[currency].defaultRate,
  );
}

export function isManagedStorageKey(key: string | null): boolean {
  return typeof key === "string" && key.startsWith(STORAGE_KEY_PREFIX);
}

export function projectIdFromStorageKey(key: string): string | null {
  if (!key.startsWith(STORAGE_KEY_PREFIX)) return null;
  return key.slice(STORAGE_KEY_PREFIX.length);
}
