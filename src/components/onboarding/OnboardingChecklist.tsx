"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, Sparkles, Plus, Users, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingChecklistProps {
  workspaceName: string;
  tasksCount: number;
  membersCount: number;
  hasPushEnabled: boolean;
  onOpenCreateTask: () => void;
  onOpenInviteMember: () => void;
  onEnablePush: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

export function OnboardingChecklist({
  workspaceName,
  tasksCount,
  membersCount,
  hasPushEnabled,
  onOpenCreateTask,
  onOpenInviteMember,
  onEnablePush,
  onDismiss,
  isLoading = false,
}: OnboardingChecklistProps) {
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const dismissed = localStorage.getItem("kinetic_onboarding_checklist_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("kinetic_onboarding_checklist_dismissed", "true");
    } catch {}
    onDismiss?.();
  };

  if (isDismissed) return null;

  if (!mounted || isLoading) {
    return (
      <div className="mb-4 rounded-xl border border-border/80 bg-card/95 backdrop-blur-sm p-4 shadow-sm relative overflow-hidden animate-fade-in select-none">
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />

        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--workspace-accent,#6366f1)]/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-[var(--workspace-accent,#6366f1)] opacity-60 animate-pulse" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-4 w-44 rounded bg-muted/90 animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="h-3 w-72 max-w-full rounded bg-muted/50 animate-pulse hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-6 rounded bg-muted/40 animate-pulse" />
            <div className="h-6 w-6 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="w-full bg-muted/40 h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="h-full w-2/5 bg-[var(--workspace-accent,#6366f1)]/40 rounded-full animate-pulse" />
        </div>

        {/* Step Items Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full bg-muted/80 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3 w-3/4 rounded bg-muted/80 animate-pulse" />
                  <div className="h-2.5 w-full rounded bg-muted/50 animate-pulse" />
                </div>
              </div>
              <div className="pt-2 border-t border-border/30 flex justify-end">
                <div className="h-5 w-20 rounded bg-muted/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const steps = [
    {
      id: "workspace",
      title: "Buat Workspace Anda",
      description: `Workspace "${workspaceName}" berhasil dibuat.`,
      completed: true,
      action: null,
    },
    {
      id: "project",
      title: "Miliki Project Utama",
      description: "Project aktif siap menampung issue tim Anda.",
      completed: true,
      action: null,
    },
    {
      id: "task",
      title: "Buat Task / Issue Pertama",
      description: tasksCount > 0 ? `${tasksCount} task telah dibuat.` : "Tambahkan task untuk melacak pekerjaan tim.",
      completed: tasksCount > 0,
      actionText: "Tambah Issue",
      actionIcon: Plus,
      onAction: onOpenCreateTask,
    },
    {
      id: "member",
      title: "Undang Anggota Tim",
      description: membersCount > 1 ? `${membersCount} anggota telah bergabung.` : "Ajak rekan kerja untuk berkolaborasi.",
      completed: membersCount > 1,
      actionText: "Undang Member",
      actionIcon: Users,
      onAction: onOpenInviteMember,
    },
    {
      id: "push",
      title: "Aktifkan Notifikasi Windows",
      description: hasPushEnabled ? "Notifikasi background Windows aktif." : "Terima update realtime walau tab ditutup.",
      completed: hasPushEnabled,
      actionText: "Aktifkan Push",
      actionIcon: Bell,
      onAction: onEnablePush,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Jika journey / checklist sudah 100% selesai, otomatis hilangkan
  if (completedCount === steps.length || progressPercent >= 100) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-border/80 bg-card/95 backdrop-blur-sm p-4 shadow-sm transition-all animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-[var(--workspace-accent)]/15 text-[var(--workspace-accent)] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-foreground tracking-tight">
                Langkah Awal Anda di {workspaceName}
              </h4>
              <span className="font-mono text-[10px] font-medium px-1.5 py-0.2 rounded bg-muted/70 text-muted-foreground">
                {completedCount} / {steps.length} Selesai ({progressPercent}%)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Selesaikan panduan onboarding ini untuk memaksimalkan kolaborasi kerja tim Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={isCollapsed ? "Buka Checklist" : "Sembunyikan Checklist"}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Tutup Panduan"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/60 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-[var(--workspace-accent)] transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Items List */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border/60">
          {steps.map((step) => {
            const Icon = step.actionIcon;
            return (
              <div
                key={step.id}
                className={`rounded-lg border p-2.5 transition-all flex flex-col justify-between ${
                  step.completed
                    ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "border-border/70 bg-background/50 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-medium leading-tight ${
                        step.completed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-1">
                      {step.description}
                    </div>
                  </div>
                </div>

                {!step.completed && step.onAction && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={step.onAction}
                      className="h-6 px-2 text-[11px] gap-1 rounded font-medium"
                    >
                      {Icon && <Icon className="h-3 w-3 text-[var(--workspace-accent)]" />}
                      <span>{step.actionText}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
