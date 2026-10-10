import { Check } from "lucide-react";
import { Chip, TopBar, cx } from "@/components/ui";

const PLANS = [
  { name: "Free", price: "€0", per: "", items: ["50 captures a month", "Basic profile", "CSV export"], current: true },
  { name: "Pro", price: "€19", per: "/month", items: ["Unlimited captures", "Full profile briefs", "LinkedIn connect with ready-made notes", "Excel export"], highlight: true },
  { name: "Team", price: "€29", per: "/seat a month", items: ["Everything in Pro", "Shared events", "CRM export"] },
];

export default function PlansPage() {
  return (
    <>
      <TopBar back="/account" title="Plans" />
      <main className="px-6 pb-12">
        <h1 className="text-[34px] font-extrabold leading-tight">Plans</h1>
        <p className="mt-1 text-muted">You&apos;re on Free. Paid plans aren&apos;t on sale yet.</p>
        <div className="mt-6 space-y-3">
          {PLANS.map((p) => (
            <section key={p.name} aria-label={`${p.name} plan`} className={cx("rounded-[24px] border bg-surface p-5", p.highlight ? "border-accent" : "border-line")}>
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-bold">{p.name}</h2>
                {p.current ? <Chip>Current</Chip> : p.highlight ? <Chip tone="accent">Popular</Chip> : null}
              </div>
              <p className="mt-1">
                <span className="font-display text-[32px] font-extrabold">{p.price}</span>
                <span className="text-muted">{p.per}</span>
              </p>
              <ul className="mt-3 space-y-2">
                {p.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[15px]">
                    <Check size={16} className="text-accent" aria-hidden /> {i}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-dim">Prices include VAT. No payment is taken in this version.</p>
      </main>
    </>
  );
}
