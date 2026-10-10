import { CreditCard, Keyboard, Link2, QrCode, UserRound, Contact } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/labels";
import type { Source } from "@/lib/types";
import { Chip } from "./ui";

const ICONS: Record<Source, typeof QrCode> = {
  linkedin_qr: QrCode,
  card: CreditCard,
  digital_card: Contact,
  link: Link2,
  manual: Keyboard,
  self_submitted: UserRound,
};

export function SourceChip({ source }: { source: Source }) {
  const I = ICONS[source];
  return (
    <Chip tone="muted">
      <I size={14} aria-hidden /> {SOURCE_LABELS[source]}
    </Chip>
  );
}
