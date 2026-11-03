"use client";

import React, { useState } from "react";
import {
  Mail,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  Users,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { User, Task } from "@/types";
import { useOutlookSyncMutation } from "@/lib/hooks/useOutlookQueries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface OutlookSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  projectId?: string;
  members: User[];
  onTasksCreated?: (newTasks: Task[]) => void;
}

export function OutlookSyncModal({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  members,
  onTasksCreated,
}: OutlookSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    totalScanned: number;
    createdCount: number;
    skippedCount: number;
    createdTasks: {
      task: Task;
      category: string;
      reasoning: string;
      originalEmail: any;
    }[];
    skippedEmails: {
      subject: string;
      sender: string;
      category: string;
      reason: string;
    }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  const syncMutation = useOutlookSyncMutation();

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const memberEmails = members.map((m) => m.email).filter(Boolean);
      const data = await syncMutation.mutateAsync({
        workspaceId: workspaceId || "",
        projectId,
        memberEmails,
      });

      setResult(data);

      if (data.createdTasks && data.createdTasks.length > 0 && onTasksCreated) {
        const tasks = data.createdTasks.map((item: any) => item.task);
        onTasksCreated(tasks);
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan sistem saat memproses email.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "ERROR":
      case "BUG":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "ISSUE":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "REQUEST":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                Integrasi Outlook & AI Task Generator
                <span className="flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-3 w-3" /> AI Powered
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ekstrak tiket backlog secara otomatis dari email masuk anggota workspace
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !isLoading && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
                <h3 className="font-medium text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Cara Kerja Filter AI
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>
                    AI membaca email masuk dari anggota tim yang terdaftar di workspace.
                  </li>
                  <li>
                    Mendeteksi dan mengklasifikasikan <strong>Permintaan Fitur (Request)</strong>,{" "}
                    <strong>Kendala/Gangguan (Issue)</strong>, dan <strong>Error Sistem (Error/Bug)</strong>.
                  </li>
                  <li>
                    <strong className="text-foreground">Percakapan santai</strong> (ajakan makan, ucapan selamat, sapaan santai) <em>otomatis diabaikan</em> tanpa membuat tiket sampah.
                  </li>
                  <li>
                    Prioritas (<strong>URGENT, HIGH, MEDIUM, LOW</strong>) diatur secara otomatis berdasarkan urgensi masalah.
                  </li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Anggota Workspace yang Dipindai ({members.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted border border-border text-foreground"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {m.name} <span className="text-muted-foreground text-[10px]">({m.email})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="h-5 w-5 text-primary absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm text-foreground">
                  Sedang Menganalisis Email Anggota dengan AI...
                </p>
                <p className="text-xs text-muted-foreground">
                  Membedakan percakapan santai dari laporan issue & permintaan teknis
                </p>
              </div>

              {/* Skeleton cards simulating scanning emails */}
              <div className="w-full space-y-2 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-1.5 text-left flex-1">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-2.5 w-1/2 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Total Email</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {result.totalScanned}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Backlog Dibuat
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{result.createdCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-muted bg-muted/30">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Chat Diabaikan
                  </div>
                  <div className="text-lg font-bold text-muted-foreground mt-0.5">
                    {result.skippedCount}
                  </div>
                </div>
              </div>

              {/* Created Tasks List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Task Backlog yang Berhasil Dibuat
                </h4>
                {result.createdTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-lg text-center">
                    Tidak ada task baru yang terdeteksi dari email saat ini.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {result.createdTasks.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border bg-card hover:border-foreground/20 transition-all space-y-1.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground text-xs leading-snug">
                            {item.task.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border uppercase ${getCategoryBadge(
                                item.category
                              )}`}
                            >
                              {item.category}
                            </span>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-medium text-foreground">
                              <PriorityIcon priority={item.task.priority} size={11} />
                              {item.task.priority}
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-[11px] line-clamp-2">
                          {item.reasoning}
                        </p>
                        <div className="text-[10px] text-muted-foreground/75 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Dari: {item.originalEmail?.senderName || "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skipped Casual Chats Section */}
              {result.skippedEmails.length > 0 && (
                <div className="border-t border-border pt-3">
                  <button
                    onClick={() => setShowSkipped(!showSkipped)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                  >
                    {showSkipped ? "Sembunyikan" : "Tampilkan"} Percakapan Biasa yang Diabaikan AI (
                    {result.skippedEmails.length})
                  </button>

                  {showSkipped && (
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                      {result.skippedEmails.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-muted/40 border border-border/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-medium text-muted-foreground">
                              {item.subject}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70">
                              {item.sender} &bull; {item.reason}
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border">
                            Percakapan Santai
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/30 flex items-center justify-between m-0">
          <div className="text-[11px] text-muted-foreground">
            {result ? "Semua task otomatis masuk ke kolom Backlog." : "Outlook Mail &bull; Microsoft Graph Ready"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              {result ? "Tutup" : "Batal"}
            </Button>
            {!result ? (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={isLoading}
                className="text-xs flex items-center gap-1.5"
              >
                {isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Scan Email Outlook
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={isLoading}
                variant="outline"
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Scan Ulang
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
