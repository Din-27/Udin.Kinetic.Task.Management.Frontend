"use client";

import React from "react";
import {
  CircleDashed,
  Circle,
  CircleDot,
  CheckSquare,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIconProps {
  status: string;
  className?: string;
  size?: number;
}

export function StatusIcon({ status, className = "", size = 14 }: StatusIconProps) {
  const s = status ? status.toUpperCase().replace(/\s+/g, "_") : "";

  switch (s) {
    case "BACKLOG":
      return <CircleDashed size={size} className={cn("text-muted-foreground shrink-0", className)} />;
    case "TODO":
      return <Circle size={size} className={cn("text-blue-500 shrink-0", className)} />;
    case "IN_PROGRESS":
      return <CircleDot size={size} className={cn("text-amber-500 shrink-0", className)} />;
    case "IN_REVIEW":
      return <CheckSquare size={size} className={cn("text-purple-500 shrink-0", className)} />;
    case "DONE":
      return <CheckCircle2 size={size} className={cn("text-emerald-500 shrink-0", className)} />;
    default:
      return <Layers size={size} className={cn("text-muted-foreground shrink-0", className)} />;
  }
}
