import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { devSignIn, LAMPLIGHTER, MIRA, type SeedMember, THEO } from "./helpers";

// The design gate. Every other spec asserts what a page does; none asserts that it
// looks like a board in design/porchlight/, so a page with no stylesheet at all passed
// the whole suite. These are cheap structural checks, not a pixel comparison: the page
// answers with the right status, carries the site header and a main landmark, keeps
// its content off the window edge, draws no control with the browser's default look,
// and axe finds nothing. They run at desktop and phone width, as each role that can
// reach the page.
//
// A page with known gaps lists them, and the test asserts that exact list: it stays
// green while the gaps are there, fails when one is fixed (so the entry comes off with
// the fix) and fails when a new one appears. A gap list is never a blanket pass.

type Gap =
  | "no-site-header"
  | "no-main"
  | "flush-left"
  | "browser-control"
  | "file-input"
  | "tall-header"
  | "crowded-header";

interface PageCase {
  readonly path: string;
  readonly as?: SeedMember;
  readonly status?: number;
  readonly gaps?: readonly Gap[];
  readonly axeGaps?: readonly string[];
}

const PAGES: readonly PageCase[] = [
  { path: "/" },
  { path: "/@theo/hello-from-the-porch" },
  { path: "/@theo" },
  // An erased author: the site's own "gone" page, still answering 410.
  { path: "/@wren", status: 410 },
  { path: "/t/making" },
  { path: "/tags" },
  { path: "/about" },
  { path: "/terms" },
  { path: "/code-of-conduct" },
  { path: "/p/new" },
  { path: "/anon" },
  { path: "/auth/dev-sign-in" },
  { path: "/auth/sign-in-failed" },
  { path: "/no-such-page", status: 404 },
  { path: "/", as: THEO },
  { path: "/@theo/hello-from-the-porch", as: THEO },
  // A member sees the claim form a visitor does not.
  { path: "/anon", as: THEO },
  // Attachments are a bare file input, not the Editor board's drop zone.
  { path: "/write", as: THEO, gaps: ["file-input"] },
  { path: "/settings", as: THEO },
  { path: "/settings/erase", as: THEO },
  { path: "/mod/queue", as: MIRA },
  { path: "/mod/queue", as: LAMPLIGHTER },
  { path: "/admin", as: LAMPLIGHTER },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
] as const;

// Content closer than this to the window's left edge is a page with no layout.
const MIN_GUTTER_PX = 16;
// The board's header is one 64px row; this leaves room for the focus ring and border.
const MAX_HEADER_HEIGHT_PX = 80;

// Signs that the browser, not our CSS, drew a control. Chrome gives an unstyled button,
// input, select or textarea 13.33px text and an outset or inset border, and our CSS uses
// neither. (Font family is not a signal: the title field is serif and the markdown box
// monospace, on purpose.) Checkboxes and radios are the browser's on purpose, tinted
// with accent-color. A file input's "Choose File" button cannot be styled at all.
const BROWSER_CONTROL_FONT_SIZE = "13.3333px";
const BROWSER_BORDER_STYLES = ["outset", "inset"];

interface ControlScan {
  readonly browserDrawn: readonly string[];
  readonly fileInputs: number;
}

async function scanControls(page: Page, scope: string): Promise<ControlScan> {
  return page
    .locator(scope)
    .first()
    .evaluate(
      (root, signs) => {
        const browserDrawn: string[] = [];
        let fileInputs = 0;
        const controls = root.querySelectorAll<HTMLElement>(
          "button, input, select, textarea",
        );
        for (const control of controls) {
          const type = control.getAttribute("type") ?? "";
          const box = control.getBoundingClientRect();
          if (
            ["hidden", "checkbox", "radio"].includes(type) ||
            box.width === 0 ||
            box.height === 0
          ) {
            continue;
          }
          if (type === "file") {
            fileInputs += 1;
            continue;
          }
          const style = getComputedStyle(control);
          if (
            style.fontSize === signs.fontSize ||
            signs.borderStyles.includes(style.borderTopStyle)
          ) {
            const name = control.getAttribute("aria-label") ?? control.textContent.trim();
            browserDrawn.push(`${control.tagName.toLowerCase()} "${name.slice(0, 40)}"`);
          }
        }
        return { browserDrawn, fileInputs };
      },
      { fontSize: BROWSER_CONTROL_FONT_SIZE, borderStyles: BROWSER_BORDER_STYLES },
    );
}

