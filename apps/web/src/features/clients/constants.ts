import { Mail, MessageCircle, PhoneCall, StickyNote, Users, type LucideIcon } from "lucide-react";
import { ClientInterest, ClientNoteKind } from "@stackzio/db";

type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline";

export const INTEREST_LABELS: Record<ClientInterest, string> = {
  NEW: "New",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow-up",
  NEGOTIATING: "Negotiating",
  NOT_INTERESTED: "Not interested",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const INTEREST_BADGE: Record<ClientInterest, BadgeVariant> = {
  NEW: "secondary",
  INTERESTED: "default",
  FOLLOW_UP: "warning",
  NEGOTIATING: "default",
  NOT_INTERESTED: "outline",
  CONVERTED: "success",
  LOST: "destructive",
};

export const INTEREST_ORDER: ClientInterest[] = [
  "NEW",
  "INTERESTED",
  "FOLLOW_UP",
  "NEGOTIATING",
  "CONVERTED",
  "NOT_INTERESTED",
  "LOST",
];

export const NOTE_KIND_LABELS: Record<ClientNoteKind, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
};

export const NOTE_KIND_ICONS: Record<ClientNoteKind, LucideIcon> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Users,
  WHATSAPP: MessageCircle,
};

export const NOTE_KIND_ORDER: ClientNoteKind[] = ["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP"];
