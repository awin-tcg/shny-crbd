import type { Metadata } from "next";
import Link from "next/link";
import { SiteNavigation } from "../components/site-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SHNY CRBD",
    template: "%s · SHNY CRBD",
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
          <Link className="brand" href="/" aria-label="SHNY CRBD home">
            {/* Brand mark is a static first-party asset; see assets/shny-crbd-logo.png. */}
            <img
              className="brand-mark"
              src="/logo-mark.png"
              alt=""
              width={32}
              height={32}
            />
            <span>SHNY CRBD</span>
          </Link>
          <SiteNavigation />
          <Link className="profile" href="/account" aria-label="Account">
            <span aria-hidden="true">AN</span>
          </Link>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
