"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertCircle, ShieldAlert, X } from "lucide-react";

interface AlertDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, children }: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      {children}
    </div>
  );
}

export function AlertDialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md rounded-xl border border-border/80 bg-background p-6 shadow-2xl animate-scale-up space-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex flex-col space-y-2 text-left", className)}>{children}</div>;
}

export function AlertDialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2 pt-2", className)}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-foreground tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function AlertDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function AlertDialogAction({
  className,
  onClick,
  children,
  variant = "destructive",
  disabled = false,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "asana";
  disabled?: boolean;
}) {
  return (
    <Button variant={variant} size="sm" onClick={onClick} disabled={disabled} className={cn("h-8 text-xs px-3", className)}>
      {children}
    </Button>
  );
}

export function AlertDialogCancel({
  className,
  onClick,
  children = "Batal",
  disabled = false,
}: {
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-8 text-xs px-3", className)}
    >
      {children}
    </Button>
  );
}
