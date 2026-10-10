import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none";
const btnSize = { lg: "h-14 px-6 text-[16px] w-full", md: "h-11 px-5 text-[15px]", sm: "h-11 px-4 text-sm" };
const btnVariant: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-[#e2ff6e] active:bg-[#c4ec2c]",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-surface text-danger border border-line hover:bg-surface-2",
};

export function Button({
  variant = "primary",
  size = "lg",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof btnSize }) {
  return <button className={cx(btnBase, btnSize[size], btnVariant[variant], className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  size = "lg",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof btnSize }) {
  return <Link className={cx(btnBase, btnSize[size], btnVariant[variant], className)} {...rest} />;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-[22px] border border-line bg-surface p-5", className)} {...rest} />;
}

export function Chip({
  active,
  className,
  tone = "default",
  ...rest
}: ComponentProps<"span"> & { active?: boolean; tone?: "default" | "accent" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium",
        active || tone === "accent"
          ? "bg-accent text-on-accent"
          : tone === "muted"
            ? "bg-surface-2 text-muted"
            : "border border-line bg-surface-2 text-ink",
        className,
      )}
      {...rest}
    />
  );
}

/** Selectable chip (radio-like). */
export function ChoiceChip({
  selected,
  className,
  ...rest
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors",
        selected ? "bg-accent text-on-accent" : "border border-line bg-surface text-ink hover:bg-surface-2",
        className,
      )}
      {...rest}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "h-11 flex-1 rounded-full px-3 text-[14px] font-semibold transition-colors",
            value === o.id ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("flex min-h-11 items-center justify-between gap-4", disabled && "opacity-50")}>
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-8 w-[52px] shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "border border-line bg-surface-2",
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-6 w-6 rounded-full transition-all",
            checked ? "left-[24px] bg-on-accent" : "left-1 bg-muted",
          )}
        />
      </button>
    </label>
  );
}

export function Field({
  label,
  id,
  hint,
  className,
  multiline,
  ...rest
}: { label: string; id: string; hint?: string; multiline?: boolean } & ComponentProps<"input"> &
  Pick<ComponentProps<"textarea">, "rows">) {
  const cls =
    "w-full rounded-2xl border border-line bg-surface px-4 text-[16px] text-ink placeholder:text-dim focus:border-accent focus:outline-none";
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={cx(cls, "min-h-28 py-3")}
          {...(rest as unknown as ComponentProps<"textarea">)}
        />
      ) : (
        <input id={id} className={cx(cls, "h-12")} {...rest} />
      )}
      {hint && <p className="mt-1 text-[13px] text-dim">{hint}</p>}
    </div>
  );
}

export function TopBar({
  back,
  title,
  right,
}: {
  back?: string | (() => void);
  title?: ReactNode;
  right?: ReactNode;
}) {
  const backCls =
    "-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface";
  return (
    <header className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
      {typeof back === "string" ? (
        <Link href={back} aria-label="Back" className={backCls}>
          <ArrowLeft size={22} strokeWidth={2} aria-hidden />
        </Link>
      ) : back ? (
        <button type="button" onClick={back} aria-label="Back" className={backCls}>
          <ArrowLeft size={22} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 truncate text-[16px] font-semibold">{title}</div>
      {right}
    </header>
  );
}

export function IconButton({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2",
        className,
      )}
      {...rest}
    />
  );
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, src, size = 44 }: { name?: string | null; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-dim" style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.06em" }}>{children}</h2>;
}

export function Page({ children, className, list }: { children: ReactNode; className?: string; list?: boolean }) {
  return <main className={cx(list ? "px-5" : "px-6", "pb-10", className)}>{children}</main>;
}
