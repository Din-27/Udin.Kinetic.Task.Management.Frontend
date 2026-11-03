"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toastAlert } from "@/components/ui/alert-toast";
import {
  getOutlookSchedulerConfig,
  saveOutlookSchedulerConfig,
  OutlookSchedulerConfig,
  OUTLOOK_SCHEDULER_EVENT,
} from "@/lib/outlook-scheduler";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Clock, RefreshCw, Check, Loader2, Sparkles, FolderKanban } from "lucide-react";
import { Workspace } from "@/types";

interface OutlookTabProps {
  onClose: () => void;
  onOpenOutlookSync?: () => void;
  onTriggerManualSync?: () => Promise<void>;
  isLoading?: boolean;
  workspace?: Workspace;
}

export function OutlookTab({
  onClose,
  onOpenOutlookSync,
  onTriggerManualSync,
  isLoading = false,
  workspace,
}: OutlookTabProps) {
  const [schedulerConfig, setSchedulerConfig] = useState<OutlookSchedulerConfig>(() =>
    getOutlookSchedulerConfig()
  );
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [schedulerSaved, setSchedulerSaved] = useState(false);
  const [isSavingScheduler, setIsSavingScheduler] = useState(false);

  useEffect(() => {
    setSchedulerConfig(getOutlookSchedulerConfig());
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<OutlookSchedulerConfig>;
      if (customEvent.detail) setSchedulerConfig(customEvent.detail);
    };
    window.addEventListener(OUTLOOK_SCHEDULER_EVENT, handleUpdate);
    return () => window.removeEventListener(OUTLOOK_SCHEDULER_EVENT, handleUpdate);
  }, []);

  const handleUpdateScheduler = async (updates: Partial<OutlookSchedulerConfig>) => {
    setIsSavingScheduler(true);
    try {
      const updated = {
        ...schedulerConfig,
        ...updates,
        workspaceId: workspace?.id || schedulerConfig.workspaceId,
      };
      setSchedulerConfig(updated);
      const res = await saveOutlookSchedulerConfig(updated, workspace?.id);

      if (updates.enabled === true && res.project) {
        toastAlert({
          title: "Project Dibuat Otomatis",
          description: `Project "${res.project.name}" otomatis dibuat untuk menampung issue dari schedule email.`,
          variant: "success",
        });
      }

      setSchedulerSaved(true);
      setTimeout(() => setSchedulerSaved(false), 2000);
    } finally {
      setIsSavingScheduler(false);
    }
  };

  const handleRunManualSync = async () => {
    if (!onTriggerManualSync) return;
    setIsSyncingNow(true);
    toastAlert({
      title: "Memulai Sinkronisasi Outlook...",
      description: "AI sedang membaca email anggota workspace dan mengekstrak issue.",
      variant: "info",
    });
    try {
      await onTriggerManualSync();
    } finally {
      setIsSyncingNow(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg animate-fade-in">
        {/* Header & Status Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-40 rounded" />
            <Skeleton className="h-2.5 w-64 rounded" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>

        {/* Worker Status Card Skeleton */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>

        {/* Sync Controls Skeleton */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <Skeleton className="h-3.5 w-32 rounded" />
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Skeleton className="h-8 rounded-md" />
            <Skeleton className="h-8 rounded-md" />
          </div>
          <div className="flex justify-end pt-2">
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <span>Outlook & AI Sync Scheduler</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Otomatisasi pengambilan email Microsoft Outlook anggota workspace dan ekstraksi task backlog via AI.
          </p>
        </div>
        {isSavingScheduler ? (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border/60">
            <Loader2 className="h-3 w-3 animate-spin" />
            Menyimpan...
          </span>
        ) : schedulerSaved ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="h-3 w-3" />
            Tersimpan
          </span>
        ) : null}
      </div>

      {/* Worker Status Card */}
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                schedulerConfig.enabled
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-zinc-400"
              }`}
            />
            <span className="text-xs font-semibold text-foreground">
              Status Background Worker:{" "}
              <span className={schedulerConfig.enabled ? "text-emerald-500" : "text-muted-foreground"}>
                {schedulerConfig.enabled ? "Aktif & Berjalan" : "Nonaktif (Hanya Manual)"}
              </span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/80 bg-background/80 px-2 py-0.5 rounded border border-border/60">
            {schedulerConfig.mode === "interval"
              ? `Tiap ${schedulerConfig.intervalMinutes || 30} menit`
              : `Setiap ${schedulerConfig.scheduledTime || "09:00"} WIB`}
          </span>
        </div>

        <div className="text-[11px] text-muted-foreground space-y-1">
          <div>
            Terakhir disinkronkan:{" "}
            <span className="font-medium text-foreground">
              {schedulerConfig.lastSyncTime
                ? new Date(schedulerConfig.lastSyncTime).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })
                : "Belum pernah disinkronkan"}
            </span>
            {schedulerConfig.lastCreatedCount !== undefined && (
              <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                ({schedulerConfig.lastCreatedCount} task baru)
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3 text-blue-500" />
            <span>Target: <strong className="text-foreground">Issues from Outlook</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-purple-500" />
            <span>AI: <strong className="text-foreground">Respan: Span-01 Lite</strong></span>
          </div>
        </div>
      </div>

      {/* Automation Toggle Switch */}
      <div className="rounded-lg border border-border/80 bg-card p-3 space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-foreground">
              Sinkronisasi Otomatis
            </div>
            <div className="text-[11px] text-muted-foreground">
              Jalankan worker di background untuk memeriksa email masuk secara berkala.
            </div>
          </div>
          <input
            type="checkbox"
            checked={schedulerConfig.enabled}
            onChange={(e) =>
              handleUpdateScheduler({ enabled: e.target.checked })
            }
            className="h-4 w-4 rounded accent-foreground cursor-pointer"
          />
        </label>

        {schedulerConfig.enabled && (
          <div className="pt-3 border-t border-border/60 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Metode Penjadwalan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateScheduler({ mode: "interval" })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-md border py-1.5 px-3 text-xs font-medium transition-colors ${
                    schedulerConfig.mode === "interval"
                      ? "border-foreground bg-muted/60 text-foreground font-semibold"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>Interval Waktu</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateScheduler({ mode: "time" })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-md border py-1.5 px-3 text-xs font-medium transition-colors ${
                    schedulerConfig.mode === "time"
                      ? "border-foreground bg-muted/60 text-foreground font-semibold"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>Jam Spesifik</span>
                </button>
              </div>
            </div>

            {schedulerConfig.mode === "interval" ? (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Interval Pengambilan Email
                </label>
                <Select
                  value={String(schedulerConfig.intervalMinutes || 30)}
                  onValueChange={(val) =>
                    handleUpdateScheduler({ intervalMinutes: Number(val) })
                  }
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Pilih interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Setiap 15 Menit</SelectItem>
                    <SelectItem value="30">
                      Setiap 30 Menit (Default Direkomendasikan)
                    </SelectItem>
                    <SelectItem value="60">Setiap 1 Jam (60 Menit)</SelectItem>
                    <SelectItem value="120">Setiap 2 Jam (120 Menit)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Aplikasi akan mengecek inbox email setiap selang waktu di atas.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Jadwal Jam Eksekusi (WIB)
                </label>
                <Input
                  type="time"
                  value={schedulerConfig.scheduledTime || "09:00"}
                  onChange={(e) =>
                    handleUpdateScheduler({ scheduledTime: e.target.value })
                  }
                  className="w-full h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Worker akan otomatis memproses email satu kali setiap hari pada jam ini.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions: Manual Sync & Interactive Scan */}
      <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onClose();
            if (onOpenOutlookSync) onOpenOutlookSync();
          }}
          className="h-8 text-xs gap-1.5"
        >
          <Mail className="h-3.5 w-3.5 text-blue-500" />
          <span>Buka Panel Scan AI Interaktif</span>
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={isSyncingNow || !onTriggerManualSync}
          onClick={handleRunManualSync}
          className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncingNow ? "animate-spin" : ""}`} />
          <span>{isSyncingNow ? "Memproses..." : "Sync Sekarang"}</span>
        </Button>
      </div>
    </div>
  );
}
