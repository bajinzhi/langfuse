/**
 * Tests for the global active-project currency store. Verifies that
 * subscribers see updates synchronously and that the snapshot read by
 * `useSyncExternalStore`-style consumers always matches the latest write.
 *
 * Runs in jsdom so window-level APIs (localStorage, storage events)
 * are available.
 */

import {
  getActiveCurrency,
  getActivePreference,
  getActiveRate,
  setActivePreference,
  setActiveProject,
  subscribe,
} from "@/src/features/currency/store";
import { DEFAULT_PREFERENCE } from "@/src/features/currency/storage";

const PROJECT_ID = "proj-store-test";

beforeEach(() => {
  window.localStorage.clear();
  setActiveProject(null);
});

describe("currency store — initial state", () => {
  it("returns DEFAULT_PREFERENCE when no project is active", () => {
    expect(getActivePreference()).toEqual(DEFAULT_PREFERENCE);
    expect(getActiveCurrency()).toBe("CNY");
    expect(getActiveRate("CNY")).toBe(7.2);
  });
});

describe("currency store — setActiveProject", () => {
  it("hydrates from localStorage when a project is selected", () => {
    window.localStorage.setItem(
      `langfuse:currency:project:${PROJECT_ID}`,
      JSON.stringify({ activeCurrency: "USD", rates: { CNY: 7.5 } }),
    );

    setActiveProject(PROJECT_ID);

    expect(getActiveCurrency()).toBe("USD");
    expect(getActiveRate("CNY")).toBe(7.5);
  });

  it("notifies subscribers when project changes", () => {
    const fn = vi.fn();
    const unsubscribe = subscribe(fn);

    setActiveProject(PROJECT_ID);
    expect(fn).toHaveBeenCalledTimes(1);

    setActiveProject(null);
    expect(fn).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("does not re-notify when the same project is set twice", () => {
    setActiveProject(PROJECT_ID);
    const fn = vi.fn();
    const unsubscribe = subscribe(fn);
    setActiveProject(PROJECT_ID);
    expect(fn).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("currency store — setActivePreference", () => {
  it("updates state and notifies", () => {
    setActiveProject(PROJECT_ID);
    const fn = vi.fn();
    const unsubscribe = subscribe(fn);

    setActivePreference({ activeCurrency: "USD", rates: { CNY: 8 } });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(getActiveCurrency()).toBe("USD");
    expect(getActiveRate("CNY")).toBe(8);
    unsubscribe();
  });

  it("persists by default", () => {
    setActiveProject(PROJECT_ID);
    setActivePreference({ activeCurrency: "USD", rates: { CNY: 8 } });

    const raw = window.localStorage.getItem(
      `langfuse:currency:project:${PROJECT_ID}`,
    );
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({
      activeCurrency: "USD",
      rates: { CNY: 8 },
    });
  });

  it("respects { persist: false }", () => {
    setActiveProject(PROJECT_ID);
    setActivePreference(
      { activeCurrency: "USD", rates: { CNY: 8 } },
      { persist: false },
    );
    expect(
      window.localStorage.getItem(
        `langfuse:currency:project:${PROJECT_ID}`,
      ),
    ).toBeNull();
  });
});

describe("currency store — useSyncExternalStore contract", () => {
  it("getSnapshot returns a stable reference until a write occurs", () => {
    setActiveProject(PROJECT_ID);
    const a = getActivePreference();
    const b = getActivePreference();
    expect(a).toBe(b);

    setActivePreference({ activeCurrency: "USD", rates: {} });
    const c = getActivePreference();
    expect(c).not.toBe(a);
  });
});
