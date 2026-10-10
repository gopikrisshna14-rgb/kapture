"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Send, ScanLine, QrCode, UserRound } from "lucide-react";
import { cx } from "./ui";

const tabs = [
  { href: "/people", label: "People", Icon: Users },
  { href: "/connect", label: "Connect", Icon: Send },
  { href: "/my-code", label: "My code", Icon: QrCode },
  { href: "/account", label: "Account", Icon: UserRound },
];

export function TabBar() {
  const path = usePathname();
  const item = (t: (typeof tabs)[number]) => {
    const active = path === t.href || path.startsWith(t.href + "/");
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium",
          active ? "text-ink" : "text-dim hover:text-muted",
        )}
      >
        <t.Icon size={22} strokeWidth={2} aria-hidden />
        {t.label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-bg/95 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur"
    >
      <div className="flex items-end">
        {item(tabs[0])}
        {item(tabs[1])}
        <div className="flex flex-1 justify-center">
          <Link
            href="/scan"
            aria-label="Scan"
            className="-mt-8 inline-flex h-[68px] w-[68px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_24px_rgba(215,255,61,0.25)] ring-4 ring-bg"
          >
            <ScanLine size={28} strokeWidth={2} aria-hidden />
          </Link>
        </div>
        {item(tabs[2])}
        {item(tabs[3])}
      </div>
    </nav>
  );
}