async function layoutGaps(page: Page): Promise<readonly Gap[]> {
  const gaps: Gap[] = [];
  if (!(await page.getByRole("navigation", { name: "Site" }).isVisible())) {
    gaps.push("no-site-header");
  }
  if ((await page.locator("main").count()) === 0) {
    gaps.push("no-main");
    return gaps;
  }
  const heading = await page.locator("main h1").first().boundingBox();
  const content = heading ?? (await page.locator("main").boundingBox());
  if (content === null || content.x < MIN_GUTTER_PX) {
    gaps.push("flush-left");
  }
  const scan = await scanControls(page, "main");
  if (scan.browserDrawn.length > 0) {
    gaps.push("browser-control");
  }
  if (scan.fileInputs > 0) {
    gaps.push("file-input");
  }
  return gaps;
}

function titleOf(target: PageCase, viewport: string): string {
  return `${target.path} as ${target.as?.handle ?? "a visitor"} at ${viewport}`;
}

async function open(
  page: Page,
  target: PageCase,
  width: number,
  height: number,
): Promise<void> {
  if (target.as !== undefined) {
    await devSignIn(page, target.as);
  }
  await page.setViewportSize({ width, height });
  const response = await page.goto(target.path);
  expect(response?.status()).toBe(target.status ?? 200);
}

for (const target of PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`${titleOf(target, viewport.name)} is laid out and drawn by our CSS`, async ({
      page,
    }) => {
      await open(page, target, viewport.width, viewport.height);
      expect(await layoutGaps(page)).toEqual(target.gaps ?? []);
    });
  }

  test(`${titleOf(target, "desktop")} has no detectable accessibility violations`, async ({
    page,
  }) => {
    await open(page, target, 1280, 800);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual(
      target.axeGaps ?? [],
    );
  });
}

// The header is one row at every width, so a height check alone cannot see crowding:
// the two halves must not overlap and nothing may scroll sideways. It runs at the
// widths either side of its breakpoints, where a row is most likely to be too full.
const HEADER_WIDTHS = [1280, 1024, 960, 901, 900, 768, 641, 640, 390, 320] as const;

for (const as of [undefined, THEO] as const) {
  for (const width of HEADER_WIDTHS) {
    const who = as?.handle ?? "visitor";
    test(`the site header as ${who} at ${String(width)}px is one styled row`, async ({
      page,
    }) => {
      const home: PageCase = as === undefined ? { path: "/" } : { path: "/", as };
      await open(page, home, width, 800);
      const gaps: Gap[] = [];
      if ((await scanControls(page, "header")).browserDrawn.length > 0) {
        gaps.push("browser-control");
      }
      const header = page.locator("header").first();
      const box = await header.boundingBox();
      if (box === null || box.height > MAX_HEADER_HEIGHT_PX) {
        gaps.push("tall-header");
      }
      // The left half may shrink, so its box never meets the right half's; what
      // crowding does is push its content out of that box, or cut the site name short.
      const crowded = await header.evaluate((el) => {
        const site = el.querySelector('nav[aria-label="Site"]');
        if (site === null) {
          return true;
        }
        const name = site.querySelector("a > span");
        return (
          site.scrollWidth > site.clientWidth ||
          (name !== null && name.scrollWidth > name.clientWidth) ||
          el.scrollWidth > el.clientWidth
        );
      });
      if (
        crowded ||
        (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      ) {
        gaps.push("crowded-header");
      }
      expect(gaps).toEqual([]);
    });
  }
}

// SPEC.md §12's two faces are files in the repo (#45). next/font renames each family,
// so the check reads the family the page actually asks for and finds it loaded.
test("body text and headings are set in the site's own fonts", async ({ page }) => {
  await page.goto("/");
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const firstFamily = (element: Element) =>
      getComputedStyle(element).fontFamily.split(",")[0]?.trim().replace(/['"]/g, "") ??
      "";
    const body = firstFamily(document.body);
    const heading = firstFamily(document.querySelector("h1") ?? document.body);
    const families = new Set(
      [...document.fonts]
        .filter((face) => face.status === "loaded")
        .map((face) => face.family.replace(/['"]/g, "")),
    );
    return {
      body,
      heading,
      bodyLoaded: families.has(body),
      headingLoaded: families.has(heading),
    };
  });
  expect(loaded.body).toMatch(/source/i);
  expect(loaded.heading).toMatch(/newsreader/i);
  expect(loaded.bodyLoaded).toBe(true);
  expect(loaded.headingLoaded).toBe(true);
});
