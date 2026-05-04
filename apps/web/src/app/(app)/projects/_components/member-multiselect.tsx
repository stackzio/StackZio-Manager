"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";

export interface MemberOption {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role?: string;
}

interface Props {
  options: MemberOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function MemberMultiselect({ options, value, onChange, placeholder = "Assign members" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.id));

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2 overflow-hidden">
            <Users className="size-4 text-muted-foreground" />
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="truncate">
                {selected.length} member{selected.length === 1 ? "" : "s"} assigned
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <ScrollArea className="max-h-72">
          <ul className="py-1">
            {options.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">No teammates yet — invite them from the Team page.</li>
            ) : null}
            {options.map((o) => {
              const initials = (o.name ?? o.email)
                .split(/[\s.@]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("");
              const checked = value.includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Avatar className="size-7">
                      {o.image ? <AvatarImage src={o.image} alt={o.name ?? o.email} /> : null}
                      <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <p className="truncate font-medium">{o.name ?? o.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                    </div>
                    <Check className={cn("size-4", checked ? "opacity-100 text-primary" : "opacity-0")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
