"use client";
import { cn } from "@/lib/utils";

type Props = { label: string; className?: string };

export function Badge({ label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border",
        className
      )}
    >
      {label}
    </span>
  );
}
