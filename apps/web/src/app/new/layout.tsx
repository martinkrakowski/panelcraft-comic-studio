import localFont from "next/font/local";

// Outfit (variable weight, latin), bundled in the repo so the build needs no network and visitors'
// browsers never contact a third party. Source: @fontsource-variable/outfit 5.3.0, OFL-1.1 (fonts/OFL.txt).
const outfit = localFont({
  src: "./fonts/outfit-latin-wght.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-outfit",
});

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return <div className={outfit.variable}>{children}</div>;
}
