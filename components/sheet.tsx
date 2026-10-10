"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet built on <dialog>: focus trap, Esc to close and inert background for free. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60 sm:mx-auto sm:max-w-[430px]"
      style={{ maxWidth: 430, marginInline: "auto" }}
    >
      <div className="animate-rise rounded-t-[24px] border border-line bg-surface px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
            <X size={22} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
