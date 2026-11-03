"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderPlus,
  Loader2,
  Check,
  FolderKanban,
  Sparkles,
  Rocket,
  Target,
  Code2,
  Layers,
  Zap,
  Globe,
} from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: {
    name: string;
    description: string;
    color: string;
    icon: string;
  }) => Promise<void> | void;
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

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("FolderKanban");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onCreateProject({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });

      setName("");
      setDescription("");
      setSelectedColor(COLORS[0]);
      setSelectedIcon("FolderKanban");
      onClose();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIconComp = ICONS.find((i) => i.id === selectedIcon)?.Icon || FolderKanban;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md p-5">
        <DialogHeader className="pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </div>
            <DialogTitle className="text-sm font-semibold tracking-tight">
              Tambah Project Baru
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2.5 space-y-3.5">
          {/* Live Preview Pill */}
          <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
              <SelectedIconComp className="h-3.5 w-3.5 shrink-0" style={{ color: selectedColor }} />
              <span className="text-xs font-semibold text-foreground truncate">
                {name.trim() || "Nama Project Anda"}
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
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Mobile App Redesign, Marketing Q4..."
              className="text-xs h-8.5 border-border/80 bg-muted/20"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
              Deskripsi
            </label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tujuan, target milestone, atau ringkasan project..."
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
                    onClick={() => setSelectedIcon(id)}
                    title={label}
                    className={`h-8 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? "border ring-2 shadow-xs"
                        : "border border-border/60 bg-muted/10 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
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
                  onClick={() => setSelectedColor(c)}
                  className={`h-5.5 w-5.5 rounded-full transition-all flex items-center justify-center ${
                    selectedColor === c
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 shadow-xs"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selectedColor === c && (
                    <Check className="h-3 w-3 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Batal
            </Button>
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
                  <span>Membuat...</span>
                </>
              ) : (
                <span>Buat Project</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
