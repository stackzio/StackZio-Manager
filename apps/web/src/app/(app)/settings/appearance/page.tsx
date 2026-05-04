import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeChoice } from "./theme-choice";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearancePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how StackZio Manager looks to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeChoice />
      </CardContent>
    </Card>
  );
}
