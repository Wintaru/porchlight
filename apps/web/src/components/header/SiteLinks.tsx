"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The Main board's Home / Tags / About, with the current section marked. A client
// component only for the path: the header is in the root layout, so it cannot read the
// page it is on from the server.
const LINKS = [
  { href: "/", label: "Home", matches: (path: string) => path === "/" },
  {
    href: "/tags",
    label: "Tags",
    matches: (path: string) => path === "/tags" || path.startsWith("/t/"),
  },
  { href: "/about", label: "About", matches: (path: string) => path === "/about" },
] as const;

interface SiteLinksProps {
  readonly className?: string | undefined;
  readonly linkClassName?: string | undefined;
}

export function SiteLinks({ className, linkClassName }: SiteLinksProps) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={linkClassName}
            aria-current={link.matches(pathname) ? "page" : undefined}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
