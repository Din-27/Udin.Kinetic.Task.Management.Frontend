"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskVisibility,
  User,
  Workspace,
  CommentAttachment,
  BoardColumn,
  DEFAULT_BOARD_COLUMNS,
} from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBoardColumnsQuery } from "@/lib/hooks/useBoardColumnsQueries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  X,
  Calendar,
  User as UserIcon,
  CheckSquare,
  MessageSquare,
  Trash2,
  Send,
  Plus,
  Clock,
  Layers,
  Check,
  FileText,
  Sliders,
  Maximize2,
  Minimize2,
  GripVertical,
  Share2,
  Link2,
  Globe,
  Lock,
  Tag,
  Users,
  UserPlus,
  UserX,
  MoreVertical,
} from "lucide-react";
import { markAsRead } from "@/lib/unread-chat-service";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { triggerTaskCelebration } from "@/lib/confetti";
import { formatRelativeDate, getTagColor } from "@/lib/utils";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { toastAlert } from "@/components/ui/alert-toast";
import { copyTaskShareUrl } from "@/lib/share-utils";
import { extractMentions } from "@/lib/mention-utils";
import { TaskChatFeed } from "./TaskChatFeed";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AppNotification } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface TaskDetailDrawerProps {
  task: Task | null;
  users: User[];
  currentUser: User;
  workspace?: Workspace;
  workspaceId?: string;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (subtaskId: string, completed: boolean) => void;
  onAddComment: (taskId: string, content: string, attachments?: CommentAttachment[], commentId?: string) => void;
  onAddNotification?: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
}

