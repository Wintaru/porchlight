import localFont from "next/font/local";

// The two faces SPEC.md §12 names, shipped in the repo so a build never needs the
// network. Both are SIL Open Font License 1.1 (the OFL-*.txt files beside them), Latin
// subset only, from the Fontsource builds of the Google Fonts releases. Each sets a CSS
// variable that globals.css puts at the front of --font-serif and --font-sans.
// next/font names each family after its export (`newsreader`, `atkinson`), and the
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

// Atkinson Hyperlegible Next, from the Braille Institute, sets the body text. Its letters
// are drawn to stay distinct for low-vision readers (I, l and 1 never look alike).
export const atkinson = localFont({
  src: [
    {
      path: "./atkinson-hyperlegible-next-latin-wght.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "./atkinson-hyperlegible-next-latin-wght-italic.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  variable: "--font-atkinson",
});
