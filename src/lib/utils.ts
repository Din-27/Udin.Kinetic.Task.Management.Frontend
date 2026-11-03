import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  const now = new Date();
  
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `in ${diffDays}d`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getTagColor(tag: string): { bg: string; text: string; border: string } {
  const normalized = tag.toLowerCase().trim();
  switch (normalized) {
    case "frontend":
    case "fe":
      return {
        bg: "bg-sky-500/10 dark:bg-sky-500/15",
        text: "text-sky-700 dark:text-sky-300",
        border: "border-sky-300 dark:border-sky-500/30",
      };
    case "backend":
    case "be":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-300 dark:border-emerald-500/30",
      };
    case "database":
    case "db":
    case "postgres":
    case "neon":
      return {
        bg: "bg-teal-500/10 dark:bg-teal-500/15",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-300 dark:border-teal-500/30",
      };
    case "design":
    case "ui":
    case "ux":
      return {
        bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
        text: "text-fuchsia-700 dark:text-fuchsia-300",
        border: "border-fuchsia-300 dark:border-fuchsia-500/30",
      };
    case "bug":
    case "fix":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/15",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-300 dark:border-rose-500/30",
      };
    case "feature":
    case "feat":
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-300 dark:border-indigo-500/30",
      };
    case "mobile":
    case "android":
    case "ios":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-300 dark:border-amber-500/30",
      };
    default:
      return {
        bg: "bg-muted/70",
        text: "text-muted-foreground hover:text-foreground",
        border: "border-border/80",
      };
  }
}

export function getInitials(name?: string, email?: string): string {
  const cleanName = (name || email?.split("@")[0] || "User").trim();
  const parts = cleanName.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].toUpperCase();
  }
  return "US";
}

export function getDefaultAvatar(name?: string, email?: string): string {
  const initials = getInitials(name, email);
  const colors = [
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky
  ];
  const charCodeSum = initials.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgColor = colors[charCodeSum % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" rx="50" fill="${bgColor}"/><text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="40" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
