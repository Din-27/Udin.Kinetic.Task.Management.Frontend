"use client";

import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task, User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeDate, getTagColor } from "@/lib/utils";
import {
  Calendar,
  MessageSquare,
  AlertCircle,
  Check,
  Share2,
  Lock,
  Tag,
  Users,
  MoreHorizontal,
  Eye,
  CheckSquare,
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

interface TaskCardProps {
  task: Task;
  index: number;
  users?: User[];
  workspaceId?: string;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  isReadOnly?: boolean;
}

export function TaskCard({
  task,
  index,
  users = [],
  workspaceId,
  onSelectTask,
  onToggleComplete,
  isReadOnly = false,
}: TaskCardProps) {
  const [copied, setCopied] = React.useState(false);
  const isOverdue =
    task.dueDate &&
    !task.completed &&
    new Date(task.dueDate).getTime() < Date.now();

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  // Resolve full collaborator list (either from task.collaborators or mapped from task.collaboratorIds)
  const resolvedCollaborators: User[] = React.useMemo(() => {
    if (task.collaborators && task.collaborators.length > 0) {
      return task.collaborators;
    }
    if (task.collaboratorIds && task.collaboratorIds.length > 0 && users.length > 0) {
      return task.collaboratorIds
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is User => Boolean(u));
    }
    return [];
  }, [task.collaborators, task.collaboratorIds, users]);

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk mengubah status issue.",
        variant: "warning",
      });
      return;
    }
    if (!task.completed) {
      triggerTaskCelebration();
    }
    onToggleComplete(task, e);
  };

  // Generate clean issue key like ENG-104 or TSK-12
  const taskKey = `TSK-${(task.id.replace(/\D/g, "") || task.id.slice(-3)).padStart(2, "0")}`;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isReadOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelectTask(task)}
          className={`group relative mb-2 rounded-md border p-3 transition-all cursor-pointer select-none ${
            snapshot.isDragging
              ? "shadow-lg ring-1 ring-foreground/20 border-foreground/30 bg-card opacity-95 scale-[1.01]"
              : "border-border/80 bg-card hover:border-foreground/25 hover:bg-muted/20"
          } ${task.completed ? "opacity-60 bg-muted/30" : ""}`}
        >
          {/* Header Row: Task Key + Priority + Lock + Share + Assignee */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <PriorityIcon priority={task.priority} />
              <span className="font-mono text-[11px] font-semibold tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                {taskKey}
              </span>
              {task.visibility === "PRIVATE" && (
                <span title="Task Privat: Hanya pembuat, penanggung jawab, & Admin yang dapat mengakses">
                  <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Assignee (PIC) */}
              {task.assignee && (
                <div title={`Penanggung Jawab (PIC): ${task.assignee.name}`} className="relative shrink-0 pr-0.5">
                  <Avatar
                    src={task.assignee.avatar}
                    fallback={task.assignee.name}
                    size="xs"
                    className="h-4 w-4 text-[8px] ring-1 ring-background shadow-2xs"
                  />
                </div>
              )}

              {/* 3-Dots Options Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
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
                      const success = await copyTaskShareUrl(task.id, task.projectId, workspaceId || "ws-1");
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
                        handleCheck(e);
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

          {/* Title & Complete Checkbox */}
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={handleCheck}
              className={`mt-0.5 shrink-0 rounded transition-colors ${
                task.completed
                  ? "text-emerald-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={task.completed ? "Mark incomplete" : "Mark complete"}
            >
              {task.completed ? (
                <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              ) : (
                <StatusIcon status={task.status} size={14} />
              )}
            </button>

            <span
              className={`text-[13px] font-semibold leading-snug tracking-tight text-foreground line-clamp-2 ${
                task.completed ? "text-emerald-600 dark:text-emerald-400" : ""
              }`}
            >
              {task.title}
            </span>
          </div>

          {/* Description Snippet (Subtle, professional) */}
          {task.description && !task.completed && (
            <p className="mt-1 ml-5 text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Tags Chips */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 ml-5 flex flex-wrap gap-1">
              {task.tags.map((tag) => {
                const color = getTagColor(tag);
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded-md border ${color.bg} ${color.text} ${color.border}`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Subtask Mini Progress Bar (Hairline, Linear style) */}
          {task.subtasks.length > 0 && (
            <div className="mt-2 ml-5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mb-1">
                <span>
                  {completedSubtasks}/{task.subtasks.length} subtasks
                </span>
                <span className="font-mono">
                  {Math.round((completedSubtasks / task.subtasks.length) * 100)}%
                </span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/60 transition-all duration-300"
                  style={{
                    width: `${(completedSubtasks / task.subtasks.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Metadata (Due date, Comments count, and Collaborator Avatar List) */}
          <div className="mt-2.5 ml-5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              {task.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                    isOverdue
                      ? "text-rose-500 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {isOverdue ? (
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                  ) : (
                    <Calendar className="h-3 w-3 opacity-70" />
                  )}
                  {formatRelativeDate(task.dueDate)}
                </span>
              )}

              {task.comments.length > 0 && (() => {
                const unreadComments = getTaskUnreadCommentsCount(task);
                return (
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                      unreadComments > 0
                        ? "text-rose-500 font-semibold"
                        : "text-muted-foreground/80"
                    }`}
                    title={
                      unreadComments > 0
                        ? `${unreadComments} pesan chat task belum dibaca`
                        : `${task.comments.length} komentar`
                    }
                  >
                    <MessageSquare className="h-3 w-3 opacity-70" />
                    <span>{task.comments.length}</span>
                    {unreadComments > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                    )}
                  </span>
                );
              })()}
            </div>

            {/* Collaborator Avatars List */}
            {resolvedCollaborators.length > 0 && (
              <div
                className="flex items-center gap-1 shrink-0"
                title={`Kolaborator (${resolvedCollaborators.length}): ${resolvedCollaborators.map((c) => c.name).join(", ")}`}
              >
                <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <div className="flex items-center -space-x-1.5">
                  {resolvedCollaborators.slice(0, 3).map((collab, i) => (
                    <div
                      key={collab.id}
                      title={`Kolaborator: ${collab.name}`}
                      className="relative shrink-0"
                      style={{ zIndex: 10 - i }}
                    >
                      <Avatar
                        src={collab.avatar}
                        fallback={collab.name}
                        size="xs"
                        className="h-4 w-4 ring-1 ring-background shadow-2xs hover:scale-110 transition-transform"
                      />
                    </div>
                  ))}
                  {resolvedCollaborators.length > 3 && (
                    <div
                      title={`${resolvedCollaborators.length - 3} kolaborator lainnya`}
                      className="h-4 w-4 rounded-full bg-muted border border-border flex items-center justify-center text-[8px] font-mono text-muted-foreground ring-1 ring-background z-0 shrink-0"
                    >
                      +{resolvedCollaborators.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
