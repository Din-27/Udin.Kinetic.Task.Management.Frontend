"use client";

import React, { useState } from "react";
import { Task, TaskStatus, TaskPriority, User, BoardColumn, DEFAULT_BOARD_COLUMNS } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeDate, getTagColor } from "@/lib/utils";
import { useBoardColumnsQuery } from "@/lib/hooks/useBoardColumnsQueries";
import {
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Check,
  Share2,
  Lock,
  Tag,
  Loader2,
  MoreHorizontal,
  Eye,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import { triggerTaskCelebration } from "@/lib/confetti";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { toastAlert } from "@/components/ui/alert-toast";
import { copyTaskShareUrl } from "@/lib/share-utils";
import { getTaskUnreadCommentsCount } from "@/lib/unread-chat-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface ListViewProps {
  tasks: Task[];
  users: User[];
  workspaceId?: string;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  onQuickAddTask: (status: TaskStatus) => void;
  onUpdateStatus?: (taskId: string, newStatus: TaskStatus) => void;
  isReadOnly?: boolean;
  columns?: BoardColumn[];
  isLoading?: boolean;
}

const SECTIONS: { id: TaskStatus; title: string }[] = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "DONE", title: "Done" },
];

export function ListView({
  tasks,
  users,
  workspaceId,
  onSelectTask,
  onToggleComplete,
  onQuickAddTask,
  onUpdateStatus,
  isReadOnly = false,
  columns: propColumns,
  isLoading = false,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<"dueDate" | "priority" | "title" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>(() => {
    if (propColumns && propColumns.length > 0) return propColumns;
    return DEFAULT_BOARD_COLUMNS;
  });

  // TanStack Query: Board columns sync
  const { data: serverCols } = useBoardColumnsQuery(workspaceId);

  React.useEffect(() => {
    if (propColumns && propColumns.length > 0) {
      setBoardColumns(propColumns);
      return;
    }
    if (serverCols && Array.isArray(serverCols) && serverCols.length > 0) {
      setBoardColumns(serverCols);
    }
  }, [workspaceId, propColumns, serverCols]);

  const effectiveSections = React.useMemo(() => {
    const list = [...boardColumns];
    const knownIds = new Set(list.map((c) => c.id));
    tasks.forEach((t) => {
      if (!knownIds.has(t.status)) {
        list.push({ id: t.status, title: t.status });
        knownIds.add(t.status);
      }
    });
    return list;
  }, [boardColumns, tasks]);

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleSort = (field: "dueDate" | "priority" | "title") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border border-border/80 bg-card shadow-2xs overflow-hidden text-sm select-none relative">
        <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          <div className="col-span-6">Issue</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-2">Due date</div>
          <div className="col-span-2">Priority</div>
        </div>

        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center relative overflow-hidden bg-card"
            >
              <div className="col-span-6 flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3.5 w-48 rounded" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Floating loading feedback pill */}
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full border border-border/80 bg-background/95 px-4 py-2 shadow-2xl backdrop-blur-md text-xs font-medium text-foreground animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--workspace-accent)]" />
          <span>Memuat list issue...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border/80 bg-card shadow-2xs overflow-hidden text-sm">
      {/* Table Header Row (Linear Style) */}
      <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold select-none">
        <div
          className="col-span-6 flex items-center gap-1.5 cursor-pointer hover:text-foreground"
          onClick={() => handleSort("title")}
        >
          <span>Issue</span>
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        </div>
        <div className="col-span-2">Assignee</div>
        <div
          className="col-span-2 flex items-center gap-1.5 cursor-pointer hover:text-foreground"
          onClick={() => handleSort("dueDate")}
        >
          <span>Due date</span>
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        </div>
        <div
          className="col-span-2 flex items-center gap-1.5 cursor-pointer hover:text-foreground"
          onClick={() => handleSort("priority")}
        >
          <span>Priority</span>
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        </div>
      </div>

      {/* Sections by Status */}
      <div className="divide-y divide-border/60">
        {effectiveSections.map((sec) => {
          let secTasks = tasks.filter((t) => t.status === sec.id);

          // Apply sorting if selected
          if (sortField) {
            secTasks = [...secTasks].sort((a, b) => {
              if (sortField === "title") {
                return sortAsc
                  ? a.title.localeCompare(b.title)
                  : b.title.localeCompare(a.title);
              }
              if (sortField === "dueDate") {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return sortAsc ? dateA - dateB : dateB - dateA;
              }
              if (sortField === "priority") {
                const order = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                return sortAsc
                  ? order[a.priority] - order[b.priority]
                  : order[b.priority] - order[a.priority];
              }
              return 0;
            });
          }

          const isCollapsed = collapsed[sec.id];

          return (
            <div key={sec.id} className="bg-card">
              {/* Section Header */}
              <div
                onClick={() => toggleSection(sec.id)}
                className="flex items-center justify-between px-3 py-1.5 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/40 select-none"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                  <StatusIcon status={sec.id} size={14} />
                  <span className="font-medium text-xs text-foreground tracking-tight">
                    {sec.title}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">
                    {secTasks.length}
                  </span>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAddTask(sec.id);
                    }}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-[var(--workspace-accent)] px-1.5 py-0.5 rounded hover:bg-[var(--workspace-accent)]/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>New</span>
                  </button>
                )}
              </div>

              {/* Tasks in Section */}
              {!isCollapsed && (
                <div className="divide-y divide-border/30">
                  {secTasks.length === 0 ? (
                    <div className="px-8 py-2.5 text-xs text-muted-foreground/60">
                      No issues in {sec.title.toLowerCase()}.
                      {!isReadOnly && (
                        <button
                          onClick={() => onQuickAddTask(sec.id)}
                          className="text-[var(--workspace-accent)] hover:underline ml-1 font-medium"
                        >
                          + Create issue
                        </button>
                      )}
                    </div>
                  ) : (
                    secTasks.map((task) => {
                      const isOverdue =
                        task.dueDate &&
                        !task.completed &&
                        new Date(task.dueDate).getTime() < Date.now();
                      const taskKey = `TSK-${(task.id.replace(/\D/g, "") || task.id.slice(-3)).padStart(2, "0")}`;

                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className={`grid grid-cols-12 gap-3 px-4 py-2 items-center hover:bg-muted/30 cursor-pointer transition-colors group ${
                            task.completed ? "opacity-60 bg-muted/10" : ""
                          }`}
                        >
                          {/* Issue Key + Checkbox + Title */}
                          <div className="col-span-6 flex items-center gap-2.5 pr-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isReadOnly) {
                                  toastAlert({
                                    title: "Akses Viewer (Read-only)",
                                    description: "Anda tidak memiliki izin untuk mengubah status issue.",
                                    variant: "warning",
                                  });
                                  return;
                                }
                                if (!task.completed) triggerTaskCelebration();
                                onToggleComplete(task, e);
                              }}
                              className={`shrink-0 transition-colors ${
                                isReadOnly ? "cursor-not-allowed opacity-60" : "text-muted-foreground/70 hover:text-foreground"
                              }`}
                            >
                              {task.completed ? (
                                <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              ) : (
                                <StatusIcon status={task.status} size={14} />
                              )}
                            </button>

                            <span className="font-mono text-[11px] font-medium text-muted-foreground/70 group-hover:text-foreground/90 shrink-0 flex items-center gap-1">
                              {taskKey}
                              {task.visibility === "PRIVATE" && (
                                <span title="Task Privat: Hanya pembuat, assignee, dan Admin">
                                  <Lock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </span>

                            <span
                              className={`text-xs font-medium truncate ${
                                task.completed
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground"
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Tags Chips in List */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {task.tags.slice(0, 2).map((tag) => {
                                  const color = getTagColor(tag);
                                  return (
                                    <span
                                      key={tag}
                                      className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${color.bg} ${color.text} ${color.border}`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                                {task.tags.length > 2 && (
                                  <span className="text-[9px] font-mono text-muted-foreground">
                                    +{task.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Unread Comment Badge in List */}
                            {task.comments && task.comments.length > 0 && (() => {
                              const unreadCount = getTaskUnreadCommentsCount(task);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 font-mono text-[10px] shrink-0 ml-1.5 px-1.5 py-0.2 rounded border ${
                                    unreadCount > 0
                                      ? "bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold"
                                      : "bg-muted/40 text-muted-foreground/80 border-border/60"
                                  }`}
                                  title={
                                    unreadCount > 0
                                      ? `${unreadCount} pesan chat issue belum dibaca`
                                      : `${task.comments.length} komentar`
                                  }
                                >
                                  <MessageSquare className="h-3 w-3 opacity-70" />
                                  <span>{task.comments.length}</span>
                                  {unreadCount > 0 && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                                  )}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Assignee & Collaborators */}
                          <div className="col-span-2 flex items-center gap-1.5 truncate">
                            {(() => {
                              const collabs: User[] = (task.collaborators && task.collaborators.length > 0)
                                ? task.collaborators
                                : (task.collaboratorIds || [])
                                    .map((id) => users.find((u) => u.id === id))
                                    .filter((u): u is User => Boolean(u));

                              return task.assignee ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="flex items-center -space-x-1.5 shrink-0">
                                    <Avatar
                                      src={task.assignee.avatar}
                                      fallback={task.assignee.name}
                                      size="xs"
                                      title={`Penanggung Jawab: ${task.assignee.name}`}
                                      className="h-4 w-4 ring-1 ring-border text-[8px] z-10 shrink-0"
                                    />
                                    {collabs.slice(0, 2).map((collab, i) => (
                                      <Avatar
                                        key={collab.id}
                                        src={collab.avatar}
                                        fallback={collab.name}
                                        size="xs"
                                        title={`Kolaborator: ${collab.name}`}
                                        className="h-4 w-4 ring-1 ring-border text-[8px] opacity-80 shrink-0"
                                      />
                                    ))}
                                    {collabs.length > 2 && (
                                      <div
                                        title={`${collabs.length - 2} kolaborator lainnya`}
                                        className="h-4 w-4 rounded-full bg-muted border border-border flex items-center justify-center text-[7px] font-mono text-muted-foreground ring-1 ring-border shrink-0"
                                      >
                                        +{collabs.length - 2}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-foreground/90 font-medium truncate">
                                    {task.assignee.name}
                                  </span>
                                </div>
                              ) : collabs.length > 0 ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="flex items-center -space-x-1.5 shrink-0">
                                    {collabs.slice(0, 2).map((collab) => (
                                      <Avatar
                                        key={collab.id}
                                        src={collab.avatar}
                                        fallback={collab.name}
                                        size="xs"
                                        title={`Kolaborator: ${collab.name}`}
                                        className="h-4 w-4 ring-1 ring-border text-[8px] shrink-0"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {collabs[0].name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  Unassigned
                                </span>
                              );
                            })()}
                          </div>

                          {/* Due Date */}
                          <div className="col-span-2 flex items-center gap-1 text-xs font-mono">
                            {task.dueDate ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  isOverdue
                                    ? "text-rose-500 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isOverdue && (
                                  <AlertCircle className="h-3 w-3 text-rose-500" />
                                )}
                                {formatRelativeDate(task.dueDate)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-[11px]">
                                —
                              </span>
                            )}
                          </div>

                          {/* Priority & Clean 3-dots Options Dropdown */}
                          <div className="col-span-2 flex items-center justify-between">
                            <PriorityIcon priority={task.priority} showLabel />
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                                title="Menu opsi task"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTask(task);
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Buka Detail</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const success = await copyTaskShareUrl(
                                      task.id,
                                      task.projectId,
                                      workspaceId || "ws-1"
                                    );
                                    if (success) {
                                      toastAlert({
                                        title: "Link Task Disalin",
                                        description: `Tautan untuk ${taskKey} siap dibagikan.`,
                                      });
                                    }
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Salin Tautan</span>
                                </DropdownMenuItem>

                                {!isReadOnly && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!task.completed) triggerTaskCelebration();
                                      onToggleComplete(task, e);
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{task.completed ? "Buka Kembali" : "Tandai Selesai"}</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
