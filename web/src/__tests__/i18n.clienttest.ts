import {
  getLocaleRedirectPath,
  resolveCurrentLocale,
  resolvePreferredLocale,
  shouldSkipLocaleDetection,
} from "@/src/features/i18n/routing";
import { normalizeLocale } from "@/src/features/i18n/locales";
import { getMessage } from "@/src/features/i18n/messages";
import { translateMessage } from "@/src/features/i18n";
import { enMessages } from "@/src/features/i18n/messages/en";
import { zhCNMessages } from "@/src/features/i18n/messages/zh-CN";

describe("i18n locale resolution", () => {
  it("normalizes supported locale variants", () => {
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLocale("fr-FR")).toBeNull();
  });

  it("prefers explicit path locale over cookie and browser language", () => {
    expect(
      resolvePreferredLocale({
        pathname: "/zh-CN/project/project-1",
        cookieLocale: "en",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("zh-CN");
  });

  it("uses Next's parsed locale when the pathname was normalized", () => {
    expect(
      resolveCurrentLocale({
        pathname: "/project/project-1",
        nextLocale: "zh-CN",
      }),
    ).toBe("zh-CN");
  });

  it("uses cookie locale before Accept-Language", () => {
    expect(
      resolvePreferredLocale({
        pathname: "/project/project-1",
        cookieLocale: "zh-CN",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("zh-CN");
  });

  it("uses weighted Accept-Language when no path or cookie locale exists", () => {
    expect(
      resolvePreferredLocale({
        pathname: "/project/project-1",
        acceptLanguage: "en-US;q=0.5,zh-CN;q=0.9",
      }),
    ).toBe("zh-CN");
  });
});

describe("i18n locale redirects", () => {
  it("prefixes non-default locale paths", () => {
    expect(
      getLocaleRedirectPath({
        pathname: "/project/project-1",
        search: "?view=traces",
        locale: "zh-CN",
      }),
    ).toBe("/zh-CN/project/project-1?view=traces");
  });

  it("does not redirect when the current non-default locale is already explicit", () => {
    expect(
      getLocaleRedirectPath({
        pathname: "/project/project-1",
        locale: "zh-CN",
        currentLocale: "zh-CN",
        hasExplicitNonDefaultLocale: true,
      }),
    ).toBeNull();
  });

  it("removes default locale prefixes", () => {
    expect(
      getLocaleRedirectPath({
        pathname: "/en/project/project-1",
        locale: "en",
      }),
    ).toBe("/project/project-1");
  });

  it("does not rewrite assets or public files", () => {
    expect(shouldSkipLocaleDetection("/api/auth/session")).toBe(true);
    expect(shouldSkipLocaleDetection("/_next/static/chunk.js")).toBe(true);
    expect(shouldSkipLocaleDetection("/favicon.ico")).toBe(true);
  });
});

describe("i18n messages", () => {
  it("keeps Chinese and English catalogs aligned", () => {
    expect(Object.keys(zhCNMessages).sort()).toEqual(
      Object.keys(enMessages).sort(),
    );
  });

  it("returns Chinese messages for zh-CN", () => {
    expect(getMessage("zh-CN", "nav.projects")).toBe("项目");
  });

  it("interpolates translated messages", () => {
    expect(
      translateMessage("zh-CN", "notifications.path", { path: "users.all" }),
    ).toBe("路径：users.all");
  });
});
