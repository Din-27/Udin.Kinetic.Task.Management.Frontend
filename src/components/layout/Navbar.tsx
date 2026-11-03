"use client";

import React from "react";
import { Project, User, Workspace } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  List,
  MessageSquare,
  Hash,
  BarChart3,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  Layers,
  Pencil,
  Shield,
  ShieldAlert,
  Bell,
  Tag,
  Users,
  UserPlus,
  CheckCheck,
  Building2,
  ChevronDown,
  Check,
  Mail,
  FileText,
  SlidersHorizontal,
  RotateCw,
  Sparkles,
  Workflow,
  Presentation,
  Menu,
} from "lucide-react";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { Avatar } from "@/components/ui/avatar";
import { AppNotification } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import { isDevelopment } from "@/lib/env";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import { useUiStore } from "@/lib/stores/ui-store";

interface NavbarProps {
  currentNav: "all-issues" | "project" | "my-tasks" | "chat" | "ai-assistant" | "flowchart" | "whiteboard";
  project?: Project;
  currentUser?: User;
  workspace?: Workspace;
  workspaces?: Workspace[];
  workspaceName?: string;
  onSelectWorkspace?: (ws: Workspace) => void;
  onOpenCreateWorkspace?: () => void;
  currentTab: "board" | "list" | "chat" | "overview";
  onSelectTab: (tab: "board" | "list" | "chat" | "overview") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateTask: () => void;
  priorityFilter: string;
  onPriorityFilterChange: (p: string) => void;
  myTasksFilter?: "assigned" | "created" | "all";
  onMyTasksFilterChange?: (filter: "assigned" | "created" | "all") => void;
  myTasksCount?: { assigned: number; created: number; all: number };
  onOpenEditProject?: (project: Project) => void;
  notifications?: AppNotification[];
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onOpenOutlookSync?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
  projectChatUnreadCount?: number;
}

