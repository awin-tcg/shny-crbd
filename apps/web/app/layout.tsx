import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cardboard",
    template: "%s · Cardboard",
  },
  description: "Know what your collection is worth.",
};

const navigation = [
  { href: "/", label: "Portfolio" },
  { href: "/search", label: "Search" },
  { href: "/trade", label: "Trade" },
  { href: "/news", label: "News" },
  { href: "/vendor", label: "Vendor" },
];

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
          <Link className="brand" href="/" aria-label="Cardboard home">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>
            <span>Cardboard</span>
          </Link>
          <nav aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="profile" aria-label="Signed in as demo collector">
            AN
          </div>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
