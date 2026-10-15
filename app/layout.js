import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600"] });

export const metadata = {
  title: "Gharieni Support",
  description: "Report a fix or change for the Gharieni websites.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
