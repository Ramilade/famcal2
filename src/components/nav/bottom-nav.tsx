"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/register"];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function CalIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FamilyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  if (AUTH_PATHS.includes(pathname)) return null;

  const items = [
    { href: "/dashboard", label: "Forside", Icon: HomeIcon },
    { href: "/calendar", label: "Kalender", Icon: CalIcon },
    { href: "/family", label: "Familie", Icon: FamilyIcon },
    { href: "/profile", label: "Profil", Icon: ProfileIcon },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || (href === "/calendar" && pathname === "/");
        return (
          <Link key={href} href={href} className={`bottom-nav-item${active ? " bottom-nav-item--active" : ""}`}>
            <Icon active={active} />
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
