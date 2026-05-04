import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  LEAD: "Lead",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  LEAD: "secondary",
  IN_PROGRESS: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  SHOPIFY: "Shopify",
  WEBSITE: "Website",
  SOFTWARE: "Software",
  MOBILE_APP: "Mobile app",
  BRANDING: "Branding",
  MARKETING: "Marketing",
  OTHER: "Other",
};

export function CategoryBadge({ category }: { category: string }) {
  return <Badge variant="outline">{CATEGORY_LABEL[category] ?? category}</Badge>;
}
