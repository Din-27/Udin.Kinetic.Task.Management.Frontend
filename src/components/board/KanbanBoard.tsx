"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { Task, TaskStatus, User, DEFAULT_BOARD_COLUMNS, BoardColumn } from "@/types";
import { TaskCard } from "./TaskCard";
import { Plus, Pencil, Check, X, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { StatusIcon } from "@/components/ui/status-icon";
import { toastAlert } from "@/components/ui/alert-toast";
import {
  useBoardColumnsQuery,
  useSaveBoardColumnsMutation,
} from "@/lib/hooks/useBoardColumnsQueries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface KanbanBoardProps {
  tasks: Task[];
  users?: User[];
  workspaceId?: string;
  onSelectTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
  onQuickAddTask: (status: TaskStatus) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  isReadOnly?: boolean;
  columns?: BoardColumn[];
  onColumnsChange?: (columns: BoardColumn[]) => void;
  isLoading?: boolean;
}

export function KanbanBoard({
  tasks,
  users = [],
  workspaceId,
  onSelectTask,
  onMoveTask,
  onQuickAddTask,
  onToggleComplete,
  isReadOnly = false,
  columns: propColumns,
  onColumnsChange,
  isLoading = false,
}: KanbanBoardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [columns, setColumns] = useState<BoardColumn[]>(() => {
    if (propColumns && propColumns.length > 0) return propColumns;
    return DEFAULT_BOARD_COLUMNS;
  });

  // Inline rename state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  // Add column state
  const [isAddingColumn, setIsAddingColumn] = useState<boolean>(false);
  const [newColTitle, setNewColTitle] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // TanStack Query: Board columns sync
  const { data: serverCols } = useBoardColumnsQuery(workspaceId);
  const saveColumnsMutation = useSaveBoardColumnsMutation();

  useEffect(() => {
    if (propColumns && propColumns.length > 0) {
      setColumns(propColumns);
      return;
    }
    if (serverCols && Array.isArray(serverCols) && serverCols.length > 0) {
      setColumns(serverCols);
      onColumnsChange?.(serverCols);
    }
  }, [workspaceId, propColumns, serverCols, onColumnsChange]);

  const saveColumns = (newCols: BoardColumn[]) => {
    setColumns(newCols);
    onColumnsChange?.(newCols);

    saveColumnsMutation.mutate({
      workspaceId,
      columns: newCols,
    });
  };

  const handleStartRename = (col: BoardColumn) => {
    if (isReadOnly) return;
    setEditingColId(col.id);
    setEditingTitle(col.title);
  };

  const handleSaveRename = (colId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingColId(null);
      return;
    }
    const next = columns.map((c) => (c.id === colId ? { ...c, title: trimmed } : c));
    saveColumns(next);
    setEditingColId(null);
    toastAlert({
      title: "Nama Board Diperbarui",
      description: `Nama kolom board berhasil diubah menjadi "${trimmed}".`,
    });
  };

  const handleAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newColTitle.trim();
    if (!trimmed) return;

    const slug = trimmed
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .slice(0, 20);
    const colId = (slug && !columns.some((c) => c.id === slug) ? slug : `COL_${Date.now()}`) as TaskStatus;

    const newCol: BoardColumn = {
      id: colId,
      title: trimmed,
    };

    const next = [...columns, newCol];
    saveColumns(next);
    setNewColTitle("");
    setIsAddingColumn(false);
    toastAlert({
      title: "Kolom Board Ditambahkan",
      description: `Kolom "${trimmed}" berhasil ditambahkan ke board.`,
    });
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      toastAlert({
        title: "Tidak Dapat Menghapus",
        description: "Board harus memiliki minimal 1 kolom.",
        variant: "warning",
      });
      return;
    }

    const targetCol = columns.find((c) => c.id === colId);
    const remainingCols = columns.filter((c) => c.id !== colId);
    const fallbackCol = remainingCols[0].id;

    // Relocate tasks in this column to fallback column
    const tasksToMove = tasks.filter((t) => t.status === colId);
    tasksToMove.forEach((t, idx) => {
      onMoveTask(t.id, fallbackCol, idx);
    });

    saveColumns(remainingCols);
    toastAlert({
      title: "Kolom Board Dihapus",
      description: `Kolom "${targetCol?.title || "Board"}" berhasil dihapus.${
        tasksToMove.length > 0
          ? ` ${tasksToMove.length} issue dipindahkan ke kolom "${remainingCols[0].title}".`
          : ""
      }`,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (isReadOnly) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    onMoveTask(draggableId, newStatus, destination.index);
  };

  if (!isMounted || isLoading) {
    return (
      <div className="relative flex h-full w-full gap-3 overflow-x-auto pb-6 pt-1 items-start select-none">
        {columns.map((column, idx) => (
          <div
            key={column.id || idx}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border/70 bg-muted/20 dark:bg-muted/10 p-2 shadow-2xs min-h-[360px]"
          >
            {/* Column Header Skeleton */}
            <div className="mb-3 flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-3 w-6 rounded" />
            </div>

            {/* Skeleton Cards */}
            <div className="space-y-2.5">
              {[1, 2, 3].slice(0, idx % 2 === 0 ? 3 : 2).map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs space-y-2.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-14 rounded" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-full rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-border/40">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Floating loading feedback pill */}
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full border border-border/80 bg-background/95 px-4 py-2 shadow-2xl backdrop-blur-md text-xs font-medium text-foreground animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--workspace-accent)]" />
          <span>Memuat data board...</span>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full w-full gap-3 overflow-x-auto pb-6 pt-1 items-start">
        {columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={column.id}
              className="group flex w-72 shrink-0 flex-col rounded-lg border border-border/70 bg-muted/20 dark:bg-muted/10 p-2 shadow-2xs max-h-[calc(100vh-175px)] transition-all"
            >
              {/* Column Header */}
              <div className="mb-2 flex items-center justify-between px-2 py-1 select-none">
                {editingColId === column.id ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(column.id);
                        if (e.key === "Escape") setEditingColId(null);
                      }}
                      onBlur={() => handleSaveRename(column.id)}
                      className="h-6 text-xs font-semibold px-1.5 py-0.5 rounded border border-[var(--workspace-accent)] bg-background text-foreground w-full focus:outline-none"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSaveRename(column.id);
                      }}
                      className="h-5 w-5 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 shrink-0"
                      title="Simpan"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditingColId(null);
                      }}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"
                      title="Batal"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 min-w-0 group/title cursor-pointer flex-1 mr-1"
                    onClick={() => handleStartRename(column)}
                    title="Klik untuk mengubah nama kolom"
                  >
                    <StatusIcon status={column.id} size={14} />
                    <h3 className="text-xs font-semibold text-foreground tracking-tight truncate max-w-[130px]">
                      {column.title}
                    </h3>
                    {!isReadOnly && (
                      <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 group-hover/title:text-foreground opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-0.5 shrink-0">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onQuickAddTask(column.id)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                      title={`Tambah task ke ${column.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {!isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                        title="Opsi kolom"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 text-xs">
                        <DropdownMenuItem
                          onClick={() => handleStartRename(column)}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                          <span>Ubah Nama</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => onQuickAddTask(column.id)}
                          className="gap-2 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                          <span>Tambah Task</span>
                        </DropdownMenuItem>

                        {columns.length > 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteColumn(column.id)}
                              className="gap-2 cursor-pointer text-rose-500 focus:text-rose-500"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Hapus Kolom</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Task Droppable Column */}
              <Droppable droppableId={column.id} isDropDisabled={isReadOnly}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-1 flex-col overflow-y-auto px-1 py-1 rounded transition-colors min-h-[120px] ${
                      snapshot.isDraggingOver && !isReadOnly
                        ? "bg-muted/50 ring-1 ring-foreground/20"
                        : ""
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        users={users}
                        workspaceId={workspaceId}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                    {provided.placeholder}

                    {/* Quick Add Button at bottom of column */}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => onQuickAddTask(column.id)}
                        className="mt-1 flex items-center gap-1.5 rounded border border-dashed border-border/70 p-1.5 text-xs text-muted-foreground/70 hover:border-[var(--workspace-accent)] hover:text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent)]/5 transition-all justify-center"
                      >
                        <Plus className="h-3 w-3" />
                        <span>New issue</span>
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* + Add Column / Board Button */}
        {!isReadOnly && (
          <div className="w-72 shrink-0 select-none">
            {isAddingColumn ? (
              <form
                onSubmit={handleAddColumn}
                className="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2.5 animate-scale-up"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-[var(--workspace-accent)]" />
                    Tambah Kolom Board
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColTitle("");
                    }}
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  placeholder="Contoh: QA, Staging, Review..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--workspace-accent)]"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColTitle("");
                    }}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newColTitle.trim()}
                    style={{ backgroundColor: "var(--workspace-accent, #6366f1)" }}
                    className="px-3 py-1 text-xs font-medium text-white rounded shadow-xs hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Tambah Kolom
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingColumn(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/15 p-3 text-xs font-medium text-muted-foreground/80 hover:border-[var(--workspace-accent)] hover:text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent)]/5 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Kolom Board</span>
              </button>
            )}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
