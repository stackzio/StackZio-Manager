import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: "Phase 2" | "Phase 3";
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="rounded-full bg-brand-gradient p-3 text-white shadow-lg">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{phase}</p>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
