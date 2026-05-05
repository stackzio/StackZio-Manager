"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="gradient" onClick={() => window.print()}>
      <Download className="size-4" /> Download / Print
      <Printer className="hidden" />
    </Button>
  );
}
