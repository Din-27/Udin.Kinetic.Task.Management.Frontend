"use client";

import React, { useState, useEffect } from "react";
import { Project, User, TaskStatus, TaskPriority, TaskVisibility } from "@/types";
import { Button } from "@/components/ui/button";
import { useBoardColumnsQuery } from "@/lib/hooks/useBoardColumnsQueries";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Calendar,
  User as UserIcon,
  Layers,
  Clock,
  Globe,
  Lock,
  Tag,
  Check,
  Plus,
  UserX,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { getTagColor } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface CreateTaskModalProps {
  isOpen: boolean;
  projects: Project[];
  users: User[];
  defaultProjectId: string;
  defaultStatus?: TaskStatus;
  defaultAssigneeId?: string;
  onClose: () => void;
  onCreateTask: (data: {
    title: string;
    description: string;
    projectId: string;
    status: TaskStatus;
    priority: TaskPriority;
    visibility: TaskVisibility;
    dueDate: string | null;
    assigneeId: string | null;
    tags?: string[];
  }) => Promise<void> | void;
}

export function CreateTaskModal({
  isOpen,
  projects,
  users,
  defaultProjectId,
  defaultStatus = "TODO",
  defaultAssigneeId = "",
  onClose,
  onCreateTask,
}: CreateTaskModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [visibility, setVisibility] = useState<TaskVisibility>("PUBLIC");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssigneeId);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  const [boardColumns, setBoardColumns] = useState<any[]>([
    { id: "BACKLOG", title: "Backlog" },
    { id: "TODO", title: "To Do" },
    { id: "IN_PROGRESS", title: "In Progress" },
    { id: "IN_REVIEW", title: "In Review" },
    { id: "DONE", title: "Done" },
  ]);

  const currentWsId =
    projects.find((p) => p.id === (projectId || defaultProjectId))?.workspaceId ||
    projects[0]?.workspaceId ||
    "default";

  // TanStack Query: Board columns sync
  const { data: serverCols } = useBoardColumnsQuery(isOpen ? currentWsId : undefined);

  React.useEffect(() => {
    if (serverCols && Array.isArray(serverCols) && serverCols.length > 0) {
      setBoardColumns(serverCols);
    }
  }, [serverCols]);

  const availableStatuses = boardColumns;

  React.useEffect(() => {
    if (isOpen) {
      setProjectId(defaultProjectId || projects[0]?.id || "");
      setStatus(defaultStatus);
      if (defaultAssigneeId) {
        setAssigneeId(defaultAssigneeId);
      }
      setSelectedTags([]);
      setCustomTagInput("");
    }
  }, [isOpen, defaultProjectId, defaultStatus, defaultAssigneeId, projects]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim();
    if (clean && !selectedTags.map((t) => t.toLowerCase()).includes(clean.toLowerCase())) {
      setSelectedTags([...selectedTags, clean]);
      setCustomTagInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onCreateTask({
        title: title.trim(),
        description: description.trim(),
        projectId: projectId || defaultProjectId,
        status,
        priority,
        visibility,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeId: assigneeId || null,
        tags: selectedTags,
      });

      // Reset & close
      setTitle("");
      setDescription("");
      setVisibility("PUBLIC");
      setSelectedTags([]);
      onClose();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} className="max-w-lg p-5">
        <DialogHeader className="pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-semibold tracking-tight">
              {t("common.newTask", "Task Baru")}
            </DialogTitle>
            <span className="text-[11px] font-mono text-muted-foreground/60">
              in {projects.find((p) => p.id === projectId)?.name || "Project"}
            </span>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          <div>
            <Input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("task.titlePlaceholder", "Tuliskan judul issue...")}
              className="text-sm font-medium h-9 border-border/80 focus-visible:ring-foreground/20 rounded-md"
            />
          </div>

          <div>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("task.descriptionPlaceholder", "Tambahkan detail konteks, spesifikasi teknis, atau catatan penting...")}
              className="text-xs leading-relaxed border-border/80 focus-visible:ring-foreground/20 rounded-md"
            />
          </div>

          {/* Linear Inspector Fields Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                <Layers className="h-3 w-3 shrink-0" />
                <span className="truncate">{t("nav.projects", "Project")}</span>
              </label>
              <Select
                value={projectId || defaultProjectId}
                onValueChange={(val) => setProjectId(val)}
              >
                <SelectTrigger className="h-8 w-full min-w-0">
                  <SelectValue placeholder="Pilih Project">
                    {(() => {
                      const p = projects.find((item) => item.id === (projectId || defaultProjectId));
                      if (!p) return null;
                      return (
                        <div className="flex items-center gap-2 truncate">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                <UserIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{t("task.assignee", "Penanggung Jawab")}</span>
              </label>
              <Select
                value={assigneeId}
                onValueChange={(val) => setAssigneeId(val)}
              >
                <SelectTrigger className="h-8 w-full min-w-0">
                  <SelectValue placeholder={t("task.unassigned", "Unassigned")}>
                    {(() => {
                      const u = users.find((user) => user.id === assigneeId);
                      if (!u) {
                        return (
                          <div className="flex items-center gap-2 truncate text-muted-foreground">
                            <UserX className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t("task.unassigned", "Unassigned")}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2 truncate">
                          <Avatar src={u.avatar} fallback={u.name} size="xs" />
                          <span className="truncate">{u.name}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <div className="flex items-center gap-2">
                      <UserX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{t("task.unassigned", "Unassigned")}</span>
                    </div>
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <Avatar src={u.avatar} fallback={u.name} size="xs" />
                        <span className="truncate">{u.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                <StatusIcon status={status} size={12} />
                <span className="truncate">{t("task.status", "Status")}</span>
              </label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as TaskStatus)}
              >
                <SelectTrigger className="h-8 w-full min-w-0">
                  <SelectValue placeholder={t("task.status", "Status")}>
                    <div className="flex items-center gap-2 truncate">
                      <StatusIcon status={status} size={13} />
                      <span className="truncate">{availableStatuses.find((s) => s.id === status)?.title || status}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={s.id} size={13} />
                        <span className="truncate">{s.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                <PriorityIcon priority={priority} size={12} />
                <span className="truncate">{t("task.priority", "Prioritas")}</span>
              </label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as TaskPriority)}
              >
                <SelectTrigger className="h-8 w-full min-w-0">
                  <SelectValue placeholder={t("task.priority", "Prioritas")}>
                    <div className="flex items-center gap-2 truncate">
                      <PriorityIcon priority={priority} size={13} />
                      <span className="capitalize">{priority.toLowerCase()}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={p} size={13} />
                        <span className="capitalize">{p.toLowerCase()}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">{t("task.dueDate", "Tenggat Waktu")}</span>
              </label>
              <DatePicker
                date={dueDate ? new Date(dueDate) : null}
                onSelect={(selected) =>
                  setDueDate(selected ? selected.toISOString().split("T")[0] : "")
                }
                placeholder={t("task.selectDate", "Pilih tanggal")}
                className="h-8"
                align="start"
              />
            </div>

            <div className="min-w-0">
              <label className="text-[11px] font-mono text-muted-foreground mb-1 flex items-center gap-1.5">
                {visibility === "PUBLIC" ? (
                  <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                ) : (
                  <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                )}
                <span className="truncate">{t("task.visibility", "Visibilitas")}</span>
              </label>
              <Select
                value={visibility}
                onValueChange={(val) => setVisibility(val as TaskVisibility)}
              >
                <SelectTrigger className="h-8 w-full min-w-0">
                  <SelectValue placeholder={t("task.visibility", "Pilih Visibilitas")}>
                    <span className="flex items-center gap-1.5 truncate">
                      {visibility === "PUBLIC" ? (
                        <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>
                        {visibility === "PUBLIC"
                          ? t("task.visibilityPublic", "Publik (Semua tim workspace)")
                          : t("task.visibilityPrivate", "Privat (Kolaborator & Admin)")}
                      </span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    <span className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{t("task.visibilityPublic", "Publik (Semua tim workspace)")}</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="PRIVATE">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{t("task.visibilityPrivate", "Privat (Kolaborator & Admin)")}</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags / Labels Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                {t("task.tags", "Tags & Label")}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {selectedTags.length} dipilih
              </span>
            </label>

            {/* Quick Pick Recommended Tags */}
            <div className="flex flex-wrap gap-1">
              {["Frontend", "Backend", "Design", "Bug", "Feature", "Database"].map((tTag) => {
                const isSelected = selectedTags.includes(tTag);
                const color = getTagColor(tTag);
                return (
                  <button
                    key={tTag}
                    type="button"
                    onClick={() => toggleTag(tTag)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-all inline-flex items-center gap-1 ${
                      isSelected
                        ? `${color.bg} ${color.text} ${color.border} font-semibold shadow-2xs ring-1 ring-foreground/20`
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                    ) : (
                      <Plus className="h-2.5 w-2.5" />
                    )}
                    <span>{tTag}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder={t("task.tagPlaceholder", "Tag kustom (tekan Enter)...")}
                className="h-7 text-xs bg-muted/20 border-border/80"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="h-7 px-2 text-xs"
              >
                +
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <DialogFooter className="mt-4 pt-3 border-t border-border/80">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-8 text-xs">
              {t("common.cancel", "Batal")}
            </Button>
            <Button
              type="submit"
              variant="asana"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="h-8 text-xs gap-1.5 font-medium min-w-[90px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("common.saving", "Menyimpan...")}</span>
                </>
              ) : (
                <>
                  <span>{t("common.create", "Buat")} {t("common.newTask", "Task")}</span>
                  <kbd className="hidden sm:inline-flex items-center font-mono text-[9px] opacity-70 px-1 py-0.5 rounded bg-background/20">
                    <CornerDownLeft className="h-2.5 w-2.5" />
                  </kbd>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