export function Navbar({
  currentNav,
  project,
  currentUser,
  workspaceName,
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenCreateTask,
  priorityFilter,
  onPriorityFilterChange,
  myTasksFilter = "assigned",
  onMyTasksFilterChange,
  myTasksCount,
  onOpenEditProject,
  workspace,
  workspaces = [],
  onSelectWorkspace,
  onOpenCreateWorkspace,
  notifications = [],
  onMarkAllNotificationsRead,
  onNotificationClick,
  onOpenOutlookSync,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  projectChatUnreadCount = 0,
}: NavbarProps) {
  const { t } = useTranslation();
  const { toggleMobileSidebar } = useUiStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = React.useState(false);
  const wsColor = workspace?.color || "#6366f1";
  const isTaskRelatedPage =
    currentNav === "project" || currentNav === "all-issues" || currentNav === "my-tasks";

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className="sticky top-0 z-50 flex flex-col border-b bg-background/95 backdrop-blur-md px-3 sm:px-5 pt-2.5 select-none transition-colors"
      style={{
        borderBottomColor: `${wsColor}25`,
        background: `linear-gradient(to right, ${wsColor}0d, transparent 40%), var(--background)`,
      }}
    >
      {/* Top Bar: Title, Search, Actions */}
      <div className="flex items-center justify-between pb-2.5 gap-1.5 sm:gap-3 w-full min-w-0">
        {/* Navigation Context Title & Key */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          {/* Mobile Sidebar Hamburger Toggle Button */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="md:hidden h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 border border-border/60"
            title="Buka Menu Navigasi"
          >
            <Menu className="h-4 w-4" />
          </button>
          {currentNav === "my-tasks" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-foreground/10 text-foreground flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                    My Issues
                  </h1>
                  {currentUser && (
                    <span className="text-[11px] font-mono text-muted-foreground/70 hidden sm:inline-block">
                      {currentUser.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  {myTasksFilter === "created"
                    ? "Issues created by you"
                    : myTasksFilter === "all"
                      ? "All issues assigned to or created by you"
                      : `Issues assigned to you in ${workspaceName || "workspace"}`}
                </p>
              </div>
            </div>
          )}

          {currentNav === "all-issues" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-foreground/10 text-foreground flex items-center justify-center shrink-0">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                  All Issues
                </h1>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  Cross-project workspace issue tracker
                </p>
              </div>
            </div>
          )}

          {currentNav === "project" && (
            <div className="flex items-center gap-2.5 min-w-0">
              {project && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                    {project ? project.name : "Project"}
                  </h1>
                  {project && onOpenEditProject && (
                    <button
                      type="button"
                      onClick={() => onOpenEditProject(project)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title={currentUser?.role !== "VIEWER" ? "Ubah Project" : "Detail Project"}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  {project?.description || "Project issues and milestones"}
                </p>
              </div>
            </div>
          )}

          {currentNav === "chat" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-foreground/10 text-foreground flex items-center justify-center shrink-0">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                  Diskusi Tim
                </h1>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  Ruang obrolan umum & pengumuman seluruh tim workspace
                </p>
              </div>
            </div>
          )}

          {currentNav === "ai-assistant" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-foreground/10 text-foreground flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                  Tanya AI
                </h1>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  Asisten cerdas berbasis dokumen lampiran &amp; riwayat diskusi kartu
                </p>
              </div>
            </div>
          )}

          {currentNav === "flowchart" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <Workflow className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                  AI Flowchart
                </h1>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  Visual flowchart &amp; diagram generator powered by AI
                </p>
              </div>
            </div>
          )}

          {currentNav === "whiteboard" && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Presentation className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                    Papan Tulis Kolaboratif
                  </h1>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Streaming
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden md:block">
                  Papan tulis interaktif real-time dengan kursor ala Figma, sinkronisasi seketika, dan kolom tanya-jawab
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search, Filter, Theme, and + New Issue */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">

          {/* Linear-Style Search Input with Kbd shortcut - Hanya tampil di sesi page task */}
          {isTaskRelatedPage && (
            <div className="relative w-28 xs:w-36 sm:w-56 transition-all duration-200 focus-within:w-36 sm:focus-within:w-56">
              <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground/70 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("common.search", "Cari task...")}
                className="h-7 pl-7 pr-2 text-xs bg-muted/40 border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/30 rounded-md placeholder:text-muted-foreground/60 w-full"
              />
            </div>
          )}

          {/* Priority Filter - Hanya tampil di sesi page task */}
          {isTaskRelatedPage && (
            <div className="relative hidden md:inline-block w-40">
              <Select
                value={priorityFilter}
                onValueChange={(val) => onPriorityFilterChange(val)}
              >
                <SelectTrigger className="h-7 text-xs bg-background border-border/80">
                  <SelectValue placeholder="All Priorities">
                    <div className="flex items-center gap-1.5 truncate">
                      {priorityFilter === "ALL" ? (
                        <SlidersHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <PriorityIcon priority={priorityFilter} size={13} />
                      )}
                      <span className="truncate">
                        {priorityFilter === "ALL"
                          ? "All Priorities"
                          : priorityFilter === "URGENT"
                            ? "Urgent"
                            : priorityFilter === "HIGH"
                              ? "High"
                              : priorityFilter === "MEDIUM"
                                ? "Medium"
                                : priorityFilter === "LOW"
                                  ? "Low"
                                  : priorityFilter}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>All Priorities</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority="URGENT" size={13} />
                      <span>Urgent</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority="HIGH" size={13} />
                      <span>High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority="MEDIUM" size={13} />
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority="LOW" size={13} />
                      <span>Low</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Refresh / Re-sync button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing || isLoading}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 cursor-pointer"
              title="Muat ulang data workspace"
            >
              <RotateCw
                className={`h-3.5 w-3.5 transition-transform duration-500 ${isRefreshing || isLoading ? "animate-spin text-[var(--workspace-accent)]" : ""
                  }`}
              />
            </button>
          )}

          {/* In-App Notifications Bell (Tags & Collaborators activity) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
              className="relative h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Notifikasi Kolaborasi & Tag"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-xl border border-border/80 bg-popover text-popover-foreground p-3 shadow-2xl backdrop-blur-md animate-scale-up z-50 select-none">
                  {/* Notification Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        Notifikasi
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30">
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAllNotificationsRead();
                        }}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors"
                        title="Tandai semua sudah dibaca"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Tandai dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Belum ada notifikasi baru
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isTag = notif.type.startsWith("TAG");
                        const isCollab = notif.type.startsWith("COLLABORATOR");
                        const isJoinReq = notif.type === "JOIN_REQUEST";

                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (onNotificationClick) onNotificationClick(notif);
                              setIsNotifMenuOpen(false);
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${notif.read
                                ? "border-border/40 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                                : "border-foreground/20 bg-card hover:bg-muted/50 text-foreground shadow-2xs"
                              }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Icon Badge */}
                              <div
                                className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isJoinReq
                                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                    : isTag
                                      ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/30"
                                      : isCollab
                                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {isJoinReq ? (
                                  <UserPlus className="h-3 w-3" />
                                ) : isTag ? (
                                  <Tag className="h-3 w-3" />
                                ) : isCollab ? (
                                  <Users className="h-3 w-3" />
                                ) : (
                                  <Bell className="h-3 w-3" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-semibold text-[11px] truncate">
                                    {notif.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                                    {formatRelativeDate(notif.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                  {notif.message}
                                </p>
                                {notif.taskTitle && (
                                  <div className="mt-1 text-[10px] font-mono text-muted-foreground/80 truncate bg-muted/40 px-1.5 py-0.5 rounded border border-border/50">
                                    <span className="inline-flex items-center gap-1">
                                      <FileText className="h-2.5 w-2.5 shrink-0" />
                                      <span>{notif.taskTitle}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Viewer Read-Only Badge */}
          {currentUser?.role === "VIEWER" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono border border-border/80 bg-muted/40 text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>Read-Only</span>
            </span>
          )}

          {/* "+ New Issue" Button - Hanya tampil di sesi page task */}
          {isTaskRelatedPage && currentUser?.role !== "VIEWER" ? (
            <Button
              variant="asana"
              size="sm"
              onClick={onOpenCreateTask}
              className="h-7 px-2 sm:px-2.5 text-xs font-medium rounded-md gap-1 sm:gap-1.5 shrink-0"
              title="Buat issue baru"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">{t("common.newTask", "New Issue")}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* View Tabs: Board, List, Obrolan Project, Insights - Hanya tampil di sesi page task */}
      {isTaskRelatedPage && (
        <div className="flex items-center gap-1 pt-1 -mb-px overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectTab("board")}
            style={
              currentTab === "board"
                ? { borderBottomColor: wsColor, color: wsColor }
                : {}
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all shrink-0 ${
              currentTab === "board"
                ? "font-semibold shadow-2xs"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>{t("tabs.board", "Board")}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("list")}
            style={
              currentTab === "list"
                ? { borderBottomColor: wsColor, color: wsColor }
                : {}
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all shrink-0 ${
              currentTab === "list"
                ? "font-semibold shadow-2xs"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>{t("tabs.list", "List")}</span>
          </button>

          {project && (
            <button
              type="button"
              onClick={() => onSelectTab("chat")}
              style={
                currentTab === "chat"
                  ? { borderBottomColor: wsColor, color: wsColor }
                  : {}
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all shrink-0 ${
                currentTab === "chat"
                  ? "font-semibold shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              <span>Obrolan Project</span>
              {projectChatUnreadCount > 0 && (
                <span
                  className="font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white shadow-2xs animate-pulse ml-0.5"
                  title={`${projectChatUnreadCount} pesan obrolan project belum dibaca`}
                >
                  {projectChatUnreadCount > 9 ? "9+" : projectChatUnreadCount}
                </span>
              )}
            </button>
          )}

          {project && (
            <button
              type="button"
              onClick={() => onSelectTab("overview")}
              style={
                currentTab === "overview"
                  ? { borderBottomColor: wsColor, color: wsColor }
                  : {}
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all shrink-0 ${
                currentTab === "overview"
                  ? "font-semibold shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{t("tabs.overview", "Insights")}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