export function TaskDetailDrawer({
  task,
  users,
  currentUser,
  workspace,
  workspaceId,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onAddComment,
  onAddNotification,
}: TaskDetailDrawerProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [copiedLink, setCopiedLink] = useState(false);

  // Tag & Collaborator Input State
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingCollab, setIsAddingCollab] = useState(false);

  // Drawer Resizing State
  const [drawerWidth, setDrawerWidth] = useState<number>(660);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const previousWidthRef = useRef<number>(660);

  const handleCopyLink = async () => {
    if (!task) return;
    const wsParam = workspace?.slug || workspace?.id || workspaceId || "ws-1";
    const success = await copyTaskShareUrl(task.id, task.projectId, wsParam);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toastAlert({
        title: "Tautan Task Disalin",
        description: "Hanya anggota di workspace & project yang sama yang dapat membuka tautan ini.",
      });
    } else {
      toastAlert({
        title: "Gagal Menyalin Tautan",
        description: "Tidak dapat mengakses clipboard perangkat Anda.",
        variant: "destructive",
      });
    }
  };

  // Load saved width from localStorage
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem("kinetic_drawer_width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 440 && parsed <= 1400) {
          setDrawerWidth(parsed);
          previousWidthRef.current = parsed;
        }
      }
    } catch {}
  }, []);

  // Synchronize internal state with selected task & tandai telah dibaca
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      markAsRead(`task_${task.id}`);
    }
  }, [task]);

  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>(DEFAULT_BOARD_COLUMNS);

  const activeWs = workspaceId || workspace?.id || "default";
  // TanStack Query: Board columns sync
  const { data: serverCols } = useBoardColumnsQuery(activeWs);

  useEffect(() => {
    if (serverCols && Array.isArray(serverCols) && serverCols.length > 0) {
      setBoardColumns(serverCols);
    }
  }, [serverCols]);

  const availableStatuses = boardColumns;

  // Handle Drag Resizing on Window
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minW = 440;
      const maxW = Math.min(1300, window.innerWidth - 64);
      const clamped = Math.max(minW, Math.min(newWidth, maxW));
      setDrawerWidth(clamped);
      setIsExpanded(clamped >= 950);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem("kinetic_drawer_width", String(drawerWidth));
      } catch {}
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, drawerWidth]);

  if (!task) return null;

  const taskKey = `TSK-${(task.id.replace(/\D/g, "") || task.id.slice(-3)).padStart(2, "0")}`;
  const isViewer = currentUser.role === "VIEWER";
  const isAdmin = currentUser.role === "ADMIN";

  const handleTitleBlur = () => {
    if (isViewer) return;
    if (title.trim() && title !== task.title) {
      onUpdateTask(task.id, { title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (isViewer) return;
    if (description !== task.description) {
      onUpdateTask(task.id, { description });
    }
  };

  const handleToggleCompleted = () => {
    if (isViewer) {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk mengubah status issue ini.",
        variant: "warning",
      });
      return;
    }
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      triggerTaskCelebration();
    }
    onUpdateTask(task.id, {
      completed: nextCompleted,
      status: nextCompleted ? "DONE" : "IN_PROGRESS",
    });
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
  };

  // Tag Actions with Notifications & Auto-Collaborator if tag matches a team member
  const handleAddTag = (tagToAdd: string) => {
    if (isViewer) return;
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    const currentTags = task.tags || [];
    if (currentTags.map((t) => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
      toastAlert({
        title: "Tag Sudah Ada",
        description: `Tag "${cleanTag}" sudah ditambahkan pada issue ini.`,
        variant: "warning",
      });
      return;
    }

    const updatedTags = [...currentTags, cleanTag];

    // Deteksi apakah tag ini mencocoki anggota tim (misal @Nama atau Nama)
    const normalized = cleanTag.replace(/^@/, "").toLowerCase();
    const matchingUser = users.find(
      (u) =>
        u.name.toLowerCase() === normalized ||
        u.email.toLowerCase() === normalized ||
        u.email.split("@")[0].toLowerCase() === normalized
    );

    const currentIds = task.collaboratorIds || [];
    let updatedCollabIds = currentIds;
    let addedUser: User | null = null;

    if (matchingUser && !currentIds.includes(matchingUser.id)) {
      updatedCollabIds = [...currentIds, matchingUser.id];
      addedUser = matchingUser;
    }

    onUpdateTask(task.id, {
      tags: updatedTags,
      ...(addedUser ? { collaboratorIds: updatedCollabIds } : {}),
    });

    setNewTagInput("");
    setIsAddingTag(false);

    if (addedUser) {
      toastAlert({
        title: "Tag & Kolaborator Ditambahkan",
        description: `Tag "${cleanTag}" ditambahkan dan ${addedUser.name} otomatis menjadi kolaborator.`,
        variant: "success",
      });
      if (onAddNotification) {
        onAddNotification({
          title: "Ditambahkan Sebagai Kolaborator",
          message: `${currentUser.name} men-tag Anda di ${taskKey} sehingga otomatis menjadi kolaborator.`,
          type: "COLLABORATOR_ADDED",
          taskId: task.id,
          taskTitle: task.title,
          actor: currentUser,
        });
      }
    } else {
      toastAlert({
        title: "Tag Ditambahkan",
        description: `Tag "${cleanTag}" berhasil ditambahkan ke ${taskKey}.`,
      });
      if (onAddNotification) {
        onAddNotification({
          title: "Tag Ditambahkan",
          message: `${currentUser.name} menambahkan tag "${cleanTag}" pada task ${taskKey}`,
          type: "TAG_ADDED",
          taskId: task.id,
          taskTitle: task.title,
          actor: currentUser,
        });
      }
    }
  };

  // Handler komentar dengan deteksi tag @mention yang otomatis menjadikan user kolaborator
  const handleCommentWithAutoCollaborator = (
    content: string,
    attachments?: CommentAttachment[],
    commentId?: string
  ) => {
    onAddComment(task.id, content, attachments, commentId);

    // Otomatis jadikan kolaborator jika di-tag/mention di komentar
    const mentionedUsers = extractMentions(content, users);
    if (mentionedUsers.length > 0) {
      const currentIds = task.collaboratorIds || [];
      const newCollabIds: string[] = [];
      const newCollabNames: string[] = [];

      for (const m of mentionedUsers) {
        if (!currentIds.includes(m.id) && !newCollabIds.includes(m.id)) {
          newCollabIds.push(m.id);
          newCollabNames.push(m.name);
        }
      }

      if (newCollabIds.length > 0) {
        const updatedIds = [...currentIds, ...newCollabIds];
        onUpdateTask(task.id, { collaboratorIds: updatedIds });

        toastAlert({
          title: "Kolaborator Otomatis Ditambahkan",
          description: `${newCollabNames.join(", ")} otomatis menjadi kolaborator karena di-tag pada komentar task ini.`,
          variant: "success",
        });

        if (onAddNotification) {
          newCollabIds.forEach((cId) => {
            const u = users.find((usr) => usr.id === cId);
            onAddNotification({
              title: "Ditambahkan Sebagai Kolaborator",
              message: `${currentUser.name} me-mention Anda di komentar ${taskKey} sehingga Anda otomatis menjadi kolaborator.`,
              type: "COLLABORATOR_ADDED",
              taskId: task.id,
              taskTitle: task.title,
              actor: currentUser,
            });
          });
        }
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (isViewer) return;
    const currentTags = task.tags || [];
    const updatedTags = currentTags.filter(
      (t) => t.toLowerCase() !== tagToRemove.toLowerCase()
    );
    onUpdateTask(task.id, { tags: updatedTags });

    // Toast Alert
    toastAlert({
      title: "Tag Dihapus",
      description: `Tag "${tagToRemove}" telah dihapus dari ${taskKey}.`,
    });

    // Send Notification
    if (onAddNotification) {
      onAddNotification({
        title: "Tag Dihapus",
        message: `${currentUser.name} menghapus tag "${tagToRemove}" dari task ${taskKey}`,
        type: "TAG_REMOVED",
        taskId: task.id,
        taskTitle: task.title,
        actor: currentUser,
      });
    }
  };

  // Collaborator Actions with Notifications
  const handleAddCollaborator = (userId: string) => {
    if (isViewer) return;
    if (!userId) return;
    const currentIds = task.collaboratorIds || [];
    if (currentIds.includes(userId)) {
      toastAlert({
        title: "Kolaborator Sudah Ada",
        description: "Anggota tim ini sudah menjadi kolaborator.",
        variant: "warning",
      });
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    const updatedIds = [...currentIds, userId];
    onUpdateTask(task.id, { collaboratorIds: updatedIds });
    setIsAddingCollab(false);

    const targetName = targetUser?.name || "Anggota tim";
    toastAlert({
      title: "Kolaborator Ditambahkan",
      description: `${targetName} sekarang dapat berkolaborasi dan mengakses task ini.`,
    });

    if (onAddNotification) {
      onAddNotification({
        title: "Kolaborator Ditambahkan",
        message: `${currentUser.name} menambahkan ${targetName} sebagai kolaborator pada ${taskKey}`,
        type: "COLLABORATOR_ADDED",
        taskId: task.id,
        taskTitle: task.title,
        actor: currentUser,
      });
    }
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (isViewer) return;
    const currentIds = task.collaboratorIds || [];
    const targetUser = users.find((u) => u.id === userId);
    const updatedIds = currentIds.filter((id) => id !== userId);
    onUpdateTask(task.id, { collaboratorIds: updatedIds });

    const targetName = targetUser?.name || "Kolaborator";
    toastAlert({
      title: "Kolaborator Dihapus",
      description: `${targetName} telah dihapus dari daftar kolaborator task ini.`,
    });

    if (onAddNotification) {
      onAddNotification({
        title: "Kolaborator Dihapus",
        message: `${currentUser.name} menghapus ${targetName} dari kolaborator ${taskKey}`,
        type: "COLLABORATOR_REMOVED",
        taskId: task.id,
        taskTitle: task.title,
        actor: currentUser,
      });
    }
  };


  const toggleExpand = () => {
    if (isExpanded) {
      setDrawerWidth(previousWidthRef.current || 660);
      setIsExpanded(false);
    } else {
      previousWidthRef.current = drawerWidth;
      const wideWidth = Math.min(1080, window.innerWidth - 80);
      setDrawerWidth(wideWidth);
      setIsExpanded(true);
    }
  };

  const setWidthPreset = (presetWidth: number) => {
    const clamped = Math.min(presetWidth, window.innerWidth - 64);
    setDrawerWidth(clamped);
    setIsExpanded(clamped >= 950);
    try {
      localStorage.setItem("kinetic_drawer_width", String(clamped));
    } catch {}
  };

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const currentAssignee = users.find((u) => u.id === task.assigneeId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Background click dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container (Resizable) */}
      <div
        style={{ width: `${drawerWidth}px` }}
        className={`relative flex h-full max-w-[96vw] flex-col border-l border-border/80 bg-background shadow-2xl overflow-hidden ${
          isResizing ? "select-none" : "transition-[width] duration-150 ease-out"
        }`}
      >
        {/* Left Border Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className={`absolute top-0 bottom-0 -left-1 w-3 cursor-col-resize z-40 group flex items-center justify-center select-none ${
            isResizing ? "bg-foreground/15" : "hover:bg-foreground/10"
          }`}
          title="Tarik ke kiri atau ke kanan untuk mengubah lebar detail task"
        >
          {/* Hairline Indicator */}
          <div
            className={`h-full w-0.5 transition-colors ${
              isResizing ? "bg-foreground" : "bg-border/90 group-hover:bg-foreground/70"
            }`}
          />
          {/* Center Grip Pill Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-8 w-3 rounded-full border border-border/80 bg-background/95 shadow-xs flex items-center justify-center transition-all ${
              isResizing ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-2.5 bg-muted/20 select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground/80 px-1.5 py-0.5 rounded border border-border/70 bg-card">
              {taskKey}
            </span>

            {/* Asana-style Visibility Indicator */}
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                task.visibility === "PRIVATE"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400"
              }`}
              title={
                task.visibility === "PRIVATE"
                  ? "Task Privat: Hanya pembuat, penanggung jawab, dan Admin yang dapat melihat"
                  : "Task Publik: Dapat dilihat oleh semua anggota tim workspace"
              }
            >
              {task.visibility === "PRIVATE" ? (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Privat</span>
                </>
              ) : (
                <>
                  <Globe className="h-3 w-3" />
                  <span>Publik</span>
                </>
              )}
            </span>

            {isViewer ? (
              <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 text-[10px] font-mono uppercase tracking-wider font-semibold">
                {t("task.readOnly", "Read Only")}
              </span>
            ) : (
              <Button
                variant={task.completed ? "default" : "outline"}
                size="sm"
                onClick={handleToggleCompleted}
                className={`h-7 px-2.5 text-xs gap-1.5 transition-all ${
                  task.completed
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "hover:border-foreground/30"
                }`}
              >
                {task.completed ? (
                  <>
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>{t("task.completed", "Selesai")}</span>
                  </>
                ) : (
                  <>
                    <StatusIcon status={task.status} size={13} />
                    <span>{t("task.markComplete", "Tandai Selesai")}</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Top Actions: Clean 3-dots Dropdown Menu & Close */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none"
                title="Menu opsi lainnya"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                {/* 1. Share / Copy Link */}
                <DropdownMenuItem onClick={handleCopyLink} className="gap-2.5 cursor-pointer">
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{copiedLink ? "Tautan Berhasil Disalin!" : "Salin Tautan Task"}</span>
                </DropdownMenuItem>

                {/* 2. Toggle Status Selesai */}
                {!isViewer && (
                  <DropdownMenuItem onClick={handleToggleCompleted} className="gap-2.5 cursor-pointer">
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{task.completed ? "Buka Kembali Task" : "Tandai Task Selesai"}</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* 3. Ukuran Drawer */}
                <DropdownMenuLabel>Ukuran Tampilan</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setWidthPreset(540)} className="gap-2.5 cursor-pointer">
                  <span className="font-mono text-[10px] text-muted-foreground">540px</span>
                  <span>Lebar Kompak</span>
                  {drawerWidth <= 580 && <Check className="h-3 w-3 ml-auto text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWidthPreset(720)} className="gap-2.5 cursor-pointer">
                  <span className="font-mono text-[10px] text-muted-foreground">720px</span>
                  <span>Lebar Standar</span>
                  {drawerWidth > 580 && drawerWidth < 900 && <Check className="h-3 w-3 ml-auto text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWidthPreset(1000)} className="gap-2.5 cursor-pointer">
                  <span className="font-mono text-[10px] text-muted-foreground">1000px</span>
                  <span>Lebar Luas</span>
                  {drawerWidth >= 900 && <Check className="h-3 w-3 ml-auto text-foreground" />}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={toggleExpand} className="gap-2.5 cursor-pointer">
                  {isExpanded ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Kembalikan Ukuran Normal</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Perluas (Wide Mode)</span>
                    </>
                  )}
                </DropdownMenuItem>

                {/* 4. Hapus Task (Admin Only) */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="gap-2.5 cursor-pointer text-rose-500 focus:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Issue Permanen</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Tutup (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body with Distinct Focused Section Boxes */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* BOX 1: Issue Title Box */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground font-semibold">
              <span className="uppercase tracking-wider">{t("task.titleLabel", "Judul Issue")}</span>
              <span>{title.length} char</span>
            </div>
            <textarea
              rows={2}
              value={title}
              readOnly={isViewer}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder={t("task.titlePlaceholder", "Tuliskan judul issue...")}
              className={`w-full resize-none bg-transparent text-base sm:text-lg font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/70 focus:outline-none rounded p-1.5 -ml-1.5 transition-all ${
                isViewer ? "cursor-default" : "focus:bg-muted/30 focus:ring-1 focus:ring-foreground/20"
              }`}
            />
          </section>

          {/* BOX 2: Inspector / Properties Box */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foreground">
                  {t("task.properties", "Properti & Atribut")}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground font-medium">
                {task.completed
                  ? `${t("task.status", "Status")}: ${t("task.completed", "Selesai")}`
                  : `${t("task.status", "Status")}: ${t("task.active", "Aktif")}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Status Cell */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/35 min-w-0">
                <span className="text-foreground/90 flex items-center gap-1.5 font-medium shrink-0 text-[11px] sm:text-xs">
                  <StatusIcon status={task.status} size={13} />
                  <span>{t("task.status", "Status")}</span>
                </span>
                <div className="flex-1 min-w-0 max-w-[170px]">
                  <Select
                    value={task.status}
                    onValueChange={(val) =>
                      onUpdateTask(task.id, {
                        status: val as TaskStatus,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-background" disabled={isViewer}>
                      <SelectValue placeholder={t("task.status", "Status")}>
                        <div className="flex items-center gap-1.5 truncate">
                          <StatusIcon status={task.status} size={12} />
                          <span className="truncate">
                            {availableStatuses.find((col) => col.id === task.status)?.title || task.status}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={col.id} size={12} />
                            <span>{col.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {!availableStatuses.some((c) => c.id === task.status) && (
                        <SelectItem value={task.status}>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={task.status} size={12} />
                            <span>{task.status}</span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority Cell */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/35 min-w-0">
                <span className="text-foreground/90 flex items-center gap-1.5 font-medium shrink-0 text-[11px] sm:text-xs">
                  <PriorityIcon priority={task.priority} size={13} />
                  <span>{t("task.priority", "Prioritas")}</span>
                </span>
                <div className="flex-1 min-w-0 max-w-[170px]">
                  <Select
                    value={task.priority}
                    onValueChange={(val) =>
                      onUpdateTask(task.id, {
                        priority: val as TaskPriority,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-background" disabled={isViewer}>
                      <SelectValue placeholder={t("task.priority", "Prioritas")}>
                        <div className="flex items-center gap-1.5 truncate">
                          <PriorityIcon priority={task.priority} size={12} />
                          <span className="capitalize">{task.priority.toLowerCase()}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <PriorityIcon priority={p} size={12} />
                            <span className="capitalize">{p.toLowerCase()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee Cell (Penanggung Jawab / PIC) */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/35 min-w-0">
                <span className="text-foreground/90 flex items-center gap-1.5 font-medium shrink-0 text-[11px] sm:text-xs">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{t("task.assignee", "Penanggung Jawab")}</span>
                </span>
                <div className="flex-1 min-w-0 max-w-[190px]">
                  <Select
                    value={task.assigneeId || ""}
                    onValueChange={(val) =>
                      onUpdateTask(task.id, {
                        assigneeId: val ? val : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-background" disabled={isViewer}>
                      <SelectValue placeholder={t("task.unassigned", "Unassigned")}>
                        {currentAssignee ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <Avatar
                              src={currentAssignee.avatar}
                              fallback={currentAssignee.name}
                              size="xs"
                              className="h-4 w-4 text-[8px] shrink-0"
                            />
                            <span className="truncate">{currentAssignee.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                            <UserX className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t("task.unassigned", "Unassigned")}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserX className="h-3.5 w-3.5 shrink-0" />
                          <span>{t("task.unassigned", "Unassigned")}</span>
                        </div>
                      </SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={u.avatar}
                              fallback={u.name}
                              size="xs"
                              className="h-4 w-4 text-[8px] shrink-0"
                            />
                            <span className="truncate">{u.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date Cell (Shadcn UI DatePicker) */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/35 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
                  <span className="text-foreground/90 flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{t("task.dueDate", "Tenggat Waktu")}</span>
                  </span>
                  {task.dueDate && (
                    <span className="hidden xl:inline-block font-mono text-[10px] text-muted-foreground font-medium">
                      ({formatRelativeDate(task.dueDate)})
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 max-w-[170px]">
                  <DatePicker
                    date={task.dueDate}
                    disabled={isViewer}
                    placeholder={t("task.selectDate", "Pilih tanggal")}
                    align="end"
                    onSelect={(selected) =>
                      onUpdateTask(task.id, {
                        dueDate: selected ? selected.toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>

              {/* Visibilitas Cell (Asana style Public / Private) */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/35 min-w-0 sm:col-span-2">
                <span className="text-foreground/90 flex items-center gap-1.5 font-medium shrink-0 text-[11px] sm:text-xs">
                  {task.visibility === "PRIVATE" ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  )}
                  <span>{t("task.visibility", "Visibilitas Akses")}</span>
                </span>
                <div className="flex-1 min-w-0 max-w-[260px]">
                  <Select
                    value={task.visibility || "PUBLIC"}
                    onValueChange={(val) =>
                      onUpdateTask(task.id, {
                        visibility: val as TaskVisibility,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-background" disabled={isViewer}>
                      <SelectValue placeholder={t("task.visibility", "Pilih visibilitas")}>
                        <span className="flex items-center gap-1.5 truncate">
                          {task.visibility === "PRIVATE" ? (
                            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                          ) : (
                            <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                          )}
                          <span>
                            {task.visibility === "PRIVATE"
                              ? t("task.visibilityPrivate", "Privat (Kolaborator & Admin)")
                              : t("task.visibilityPublic", "Publik (Semua tim workspace)")}
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
            </div>

            {/* Tags & Labels Row */}
            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("task.tags", "Tags & Label")}
                </span>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(!isAddingTag)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{t("task.addTag", "Tambah Tag")}</span>
                  </button>
                )}
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-6">
                {(task.tags && task.tags.length > 0) ? (
                  task.tags.map((tag) => {
                    const colorStyle = getTagColor(tag);
                    return (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                      >
                        <span>{tag}</span>
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
                            title={`Hapus tag ${tag}`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-muted-foreground/70 italic">
                    {t("task.noTags", "Belum ada tag yang disematkan")}
                  </span>
                )}
              </div>

              {/* Tag Input & Quick Suggestions Popover */}
              {isAddingTag && !isViewer && (
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/95 shadow-md space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                        } else if (e.key === "Escape") {
                          setIsAddingTag(false);
                        }
                      }}
                      placeholder={t("task.tagPlaceholder", "Ketik nama tag lalu Enter...")}
                      className="h-7 text-xs bg-muted/40"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddTag(newTagInput)}
                      className="h-7 px-2.5 text-xs"
                    >
                      {t("common.create", "Tambah")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(false)}
                      className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Quick Tag Recommendations */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{t("task.suggestions", "Saran")}:</span>
                    {["Frontend", "Backend", "Design", "Bug", "Feature", "Database", "Mobile"].map((rec) => (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => handleAddTag(rec)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 hover:bg-muted/80 text-foreground transition-colors"
                      >
                        +{rec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collaborators Row (Asana style) */}
            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("task.collaborators", "Kolaborator")}
                </span>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCollab(!isAddingCollab)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>{t("task.addCollaborator", "Tambah Kolaborator")}</span>
                  </button>
                )}
              </div>

              {/* Collaborators Avatar Stack & Badges */}
              <div className="flex flex-wrap items-center gap-2 min-h-6">
                {(task.collaboratorIds && task.collaboratorIds.length > 0) ? (
                  task.collaboratorIds.map((cId) => {
                    const collabUser = users.find((u) => u.id === cId);
                    if (!collabUser) return null;
                    return (
                      <div
                        key={cId}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/80 bg-muted/40 text-foreground text-[11px] shadow-2xs group"
                      >
                        <Avatar
                          src={collabUser.avatar}
                          fallback={collabUser.name}
                          size="xs"
                          className="h-4 w-4 ring-1 ring-border text-[8px] shrink-0"
                        />
                        <span className="font-medium">{collabUser.name}</span>
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(cId)}
                            className="text-muted-foreground hover:text-rose-500 rounded-full p-0.5 transition-colors"
                            title={`Hapus ${collabUser.name} dari kolaborator`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-muted-foreground/70 italic">
                    {t("task.noCollaborators", "Belum ada kolaborator tambahan")}
                  </span>
                )}
              </div>

              {/* Collaborator Selector Dropdown */}
              {isAddingCollab && !isViewer && (
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/95 shadow-md space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      {t("task.selectMember", "Pilih Anggota Tim Workspace:")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCollab(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {users
                      .filter((u) => !task.collaboratorIds?.includes(u.id))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleAddCollaborator(u.id)}
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted text-left transition-colors border border-transparent hover:border-border/60"
                        >
                          <Avatar
                            src={u.avatar}
                            fallback={u.name}
                            size="sm"
                            className="h-5 w-5 ring-1 ring-border text-[9px]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-foreground truncate">
                              {u.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {u.title || u.role}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* BOX 3: Description Section (Focused Box) */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foreground">
                  {t("task.description", "Deskripsi & Konteks")}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground font-medium">
                {isViewer ? t("task.readOnly", "Read-Only") : t("task.autoSaveNotice", "Auto-save saat selesai mengetik")}
              </span>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 focus-within:border-foreground/40 focus-within:bg-muted/40 transition-all">
              <Textarea
                rows={5}
                value={description}
                readOnly={isViewer}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={t("task.descriptionPlaceholder", "Tambahkan detail konteks, spesifikasi teknis, atau catatan penting...")}
                className={`w-full min-h-[110px] text-xs leading-relaxed border-none bg-transparent p-0 shadow-none focus-visible:ring-0 rounded-none resize-y text-foreground ${
                  isViewer ? "cursor-default" : ""
                }`}
              />
              {!description && isViewer && (
                <p className="text-xs text-muted-foreground italic">
                  {t("task.noDescription", "Belum ada deskripsi yang ditambahkan untuk issue ini.")}
                </p>
              )}
            </div>
          </section>

          {/* BOX 4: Checklist & Sub-issues Box */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foreground">
                  {t("task.subtasks", "Checklist Sub-issues")}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground font-medium">
                  {completedSubtasks} / {task.subtasks.length} {t("task.completed", "selesai")}
                </span>
                {task.subtasks.length > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground font-semibold">
                    {Math.round((completedSubtasks / task.subtasks.length) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Subtasks Progress Bar */}
            {task.subtasks.length > 0 && (
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${(completedSubtasks / task.subtasks.length) * 100}%`,
                  }}
                />
              </div>
            )}

            {/* Subtasks List */}
            <div className="space-y-1.5">
              {task.subtasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">
                  {t("task.noSubtasks", "Belum ada sub-issue. Buat daftar checklist pekerjaan di bawah.")}
                </p>
              ) : (
                task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2 text-xs transition-all hover:border-foreground/30 hover:bg-muted/20"
                  >
                    <button
                      type="button"
                      disabled={isViewer}
                      onClick={() => {
                        if (isViewer) return;
                        onToggleSubtask(sub.id, !sub.completed);
                      }}
                      className={`shrink-0 transition-transform active:scale-95 text-muted-foreground ${
                        isViewer ? "cursor-not-allowed opacity-60" : "hover:text-foreground"
                      }`}
                    >
                      {sub.completed ? (
                        <div className="h-3.5 w-3.5 rounded bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded border border-border hover:border-foreground/60" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-xs select-none ${
                        sub.completed
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-foreground font-medium"
                      }`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))
              )}

              {/* Add Subtask Form */}
              {!isViewer && (
                <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2 pt-1.5">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder={t("task.addSubtaskPlaceholder", "Tambah item checklist baru...")}
                    className="h-8 text-xs bg-muted/20 border-border"
                  />
                  <Button type="submit" size="sm" variant="outline" className="h-8 text-xs px-3">
                    <Plus className="mr-1 h-3 w-3" />
                    {t("common.create", "Tambah")}
                  </Button>
                </form>
              )}
            </div>
          </section>

          {/* BOX 5: Discussion & Activity Log Box */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`flex items-center gap-1.5 pb-1 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === "comments"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{t("task.comments", "Komentar & Diskusi")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`flex items-center gap-1.5 pb-1 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === "activity"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("task.activity", "Riwayat Log")}</span>
                </button>
              </div>
            </div>

            {/* Comments / Chat Tab */}
            {activeTab === "comments" && (
              <TaskChatFeed
                comments={task.comments}
                currentUser={currentUser}
                isViewer={isViewer}
                users={users}
                taskId={task.id}
                taskTitle={task.title}
                workspaceId={workspaceId || workspace?.id}
                projectId={task.projectId}
                onAddComment={handleCommentWithAutoCollaborator}
              />
            )}

            {/* Activity History Tab */}
            {activeTab === "activity" && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {task.activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-2">
                    {t("task.noActivity", "Belum ada riwayat aktivitas tercatat.")}
                  </p>
                ) : (
                  task.activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-2.5 p-2 rounded-md border border-border/60 bg-muted/10 text-xs text-muted-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0" />
                      <span className="font-medium text-foreground">
                        {act.user?.name || "Member"}
                      </span>
                      <span>{act.action}</span>
                      <span className="font-mono text-[10px] opacity-60 ml-auto">
                        {formatRelativeDate(act.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Shadcn UI Confirmation Dialog for Deleting Task */}
      <AlertDialog open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("task.deleteTitle", "Hapus Issue")} {taskKey}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("task.deleteConfirm", "Tindakan ini tidak dapat dibatalkan. Issue ini beserta seluruh checklist sub-issue dan riwayat diskusi akan dihapus secara permanen dari workspace.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                onDeleteTask(task.id);
                onClose();
              }}
            >
              {t("common.delete", "Hapus Issue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
