"use client";

import React from "react";
import { Task, Project, User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  TrendingUp,
  Users,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectOverviewProps {
  project: Project;
  tasks: Task[];
  users: User[];
  onEditProject?: (project: Project) => void;
  canEdit?: boolean;
  isLoading?: boolean;
}

export function ProjectOverview({
  project,
  tasks,
  users,
  onEditProject,
  canEdit = true,
  isLoading = false,
}: ProjectOverviewProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      !t.completed &&
      new Date(t.dueDate).getTime() < Date.now()
  ).length;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workload per user
  const userWorkload = users.map((u) => {
    const userTasks = tasks.filter((t) => t.assigneeId === u.id);
    const userDone = userTasks.filter((t) => t.completed).length;
    return {
      user: u,
      total: userTasks.length,
      done: userDone,
    };
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-5 max-w-6xl animate-fade-in">
        {/* Project Quick Header Bar Skeleton */}
        <div className="rounded-lg border border-border/80 bg-card/60 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44 rounded" />
              <Skeleton className="h-3 w-72 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-md shrink-0" />
        </div>

        {/* Metric Cards Row Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3.5 w-3.5 rounded" />
              </div>
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-2.5 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Progress Card Skeleton */}
        <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-3.5 w-10 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-2.5 w-40 rounded" />
        </div>

        {/* 2-Column Split Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="space-y-2.5 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="space-y-3 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-2.5 w-16 rounded" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 max-w-6xl">
      {/* Project Quick Header Bar */}
      <div className="rounded-lg border border-border/80 bg-card/60 backdrop-blur-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-border/50"
            style={{ backgroundColor: project.color || "#6366f1" }}
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground tracking-tight truncate">
              {project.name}
            </h2>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {project.description || "Tidak ada deskripsi project."}
            </p>
          </div>
        </div>

        {onEditProject && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditProject(project)}
            className="h-8 text-xs gap-1.5 shrink-0 self-start sm:self-auto hover:bg-muted/80"
          >
            <Pencil className="h-3 w-3" />
            <span>{canEdit ? "Ubah Project" : "Detail Project"}</span>
          </Button>
        )}
      </div>

      {/* Metric Cards Row (Linear Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Tasks */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Total Issues
            </span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {totalTasks}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Across 5 workflow stages
          </p>
        </div>

        {/* Completed */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Completed
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {completedTasks}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {completionPercent}% completion rate
          </p>
        </div>

        {/* In Progress */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              In Progress
            </span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {inProgressTasks}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Actively being worked on
          </p>
        </div>

        {/* Overdue */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Overdue
            </span>
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-500">
            {overdueTasks}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Requires team attention
          </p>
        </div>
      </div>

      {/* Progress Card (Linear Precision style, no rainbow gradient) */}
      <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-foreground/80" />
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Cycle Completion
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {completionPercent}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground/80 transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-2 font-mono">
          {completedTasks} of {totalTasks} issues resolved.
        </p>
      </div>

      {/* 2-Column Split: Workflow Status Distribution & Team Workload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 tracking-tight">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            Status Breakdown
          </h3>

          <div className="space-y-2.5">
            {[
              { status: "BACKLOG", label: "Backlog" },
              { status: "TODO", label: "To Do" },
              { status: "IN_PROGRESS", label: "In Progress" },
              { status: "IN_REVIEW", label: "In Review" },
              { status: "DONE", label: "Done" },
            ].map((col) => {
              const count = tasks.filter((t) => t.status === col.status).length;
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              return (
                <div key={col.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={col.status} size={12} />
                      <span className="text-foreground/90 font-medium">
                        {col.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {count} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-foreground/50 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload */}
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 tracking-tight">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Member Distribution
          </h3>

          <div className="space-y-3">
            {userWorkload.map(({ user, total, done }) => {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={user.id} className="flex items-center gap-2.5">
                  <Avatar
                    src={user.avatar}
                    fallback={user.name}
                    size="sm"
                    className="h-5 w-5 ring-1 ring-border text-[9px]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 ml-2">
                        {done}/{total} done
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground/60 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
