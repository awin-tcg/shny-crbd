"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const desktopDestinations = [
  { href: "/", label: "Portfolio" },
  { href: "/search", label: "Search" },
  { href: "/trade", label: "Trade" },
  { href: "/news", label: "News" },
  { href: "/vendor", label: "Vendor" },
];

const mobileDestinations = desktopDestinations.slice(0, 3);

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <>
      <nav className="desktop-navigation" aria-label="Primary navigation">
        <NavigationLinks
          destinations={desktopDestinations}
          pathname={pathname}
        />
      </nav>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        <NavigationLinks
          destinations={mobileDestinations}
          pathname={pathname}
        />
      </nav>
    </>
  );
}

function NavigationLinks({
  destinations,
  pathname,
}: {
  destinations: typeof desktopDestinations;
  pathname: string;
}) {
  return destinations.map((destination) => {
    const active =
      destination.href === "/"
        ? pathname === destination.href
        : pathname.startsWith(destination.href);

    return (
      <Link
        aria-current={active ? "page" : undefined}
        href={destination.href}
        key={destination.href}
      >
        <span className="navigation-mark" aria-hidden="true">
          {destination.label.slice(0, 1)}
        </span>
        <span>{destination.label}</span>
      </Link>
    );
  });
}
