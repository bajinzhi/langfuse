import { render, screen } from "@testing-library/react";
import { SidebarNotifications } from "./sidebar-notifications";

vi.mock("../useLocalStorage", () => ({
  __esModule: true,
  default: () => [[], vi.fn()],
}));

vi.mock("@/src/features/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "common.dismiss": "Dismiss",
        "common.learnMore": "Learn more.",
        "sidebarNotifications.githubDescription":
          "See the latest releases and help grow the community on GitHub",
        "sidebarNotifications.githubStarsAlt": "Langfuse GitHub stars",
        "sidebarNotifications.starLangfuse": "Star Langfuse",
      })[key] ?? key,
  }),
}));

describe("SidebarNotifications", () => {
  it("renders the GitHub stars badge with social style query params", () => {
    render(<SidebarNotifications />);

    const badge = screen.getByAltText("Langfuse GitHub stars");
    const src = badge.getAttribute("src");

    expect(src).toContain("style=social");
    expect(src).not.toContain("&amp;");
  });
});
