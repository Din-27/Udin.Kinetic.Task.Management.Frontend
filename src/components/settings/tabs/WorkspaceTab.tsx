"use client";

import React, { useState, useEffect } from "react";
import { Workspace, WORKSPACE_ACCENT_COLORS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Lock, Check, Copy, Plus, Loader2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface WorkspaceTabProps {
  workspace: Workspace;
  isAdmin: boolean;
  onUpdateWorkspace: (updates: Partial<Workspace>) => void;
  onOpenCreateWorkspace?: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function WorkspaceTab({
  workspace,
  isAdmin,
  onUpdateWorkspace,
  onOpenCreateWorkspace,
  onClose,
  isLoading = false,
}: WorkspaceTabProps) {
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace.slug || "acme-prod");
  const [workspaceColor, setWorkspaceColor] = useState(workspace.color || "#6366f1");
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [copiedWsId, setCopiedWsId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);

  useEffect(() => {
    setWorkspaceName(workspace.name);
    setWorkspaceSlug(workspace.slug || "acme-prod");
    setWorkspaceColor(workspace.color || "#6366f1");
  }, [workspace]);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsConfirmSaveOpen(true);
  };

  const handleExecuteSave = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      await Promise.resolve(
        onUpdateWorkspace({
          name: workspaceName.trim() || workspace.name,
          slug: workspaceSlug.trim() || workspace.slug,
          color: workspaceColor,
        })
      );
      setWorkspaceSaved(true);
      setIsConfirmSaveOpen(false);
      setTimeout(() => setWorkspaceSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg animate-fade-in">
        {/* Workspace ID Box Skeleton */}
        <div className="space-y-2 p-3.5 rounded-lg border border-border/80 bg-muted/20">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Workspace Name & Slug Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>

        {/* Accent Color Palette Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-36 rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full" />
            ))}
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveWorkspace} className="space-y-4 max-w-lg">
      {!isAdmin && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-500 dark:text-amber-400 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Hanya akun Admin yang dapat mengubah konfigurasi workspace.</span>
        </div>
      )}

      {/* Workspace ID Display (Bisa disalin untuk alur Join Workspace) */}
      <div className="space-y-2 p-3.5 rounded-lg border border-border/80 bg-muted/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Workspace ID</span>
          </label>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border/60 bg-background text-muted-foreground">
            ID Unik
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-md border border-border/80 bg-background text-foreground truncate select-all">
            {workspace.id || "ws-default"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (workspace.id) {
                navigator.clipboard.writeText(workspace.id);
                setCopiedWsId(true);
                setTimeout(() => setCopiedWsId(false), 2000);
              }
            }}
            className="h-8 text-xs px-2.5 gap-1.5 shrink-0"
          >
            {copiedWsId ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin ID</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Bagikan ID ini ke rekan kerja Anda agar mereka dapat bergabung melalui menu &quot;Gabung Workspace Lain&quot;.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Workspace Name
          </label>
          <Input
            value={workspaceName}
            disabled={!isAdmin || isSaving}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Workspace Name"
            className="h-8 text-xs bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Workspace URL Slug
          </label>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-mono">app.kinetic.internal/</span>
            <Input
              value={workspaceSlug}
              disabled={!isAdmin || isSaving}
              onChange={(e) => setWorkspaceSlug(e.target.value)}
              className="h-8 text-xs bg-transparent font-mono"
            />
          </div>
        </div>

        {/* Workspace Theme Accent Color */}
        <div className="space-y-2 pt-2 border-t border-border/70">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">
              Workspace Signature Color
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {workspaceColor}
              </span>
              <div
                className="w-4 h-4 rounded-full border border-border shadow-xs shrink-0"
                style={{ backgroundColor: workspaceColor }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Warna identitas khas untuk workspace ini. Setiap workspace memiliki tema visual masing-masing.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {WORKSPACE_ACCENT_COLORS.map((c) => {
              const isSelected = workspaceColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={!isAdmin || isSaving}
                  onClick={() => {
                    setWorkspaceColor(c.value);
                    if (isAdmin) {
                      onUpdateWorkspace({ color: c.value });
                    }
                  }}
                  title={c.name}
                  className={`group relative h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 shadow-sm"
                      : "hover:scale-105 opacity-85 hover:opacity-100"
                  } ${!isAdmin || isSaving ? "cursor-not-allowed opacity-50" : ""}`}
                  style={{ backgroundColor: c.value }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3] drop-shadow-sm" />}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <div className="relative flex items-center ml-1">
              <label
                className={`h-7 px-2.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground flex items-center gap-1.5 cursor-pointer transition-all ${
                  !isAdmin || isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Pilih warna custom"
              >
                <span>Custom</span>
                <input
                  type="color"
                  disabled={!isAdmin || isSaving}
                  value={workspaceColor}
                  onChange={(e) => {
                    setWorkspaceColor(e.target.value);
                    if (isAdmin) {
                      onUpdateWorkspace({ color: e.target.value });
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            variant="asana"
            size="sm"
            className="h-8 text-xs px-4"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : workspaceSaved ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
                Workspace Updated
              </>
            ) : (
              "Save Workspace"
            )}
          </Button>
        </div>
      )}

      {onOpenCreateWorkspace && (
        <div className="pt-4 border-t border-border/70 flex items-center justify-between">
          <div>
            <h5 className="text-xs font-semibold text-foreground">Buat Workspace Lain</h5>
            <p className="text-[11px] text-muted-foreground">Tambah workspace baru untuk tim atau proyek terpisah.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onOpenCreateWorkspace();
            }}
            className="text-xs h-8 gap-1.5"
          >
            <Plus className="h-3 w-3" />
            <span>New Workspace</span>
          </Button>
        </div>
      )}
      {/* Confirmation Dialog for Workspace Update */}
      <ConfirmationDialog
        open={isConfirmSaveOpen}
        onOpenChange={setIsConfirmSaveOpen}
        title="Simpan Pengaturan Workspace?"
        description={`Apakah Anda yakin ingin memperbarui konfigurasi workspace "${workspaceName}"? Pengaturan nama, URL slug, dan warna tema akan diterapkan secara langsung.`}
        confirmText="Ya, Simpan Pengaturan"
        cancelText="Batal"
        variant="default"
        isLoading={isSaving}
        onConfirm={handleExecuteSave}
      />
    </form>
  );
}
