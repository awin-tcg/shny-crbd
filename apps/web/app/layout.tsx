import type { Metadata } from "next";
import Link from "next/link";
import { SiteNavigation } from "../components/site-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CRDBRD",
    template: "%s · CRDBRD",
  },
  description: "Know what your collection is worth.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="CRDBRD home">
            <span className="brand-mark" aria-hidden="true">
              CR
            </span>
            <span>CRDBRD</span>
          </Link>
          <SiteNavigation />
          <div className="profile" aria-label="Signed in as demo collector">
            AN
          </div>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
