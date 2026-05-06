// @vitest-environment node

/**
 * Tests for the shared currency utilities. These run in node mode so the
 * `decimal.js` Decimal class behaves identically to the worker environment.
 */

import Decimal from "decimal.js";
import {
  BASE_CURRENCY,
  CURRENCY_DESCRIPTORS,
  convertFromUsd,
  formatCurrency,
  formatUsdAs,
  isSupportedCurrency,
  normalizeRate,
  toBaseNumber,
} from "@langfuse/shared";

describe("currency utils — type guards", () => {
  it("accepts supported codes", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("CNY")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isSupportedCurrency("EUR")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
    expect(isSupportedCurrency(7.2)).toBe(false);
  });
});

describe("currency utils — normalizeRate", () => {
  it("returns the supplied rate when valid", () => {
    expect(normalizeRate("CNY", 7.5)).toBe(7.5);
  });

  it("falls back to descriptor default for null / NaN / 0 / negative", () => {
    const fallback = CURRENCY_DESCRIPTORS.CNY.defaultRate;
    expect(normalizeRate("CNY", null)).toBe(fallback);
    expect(normalizeRate("CNY", undefined)).toBe(fallback);
    expect(normalizeRate("CNY", Number.NaN)).toBe(fallback);
    expect(normalizeRate("CNY", 0)).toBe(fallback);
    expect(normalizeRate("CNY", -3)).toBe(fallback);
  });
});

describe("currency utils — toBaseNumber duck-typing", () => {
  it("handles plain numbers and bigints", () => {
    expect(toBaseNumber(1.5)).toBe(1.5);
    expect(toBaseNumber(BigInt(42))).toBe(42);
    expect(toBaseNumber(null)).toBe(0);
    expect(toBaseNumber(undefined)).toBe(0);
    expect(toBaseNumber(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("handles native Decimal instances", () => {
    expect(toBaseNumber(new Decimal("0.000123"))).toBeCloseTo(0.000123, 9);
  });

  it("handles cross-module Decimal-like objects (duck typing)", () => {
    // Simulates a Decimal coming from a different bundle: same shape,
    // different prototype. `instanceof Decimal` would return false here
    // but `toBaseNumber` should still extract the number.
    const decimalLike = {
      toNumber() {
        return 0.42;
      },
    };
    expect(toBaseNumber(decimalLike as unknown as Decimal)).toBe(0.42);
  });
});

describe("currency utils — convertFromUsd", () => {
  it("returns USD value untouched when target is USD", () => {
    expect(convertFromUsd(0.0234, BASE_CURRENCY, 7.2)).toBe(0.0234);
  });

  it("multiplies USD by rate for non-USD targets", () => {
    expect(convertFromUsd(0.01, "CNY", 7.2)).toBeCloseTo(0.072, 6);
    expect(convertFromUsd(new Decimal("0.0234"), "CNY", 7.2)).toBeCloseTo(
      0.16848,
      6,
    );
  });

  it("falls back to default rate for invalid rate", () => {
    const cnyDefault = CURRENCY_DESCRIPTORS.CNY.defaultRate;
    expect(convertFromUsd(1, "CNY", -1)).toBeCloseTo(cnyDefault, 6);
  });
});

describe("currency utils — formatting", () => {
  it("formats numbers in the target currency with locale-aware grouping", () => {
    const cny = formatCurrency(0.072, "CNY", { locale: "zh-CN" });
    expect(cny).toMatch(/¥|CN¥|￥/);
    expect(cny).toContain("0.07");
  });

  it("respects custom precision", () => {
    expect(
      formatCurrency(0.0234, "USD", {
        locale: "en-US",
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }),
    ).toBe("$0.0234");
  });

  it("formatUsdAs combines convert + format in one call", () => {
    const out = formatUsdAs(0.01, "CNY", 7.2, {
      locale: "en-US",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    // en-US renders CNY as "CN¥" by default
    expect(out).toContain("0.072");
  });
});
