import React from "react";
import { UserRole } from "@/types";
import { ShieldAlert, Shield, Eye } from "lucide-react";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  switch (role) {
    case "ADMIN":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-rose-600 dark:text-rose-400 ${className}`}
        >
          <ShieldAlert className="h-3 w-3" />
          Admin
        </span>
      );
    case "MEMBER":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400 ${className}`}
        >
          <Shield className="h-3 w-3" />
          Member
        </span>
      );
    case "VIEWER":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border border-zinc-500/30 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground ${className}`}
        >
          <Eye className="h-3 w-3" />
          Viewer
        </span>
      );
  }
}
