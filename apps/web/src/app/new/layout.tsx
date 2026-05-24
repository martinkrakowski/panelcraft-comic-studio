import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return <div className={outfit.variable}>{children}</div>;
}
