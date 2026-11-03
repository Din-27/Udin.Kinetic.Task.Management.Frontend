"use client";

import React from "react";
import { Project, Workspace, User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import {
  FolderKanban,
  Rocket,
  Palette,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  Layers,
  Plus,
  LogOut,
  ShieldAlert,
  Shield,
  Eye,
  Lock,
  Settings,
  Pencil,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Sparkles,
  Workflow,
  Presentation,
  X,
} from "lucide-react";
import { toastAlert } from "@/components/ui/alert-toast";
import { isDevelopment } from "@/lib/env";
import { useTranslation } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  onSelectWorkspace?: (workspace: Workspace) => void;
  onOpenCreateWorkspace?: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings: () => void;
  currentNav: "all-issues" | "project" | "my-tasks" | "chat" | "ai-assistant" | "flowchart" | "whiteboard";
  onSelectNav: (nav: "all-issues" | "project" | "my-tasks" | "chat" | "ai-assistant" | "flowchart" | "whiteboard") => void;
  myTasksCount?: number;
  onEditProject?: (project: Project) => void;
  teamChatUnreadCount?: number;
  projectChatUnreadMap?: Record<string, number>;
  aiChatUnreadCount?: number;
  isLoading?: boolean;
}

export function Sidebar({
  workspace,
  workspaces = [],
  onSelectWorkspace,
  onOpenCreateWorkspace,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenCreateProject,
  currentUser,
  onLogout,
  onOpenSettings,
  currentNav,
  onSelectNav,
  myTasksCount = 0,
  onEditProject,
  teamChatUnreadCount = 0,
  projectChatUnreadMap = {},
  aiChatUnreadCount = 0,
  isLoading = false,
}: SidebarProps) {
  const { t } = useTranslation();
  const { setMobileSidebarOpen, toggleMarketingModal } = useUiStore();
  const isAdmin = currentUser.role === "ADMIN";
  const isViewer = currentUser.role === "VIEWER";
  const wsColor = workspace?.color || "#6366f1";

  const getRolePill = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.5 text-[9px] font-medium shrink-0 leading-none">
            <ShieldAlert className="h-2.5 w-2.5" />
            Admin
          </span>
        );
      case "MEMBER":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 text-[9px] font-medium shrink-0 leading-none">
            <Shield className="h-2.5 w-2.5" />
            Member
          </span>
        );
      case "VIEWER":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted text-muted-foreground border border-border/70 px-1.5 py-0.5 text-[9px] font-medium shrink-0 leading-none">
            <Eye className="h-2.5 w-2.5" />
            Viewer
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <aside className="flex h-screen w-60 flex-col justify-between border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground p-2.5 select-none shrink-0 relative animate-fade-in">
        <div className="space-y-4">
          {/* Workspace Selector Skeleton */}
          <div className="flex items-center gap-2.5 p-1.5 rounded-lg border border-border/60 bg-muted/20">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
            <Skeleton className="h-3 w-3 rounded shrink-0" />
          </div>

          {/* Navigation Items Skeleton */}
          <div className="space-y-1 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-muted/20">
                <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                <Skeleton className="h-3.5 flex-1 rounded" />
              </div>
            ))}
          </div>

          {/* Projects List Skeleton */}
          <div className="space-y-1.5 pt-3">
            <div className="flex items-center justify-between px-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
            <div className="space-y-1 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/15">
                  <div className="flex items-center gap-2 min-w-0">
                    <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-2.5 w-5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer User Profile Card Skeleton */}
        <div className="rounded-md border border-border/70 bg-card p-2 space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-2.5 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 rounded-full shrink-0" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-screen w-60 flex-col justify-between border-r bg-sidebar text-sidebar-foreground p-2.5 select-none shrink-0 transition-all relative"
      style={{
        borderRightColor: `${wsColor}25`,
        background: `radial-gradient(ellipse 160% 45% at 0% 0%, ${wsColor}15, transparent 75%), var(--sidebar)`,
      }}
    >
      {/* Top Section */}
      <div className="space-y-4">
        {/* Workspace Brand / Header with Close button on mobile */}
        <div className="flex items-center justify-between gap-1">
          <DropdownMenu className="w-full">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg p-1.5 text-left hover:bg-muted/60 transition-all border border-transparent hover:border-sidebar-border group cursor-pointer"
                title="Pilih Workspace"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-7 w-7 rounded-md text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs tracking-tight transition-transform group-hover:scale-105 shrink-0"
                    style={{ backgroundColor: wsColor }}
                  >
                    ⌘
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold tracking-tight text-foreground truncate">
                      {workspace.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono flex items-center gap-1">
                      workspace
                      {workspace.slug && (
                        <span className="text-muted-foreground/50">· /{workspace.slug}</span>
                      )}
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-[220px] p-2 shadow-2xl">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between mb-1">
                <span>Workspaces</span>
                <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-semibold">
                  {workspaces?.length || 1}
                </span>
              </div>

              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {workspaces && workspaces.length > 0 ? (
                  workspaces.map((ws) => {
                    const isActive = ws.id === workspace.id;
                    return (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => onSelectWorkspace?.(ws)}
                        className={isActive ? "bg-foreground/10 text-foreground font-semibold" : ""}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className="h-3.5 w-3.5 rounded text-white flex items-center justify-center font-mono font-bold text-[8px] shrink-0"
                              style={{ backgroundColor: ws.color || "#6366f1" }}
                            >
                              ⌘
                            </div>
                            <div className="flex flex-col text-left truncate">
                              <span className="truncate">{ws.name}</span>
                              {ws.slug && (
                                <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                  /{ws.slug}
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 stroke-[3]" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {workspace.name}
                  </div>
                )}
              </div>

              {onOpenCreateWorkspace && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenCreateWorkspace}>
                    <Plus className="h-3.5 w-3.5 shrink-0 mr-1 text-primary" />
                    <span>Tambah Workspace...</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Close Sidebar Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 border border-border/60"
            title="Tutup Menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Views Navigation */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectNav("all-issues")}
            style={
              currentNav === "all-issues"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "all-issues"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              <span>{t("nav.allIssues", "All Issues")}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("my-tasks")}
            style={
              currentNav === "my-tasks"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "my-tasks"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t("nav.myIssues", "My Issues")}</span>
            </div>
            {myTasksCount > 0 && (
              <span
                className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-semibold"
                style={{ backgroundColor: `${wsColor}25`, color: wsColor }}
              >
                {myTasksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("chat")}
            style={
              currentNav === "chat"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "chat"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t("nav.teamDiscussions", "Team Discussions")}</span>
            </div>
            {teamChatUnreadCount > 0 ? (
              <span
                className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white shadow-2xs animate-pulse"
                title={`${teamChatUnreadCount} pesan diskusi tim belum dibaca`}
              >
                {teamChatUnreadCount > 9 ? "9+" : teamChatUnreadCount}
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: wsColor }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("ai-assistant")}
            style={
              currentNav === "ai-assistant"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "ai-assistant"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>Tanya AI</span>
            </div>
            {aiChatUnreadCount > 0 && (
              <span
                className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white shadow-2xs"
                title={`${aiChatUnreadCount} jawaban AI baru`}
              >
                {aiChatUnreadCount > 9 ? "9+" : aiChatUnreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("flowchart")}
            style={
              currentNav === "flowchart"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "flowchart"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <Workflow className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>AI Flowchart</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectNav("whiteboard")}
            style={
              currentNav === "whiteboard"
                ? { backgroundColor: `${wsColor}18`, color: wsColor }
                : {}
            }
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${currentNav === "whiteboard"
                ? "font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <div className="flex items-center gap-2">
              <Presentation className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>Papan Tulis Kolaboratif</span>
            </div>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono uppercase text-emerald-500 font-bold">LIVE</span>
            </span>
          </button>
        </div>

        {/* Projects List */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
            <span>{t("nav.projects", "Projects")}</span>
            {currentUser.role !== "VIEWER" ? (
              <button
                type="button"
                onClick={onOpenCreateProject}
                className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground/70 hover:text-[var(--workspace-accent)] hover:bg-[var(--workspace-accent)]/15 transition-colors"
                title="Tambah Project Baru"
              >
                <Plus className="h-3 w-3" />
              </button>
            ) : (
              <span title="Akses Viewer: Hanya dapat melihat">
                <Lock className="h-3 w-3 text-muted-foreground/40" />
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            {projects.length === 0 && (
              <div className="px-2 py-3 text-center rounded border border-dashed border-border/60 bg-muted/10 my-1">
                <p className="text-[11px] text-muted-foreground">Belum ada project</p>
                {currentUser.role !== "VIEWER" && (
                  <button
                    type="button"
                    onClick={onOpenCreateProject}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Buat Project
                  </button>
                )}
              </div>
            )}
            {projects.map((proj) => {
              const isActive =
                currentNav === "project" && activeProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectProject(proj.id);
                    onSelectNav("project");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectProject(proj.id);
                      onSelectNav("project");
                    }
                  }}
                  style={
                    isActive
                      ? { backgroundColor: `${wsColor}18`, color: wsColor }
                      : {}
                  }
                  className={`group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer select-none ${isActive
                      ? "font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span className="truncate text-xs">{proj.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onEditProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject(proj);
                        }}
                        className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 hover:!opacity-100 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-muted transition-all"
                        title={currentUser.role !== "VIEWER" ? "Ubah Project" : "Detail Project"}
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {projectChatUnreadMap && projectChatUnreadMap[proj.id] > 0 && (
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white shadow-2xs animate-pulse"
                        title={`${projectChatUnreadMap[proj.id]} pesan project chat belum dibaca`}
                      >
                        {projectChatUnreadMap[proj.id] > 9 ? "9+" : projectChatUnreadMap[proj.id]}
                      </span>
                    )}
                    {proj.taskCount !== undefined && (
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {proj.taskCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: User Account */}
      <div className="pt-2 border-t border-sidebar-border/80">
        {/* User Profile Card with Shadcn Dropdown Menu */}
        <DropdownMenu className="w-full">
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer w-full group">
              <Avatar
                src={currentUser.avatar}
                fallback={currentUser.name}
                size="sm"
                className="h-7 w-7 ring-1 ring-border/80 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-foreground truncate leading-tight">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  {getRolePill(currentUser.role)}
                  <span className="text-[10px] font-mono text-muted-foreground/70 truncate">
                    {currentUser.title || currentUser.email}
                  </span>
                </div>
              </div>

              {/* Dropdown Indicator */}
              <div className="flex items-center shrink-0 text-muted-foreground/60 group-hover:text-foreground">
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-[230px] p-2 shadow-2xl">
            <div className="px-2 py-1.5 border-b border-border/60 mb-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground truncate">
                  {currentUser.name}
                </span>
                {getRolePill(currentUser.role)}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/80 truncate mt-0.5">
                {currentUser.email}
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("settings.title", "Pengaturan (Settings)")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onLogout} variant="destructive" className="gap-2 cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span>{t("nav.logout", "Keluar")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
