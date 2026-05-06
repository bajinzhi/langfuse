import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import {
  getActivePreference,
  getActiveProjectId,
  setActivePreference,
  subscribe,
} from "@/src/features/currency/store";
import {
  DEFAULT_PREFERENCE,
  getRateFor,
  type ProjectCurrencyPreference,
} from "@/src/features/currency/storage";
import {
  CURRENCY_DESCRIPTORS,
  type SupportedCurrency,
} from "@langfuse/shared";

/**
 * Subscribe to the active project's currency preference.
 *
 * Built on `useSyncExternalStore` so React reads the current snapshot
 * synchronously on mount — that fixes the subscription race the first
 * implementation hit, where consumers that mounted after the initial
 * `setActiveProject` call missed the update entirely.
 *
 * SSR safety: we provide both a client snapshot and a stable server
 * snapshot (returns DEFAULT_PREFERENCE) so SSR renders deterministically
 * and matches the initial client render.
 */

const SERVER_SNAPSHOT: ProjectCurrencyPreference = DEFAULT_PREFERENCE;

function getServerSnapshot(): ProjectCurrencyPreference {
  return SERVER_SNAPSHOT;
}

export interface ProjectCurrencyContext {
  preference: ProjectCurrencyPreference;
  activeCurrency: SupportedCurrency;
  /** Effective rate for `activeCurrency` (1 USD = N units). */
  activeRate: number;
  /** Effective rate for any supported currency, applying user overrides. */
  rateFor: (currency: SupportedCurrency) => number;
  /** Whether a non-USD currency is active (controls tooltip rendering). */
  isConverted: boolean;
  /** Project id this preference belongs to, or null in non-project routes. */
  projectId: string | null;
  /** Currency symbol (¥/$). Useful when Intl.NumberFormat is overkill. */
  symbol: string;
  setPreference: (next: ProjectCurrencyPreference) => void;
  setActiveCurrency: (currency: SupportedCurrency) => void;
  setRate: (currency: SupportedCurrency, rate: number) => void;
  resetToDefault: () => void;
}

export function useProjectCurrency(): ProjectCurrencyContext {
  // Pull projectId from the router so consumers in non-project routes
  // (top nav, settings index) still see a sensible default. This avoids
  // requiring every caller to pass projectId through props.
  const router = useRouter();
  const routeProjectId =
    typeof router.query.projectId === "string" ? router.query.projectId : null;

  const preference = useSyncExternalStore(
    subscribe,
    getActivePreference,
    getServerSnapshot,
  );

  const activeProjectId = getActiveProjectId();
  const projectId = activeProjectId ?? routeProjectId;

  const setPreference = useCallback((next: ProjectCurrencyPreference) => {
    setActivePreference(next);
  }, []);

  const setActiveCurrency = useCallback(
    (currency: SupportedCurrency) => {
      setActivePreference({
        activeCurrency: currency,
        rates: preference.rates,
      });
    },
    [preference.rates],
  );

  const setRate = useCallback(
    (currency: SupportedCurrency, rate: number) => {
      setActivePreference({
        activeCurrency: preference.activeCurrency,
        rates: { ...preference.rates, [currency]: rate },
      });
    },
    [preference.activeCurrency, preference.rates],
  );

  const resetToDefault = useCallback(() => {
    setActivePreference(DEFAULT_PREFERENCE);
  }, []);

  const rateFor = useCallback(
    (currency: SupportedCurrency) => getRateFor(preference, currency),
    [preference],
  );

  const activeCurrency = preference.activeCurrency;
  const symbol = CURRENCY_DESCRIPTORS[activeCurrency].symbol;
  const activeRate = rateFor(activeCurrency);

  return {
    preference,
    activeCurrency,
    activeRate,
    rateFor,
    isConverted: activeCurrency !== "USD",
    projectId,
    symbol,
    setPreference,
    setActiveCurrency,
    setRate,
    resetToDefault,
  };
}
