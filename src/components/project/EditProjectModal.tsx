"use client";

import React, { useState, useEffect } from "react";
import { Project, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Check,
  AlertTriangle,
  Lock,
  Loader2,
  FolderKanban,
  Sparkles,
  Rocket,
  Target,
  Code2,
  Layers,
  Zap,
  Globe,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser?: User;
  onUpdateProject: (
    projectId: string,
    data: {
      name: string;
      description: string;
      color: string;
      icon: string;
    }
  ) => Promise<void> | void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
}

const COLORS = [
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#64748b", // Slate
];

const ICONS = [
  { id: "FolderKanban", label: "Folder", Icon: FolderKanban },
  { id: "Sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "Rocket", label: "Rocket", Icon: Rocket },
  { id: "Target", label: "Target", Icon: Target },
  { id: "Code2", label: "Code", Icon: Code2 },
  { id: "Layers", label: "Layers", Icon: Layers },
  { id: "Zap", label: "Zap", Icon: Zap },
  { id: "Globe", label: "Globe", Icon: Globe },
];

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  currentUser,
  onUpdateProject,
  onDeleteProject,
}: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("FolderKanban");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = currentUser?.role !== "VIEWER";
  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setSelectedColor(project.color || COLORS[0]);
      setSelectedIcon(project.icon || "FolderKanban");
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || isSubmitting) return;
    if (!name.trim()) return;
    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!canEdit || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onUpdateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      setIsUpdateConfirmOpen(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onDeleteProject(project.id);
      setIsDeleteDialogOpen(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIconComp = ICONS.find((i) => i.id === selectedIcon)?.Icon || FolderKanban;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
        <DialogContent onClose={onClose} className="max-w-md p-5">
          <DialogHeader className="pb-2 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
              >
                <SelectedIconComp className="h-3.5 w-3.5" />
              </div>
              <DialogTitle className="text-sm font-semibold tracking-tight">
                {canEdit ? "Ubah Project" : "Detail Project"}
              </DialogTitle>
              {!canEdit && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-300 dark:border-amber-600/30 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-mono text-amber-800 dark:text-amber-300">
                  <Lock className="h-2.5 w-2.5" />
                  Viewer (Read-only)
                </span>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
            {/* Live Preview Pill */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedColor }}
                />
                <SelectedIconComp className="h-3.5 w-3.5 shrink-0" style={{ color: selectedColor }} />
                <span className="text-xs font-semibold text-foreground truncate">
                  {name.trim() || "Nama Project"}
                </span>
              </div>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: `${selectedColor}15`,
                  color: selectedColor,
                  borderColor: `${selectedColor}30`,
                }}
              >
                Preview
              </span>
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Nama Project *
              </label>
              <Input
                required
                disabled={!canEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Core Engine v2"
                className="text-xs h-8.5 border-border/80 bg-muted/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Deskripsi
              </label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tujuan, ruang lingkup, dan milestone project..."
                className="text-xs leading-relaxed border-border/80 bg-muted/20"
              />
            </div>

            {/* Icon Selector */}
            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1.5 block">
                Ikon Project
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {ICONS.map(({ id, Icon, label }) => {
                  const isSelected = selectedIcon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setSelectedIcon(id)}
                      title={label}
                      className={`h-8 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? "border ring-2 shadow-xs"
                          : "border border-border/60 bg-muted/10 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      } ${!canEdit ? "cursor-not-allowed opacity-50" : ""}`}
                      style={
                        isSelected
                          ? {
                              borderColor: selectedColor,
                              color: selectedColor,
                              backgroundColor: `${selectedColor}15`,
                              outlineColor: selectedColor,
                            }
                          : {}
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1.5 block">
                Warna Aksen Project
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setSelectedColor(c)}
                    className={`h-5.5 w-5.5 rounded-full transition-all flex items-center justify-center ${
                      selectedColor === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 shadow-xs"
                        : "opacity-70 hover:opacity-100"
                    } ${!canEdit ? "cursor-not-allowed opacity-50" : ""}`}
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && (
                      <Check className="h-3 w-3 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Danger Zone: Delete Project (Only Admin) */}
            {isAdmin && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Hapus Project
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Menghapus project ini dan seluruh task yang ada di dalamnya secara permanen.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="h-7 text-[11px] gap-1 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs"
              >
                {canEdit ? "Batal" : "Tutup"}
              </Button>
              {canEdit && (
                <Button
                  type="submit"
                  variant="asana"
                  size="sm"
                  disabled={isSubmitting || !name.trim()}
                  className="h-8 text-xs font-medium gap-1.5 min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Project Deletion */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Hapus Project &quot;{project.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Tindakan ini permanen dan tidak dapat dibatalkan. Semua issue, task, dan diskusi yang terafiliasi dengan project ini akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="h-8 text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Ya, Hapus Project</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Project Update */}
      <ConfirmationDialog
        open={isUpdateConfirmOpen}
        onOpenChange={setIsUpdateConfirmOpen}
        title="Simpan Perubahan Project?"
        description={`Apakah Anda yakin ingin memperbarui informasi dan konfigurasi project "${name}"? Perubahan ini akan langsung diterapkan ke seluruh workspace.`}
        confirmText="Ya, Simpan Perubahan"
        cancelText="Batal"
        variant="default"
        isLoading={isSubmitting}
        onConfirm={handleConfirmUpdate}
      />
    </>
  );
}
