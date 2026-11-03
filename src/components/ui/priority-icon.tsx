"use client";

import React from "react";
import { TaskPriority } from "@/types";
import { AlertCircle } from "lucide-react";

interface PriorityIconProps {
  priority: TaskPriority | string;
  showLabel?: boolean;
  className?: string;
  size?: number;
}

export function PriorityIcon({
  priority,
  showLabel = false,
  className = "",
  size = 14,
}: PriorityIconProps) {
  const p = priority.toUpperCase();

  const getLabel = () => {
    switch (p) {
      case "URGENT":
        return "Urgent";
      case "HIGH":
        return "High";
      case "MEDIUM":
        return "Medium";
      default:
        return "Low";
    }
  };

  const renderIcon = () => {
    switch (p) {
      case "URGENT":
        return (
          <div className="flex items-center justify-center text-rose-500">
            <AlertCircle className="h-3.5 w-3.5 stroke-[2.2]" />
          </div>
        );
      case "HIGH":
        return (
          <svg
            className="h-3.5 w-3.5 text-amber-500"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <rect x="2" y="10" width="3" height="4" rx="0.75" />
            <rect x="6.5" y="6" width="3" height="8" rx="0.75" />
            <rect x="11" y="2" width="3" height="12" rx="0.75" />
          </svg>
        );
      case "MEDIUM":
        return (
          <svg
            className="h-3.5 w-3.5 text-foreground/70"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <rect x="2" y="10" width="3" height="4" rx="0.75" />
            <rect x="6.5" y="6" width="3" height="8" rx="0.75" />
            <rect
              x="11"
              y="2"
              width="3"
              height="12"
              rx="0.75"
              className="text-muted-foreground/30 fill-current opacity-25"
            />
          </svg>
        );
      case "LOW":
      default:
        return (
          <svg
            className="h-3.5 w-3.5 text-muted-foreground/70"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <rect x="2" y="10" width="3" height="4" rx="0.75" />
            <rect
              x="6.5"
              y="6"
              width="3"
              height="8"
              rx="0.75"
              className="text-muted-foreground/30 fill-current opacity-25"
            />
            <rect
              x="11"
              y="2"
              width="3"
              height="12"
              rx="0.75"
              className="text-muted-foreground/30 fill-current opacity-25"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`${getLabel()} Priority`}
    >
      {renderIcon()}
      {showLabel && (
        <span className="text-xs font-normal text-muted-foreground">
          {getLabel()}
        </span>
      )}
    </div>
  );
}
