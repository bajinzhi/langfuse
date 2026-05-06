import {
  DEFAULT_PREFERENCE,
  getRateFor,
  isManagedStorageKey,
  projectIdFromStorageKey,
  readProjectCurrencyPreference,
  writeProjectCurrencyPreference,
  type ProjectCurrencyPreference,
} from "@/src/features/currency/storage";
import { type SupportedCurrency } from "@langfuse/shared";

/**
 * Module-level reactive store for the *active* project's currency
 * preference. Two design decisions are worth flagging here:
 *
 * 1. We expose a `subscribe + getSnapshot` pair so consumers can use
 *    React's `useSyncExternalStore`. Wiring the store this way avoids
 *    the subscription race we hit on the first attempt — in that
 *    version a consumer could mount **before** the syncer had pushed
 *    the initial preference, and the consumer would then sit on a
 *    stale default until the next manual update.
 *
 * 2. Non-React utilities (CSV exports, formatters that run outside the
 *    component tree) read the active preference via `getActivePreference`.
 *    This keeps the preference accessible in places where hooks are not
 *    available without re-implementing localStorage parsing.
 */

interface ActiveState {
  projectId: string | null;
  preference: ProjectCurrencyPreference;
}

let state: ActiveState = {
  projectId: null,
  preference: DEFAULT_PREFERENCE,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getActiveProjectId(): string | null {
  return state.projectId;
}

export function getActivePreference(): ProjectCurrencyPreference {
  return state.preference;
}

export function getActiveCurrency(): SupportedCurrency {
  return state.preference.activeCurrency;
}

export function getActiveRate(currency: SupportedCurrency): number {
  return getRateFor(state.preference, currency);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setActiveProject(projectId: string | null): void {
  if (state.projectId === projectId) return;
  if (!projectId) {
    state = { projectId: null, preference: DEFAULT_PREFERENCE };
    notify();
    return;
  }
  state = {
    projectId,
    preference: readProjectCurrencyPreference(projectId),
  };
  notify();
}

export function setActivePreference(
  preference: ProjectCurrencyPreference,
  options: { persist?: boolean } = {},
): void {
  const projectId = state.projectId;
  if (!projectId) {
    // No active project — keep in-memory state consistent but skip the
    // localStorage write to avoid creating an orphan key.
    state = { ...state, preference };
    notify();
    return;
  }
  state = { ...state, preference };
  if (options.persist !== false) {
    writeProjectCurrencyPreference(projectId, preference);
  }
  notify();
}

/**
 * Re-read the active project from localStorage. Used by the
 * cross-tab sync handler when another tab updates a key we care about.
 */
export function refreshFromStorage(): void {
  if (!state.projectId) return;
  state = {
    ...state,
    preference: readProjectCurrencyPreference(state.projectId),
  };
  notify();
}

let storageListenerInstalled = false;

/**
 * Install a `window.storage` listener that mirrors writes from other
 * tabs into the in-memory store. Idempotent — calling more than once
 * is a no-op.
 */
export function installCrossTabSync(): void {
  if (typeof window === "undefined") return;
  if (storageListenerInstalled) return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (!isManagedStorageKey(event.key)) return;
    const projectId = projectIdFromStorageKey(event.key!);
    if (!projectId || projectId !== state.projectId) return;
    refreshFromStorage();
  });
}
