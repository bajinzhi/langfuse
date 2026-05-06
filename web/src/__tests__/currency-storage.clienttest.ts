/**
 * Tests for the per-project currency preference storage layer.
 * Runs in jsdom so window.localStorage is available.
 */

import {
  DEFAULT_PREFERENCE,
  clearProjectCurrencyPreference,
  getRateFor,
  isManagedStorageKey,
  projectIdFromStorageKey,
  readProjectCurrencyPreference,
  writeProjectCurrencyPreference,
} from "@/src/features/currency/storage";

const PROJECT_ID = "proj-test";

beforeEach(() => {
  window.localStorage.clear();
});

describe("currency storage — defaults", () => {
  it("returns DEFAULT_PREFERENCE when nothing is stored", () => {
    expect(readProjectCurrencyPreference(PROJECT_ID)).toEqual(
      DEFAULT_PREFERENCE,
    );
  });

  it("DEFAULT_PREFERENCE selects CNY out of the box", () => {
    expect(DEFAULT_PREFERENCE.activeCurrency).toBe("CNY");
  });
});

describe("currency storage — round-trip", () => {
  it("persists a valid preference and reads it back", () => {
    writeProjectCurrencyPreference(PROJECT_ID, {
      activeCurrency: "USD",
      rates: { CNY: 7.5 },
    });

    expect(readProjectCurrencyPreference(PROJECT_ID)).toEqual({
      activeCurrency: "USD",
      rates: { CNY: 7.5 },
    });
  });

  it("clear removes the entry", () => {
    writeProjectCurrencyPreference(PROJECT_ID, {
      activeCurrency: "CNY",
      rates: { CNY: 7.5 },
    });
    clearProjectCurrencyPreference(PROJECT_ID);
    expect(readProjectCurrencyPreference(PROJECT_ID)).toEqual(
      DEFAULT_PREFERENCE,
    );
  });
});

describe("currency storage — sanitization", () => {
  it("falls back to default activeCurrency when stored value is unsupported", () => {
    window.localStorage.setItem(
      `langfuse:currency:project:${PROJECT_ID}`,
      JSON.stringify({ activeCurrency: "EUR", rates: { CNY: 7.5 } }),
    );

    const pref = readProjectCurrencyPreference(PROJECT_ID);
    expect(pref.activeCurrency).toBe(DEFAULT_PREFERENCE.activeCurrency);
    // Valid CNY rate is preserved even when the active currency is reset
    expect(pref.rates.CNY).toBe(7.5);
  });

  it("drops invalid rate entries (negative / non-numeric / zero)", () => {
    window.localStorage.setItem(
      `langfuse:currency:project:${PROJECT_ID}`,
      JSON.stringify({
        activeCurrency: "CNY",
        rates: { CNY: -1, USD: "wat", JPY: 0, EUR: 1.1 },
      }),
    );

    const pref = readProjectCurrencyPreference(PROJECT_ID);
    expect(pref.rates).toEqual({});
  });

  it("returns default on corrupt JSON", () => {
    window.localStorage.setItem(
      `langfuse:currency:project:${PROJECT_ID}`,
      "{not json",
    );
    expect(readProjectCurrencyPreference(PROJECT_ID)).toEqual(
      DEFAULT_PREFERENCE,
    );
  });
});

describe("currency storage — getRateFor resolution", () => {
  it("returns 1 for USD regardless of stored overrides", () => {
    expect(
      getRateFor({ activeCurrency: "CNY", rates: { CNY: 7.5 } }, "USD"),
    ).toBe(1);
  });

  it("uses user override when present", () => {
    expect(
      getRateFor({ activeCurrency: "CNY", rates: { CNY: 7.5 } }, "CNY"),
    ).toBe(7.5);
  });

  it("falls back to descriptor default when override is missing", () => {
    expect(getRateFor({ activeCurrency: "CNY", rates: {} }, "CNY")).toBe(7.2);
  });
});

describe("currency storage — key utilities", () => {
  it("recognises managed keys", () => {
    expect(isManagedStorageKey("langfuse:currency:project:p1")).toBe(true);
    expect(isManagedStorageKey("other-key")).toBe(false);
    expect(isManagedStorageKey(null)).toBe(false);
  });

  it("extracts projectId from a managed key", () => {
    expect(projectIdFromStorageKey("langfuse:currency:project:p1")).toBe("p1");
    expect(projectIdFromStorageKey("nope")).toBeNull();
  });
});
