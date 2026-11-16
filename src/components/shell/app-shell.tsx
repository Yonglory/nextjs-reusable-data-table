"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/data-table/cx";

const links = [
  { href: "/", label: "Timetable" },
  { href: "/demo", label: "Members" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-8 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white"
            >
              F
            </span>
            <span className="text-sm font-semibold tracking-tight">Forma Studio</span>
          </div>

          <nav aria-label="Sections" className="flex h-full items-stretch gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center border-b-2 px-3 text-[13px] font-medium transition-colors",
                    active
                      ? "border-accent text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-900",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
