"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AlertCircle, HelpCircle, ShieldAlert } from "lucide-react";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default" | "asana";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "destructive",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-5 border border-border/80 shadow-2xl animate-scale-up">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}
            >
              {isDestructive ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <HelpCircle className="h-5 w-5" />
              )}
            </div>
            <AlertDialogTitle className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-3 border-t border-border/40 gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={() => {
              if (onCancel) onCancel();
              onOpenChange(false);
            }}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isLoading}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
            className={`h-8 text-xs font-semibold px-4 cursor-pointer ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isLoading ? "Memproses..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
