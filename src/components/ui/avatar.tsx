import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const AVATAR_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#0ea5e9", // Sky
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#10b981", // Emerald
  "#22c55e", // Green
  "#84cc16", // Lime
  "#f59e0b", // Amber
  "#f97316", // Orange
  "#ef4444", // Red
  "#f43f5e", // Rose
  "#ec4899", // Pink
  "#d946ef", // Fuchsia
  "#8b5cf6", // Purple
  "#a855f7", // Violet
];

export function getAvatarColor(str?: string | null): string {
  if (!str || !str.trim()) return AVATAR_COLORS[0];
  const clean = str.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function Avatar({
  src,
  alt = "User",
  fallback,
  size = "md",
  className,
  style,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    xs: "h-4 w-4 text-[8px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
    xl: "h-12 w-12 text-base",
  };

  const seed = (alt && alt !== "User") ? alt : (fallback || "User");
  const initials = getInitials(fallback || alt);
  const cleanSrc = typeof src === "string" && src !== "null" && src !== "undefined" ? src.trim() : "";
  const hasValidSrc = Boolean(
    cleanSrc &&
    !cleanSrc.startsWith("data:image/svg+xml") &&
    !imageError
  );

  const bgColor = React.useMemo(() => {
    return getAvatarColor(seed);
  }, [seed]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full font-medium select-none ring-1 ring-border/80 items-center justify-center font-mono",
        sizeClasses[size],
        hasValidSrc ? "bg-muted text-muted-foreground" : "text-white font-bold",
        className
      )}
      style={{
        ...(!hasValidSrc ? { backgroundColor: bgColor, color: "#ffffff" } : {}),
        ...style,
      }}
      {...props}
    >
      {hasValidSrc ? (
        <img
          src={cleanSrc}
          alt={alt}
          onError={() => setImageError(true)}
          className="aspect-square h-full w-full object-cover shrink-0 rounded-full"
        />
      ) : (
        <span className="font-semibold select-none leading-none">{initials}</span>
      )}
    </div>
  );
}
