import localFont from "next/font/local";

// The two faces SPEC.md §12 names, shipped in the repo so a build never needs the
// network. Both are SIL Open Font License 1.1 (the OFL-*.txt files beside them), Latin
// subset only, from the Fontsource builds of the Google Fonts releases. Each sets a CSS
// variable that globals.css puts at the front of --font-serif and --font-sans.
// next/font names each family after its export (`newsreader`, `sourceSans`), and the
// font test in e2e/design.spec.ts matches those names: rename both together.

// Newsreader keeps its optical-size axis: the boards set titles with it, and it is what
// makes a 40px heading and a 21px one each look drawn for their size.
export const newsreader = localFont({
  src: "./newsreader-latin-opsz.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-newsreader",
  adjustFontFallback: "Times New Roman",
});

export const sourceSans = localFont({
  src: [
    { path: "./source-sans-3-latin-wght.woff2", weight: "200 900", style: "normal" },
    {
      path: "./source-sans-3-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  variable: "--font-source-sans",
});
