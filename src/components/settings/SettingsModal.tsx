"use client";

import React, { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import {
  fetchServerJoinRequests,
  JoinRequest,
} from "@/lib/invitation-service";
import {
  getOutlookSchedulerConfig,
  OUTLOOK_SCHEDULER_EVENT,
  OutlookSchedulerConfig,
} from "@/lib/outlook-scheduler";
import { SettingsModalProps, SettingsTab } from "./types";
import { RoleBadge } from "./RoleBadge";
import { ProfileTab } from "./tabs/ProfileTab";
import { MembersTab } from "./tabs/MembersTab";
import { WorkspaceTab } from "./tabs/WorkspaceTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { OutlookTab } from "./tabs/OutlookTab";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  User as UserIcon,
  Users,
  Building,
  Palette,
  Mail,
} from "lucide-react";

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  users,
  workspace,
  onUpdateCurrentUser,
  onUpdateUserRole,
  onAddMember,
  onRemoveMember,
  onUpdateWorkspace,
  onOpenCreateWorkspace,
  onOpenOutlookSync,
  onTriggerManualSync,
  onLogout,
  initialTab,
  isLoading = false,
}: SettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || "profile");

  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [isSchedulerEnabled, setIsSchedulerEnabled] = useState(() =>
    getOutlookSchedulerConfig().enabled
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (workspace?.id) {
        fetchServerJoinRequests(workspace.id).then((serverReqs) => {
          setPendingJoinRequests(serverReqs);
        });
      }
    }
  }, [isOpen, initialTab, workspace?.id]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<OutlookSchedulerConfig>;
      if (customEvent.detail) {
        setIsSchedulerEnabled(customEvent.detail.enabled);
      }
    };
    window.addEventListener(OUTLOOK_SCHEDULER_EVENT, handleUpdate);
    return () => window.removeEventListener(OUTLOOK_SCHEDULER_EVENT, handleUpdate);
  }, []);

  if (!isOpen) return null;

  const userInWs = users.find(
    (u) =>
      (currentUser.id && u.id === currentUser.id) ||
      (currentUser.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
  );
  const effectiveRole = userInWs?.role || currentUser.role;
  const isWsOwner = Boolean(
    (workspace.ownerId && (workspace.ownerId === currentUser.id || (userInWs && workspace.ownerId === userInWs.id))) ||
    (workspace.createdBy && (workspace.createdBy === currentUser.id || (userInWs && workspace.createdBy === userInWs.id)))
  );
  const isAdmin =
    effectiveRole?.toUpperCase() === "ADMIN" ||
    currentUser.role?.toUpperCase() === "ADMIN" ||
    isWsOwner;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} showCloseButton={false} className="max-w-3xl h-[580px] p-0 overflow-hidden flex flex-row border-border/80">
        {/* Left Sidebar Navigation */}
        <aside className="w-56 shrink-0 border-r border-border/70 bg-muted/20 p-3 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="px-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-foreground text-background flex items-center justify-center font-mono font-bold text-[10px]">
                  ⌘
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 font-mono">
                  {t("settings.title", "Settings")}
                </h2>
              </div>
            </div>

            <nav className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-foreground/10 dark:bg-foreground/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>{t("settings.myProfile", "My Profile")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "members"
                    ? "bg-foreground/10 dark:bg-foreground/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t("settings.members", "Members & Roles")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAdmin && pendingJoinRequests.length > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold text-[9px] animate-pulse"
                      title={`${pendingJoinRequests.length} permintaan bergabung menunggu persetujuan`}
                    >
                      {pendingJoinRequests.length}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/60" suppressHydrationWarning>
                    {users.length}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("workspace")}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "workspace"
                    ? "bg-foreground/10 dark:bg-foreground/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>{t("settings.workspace", "Workspace")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("appearance")}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "appearance"
                    ? "bg-foreground/10 dark:bg-foreground/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>{t("settings.appearance", "Appearance")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("outlook")}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "outlook"
                    ? "bg-foreground/10 dark:bg-foreground/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Outlook & AI Sync</span>
                </div>
                {isSchedulerEnabled && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Scheduler aktif" />
                )}
              </button>
            </nav>
          </div>

          {/* Current User Footnote */}
          <div className="rounded border border-border/60 bg-card p-2 text-[11px] space-y-1.5">
            <div className="text-[10px] font-mono text-muted-foreground/70 uppercase">
              {t("nav.signedInAs", "Signed in as")}
            </div>
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 truncate">
                  <Avatar
                    src={currentUser.avatar}
                    fallback={currentUser.name}
                    size="sm"
                    className="h-4 w-4 text-[8px]"
                  />
                  <span className="font-medium text-foreground truncate">
                    {currentUser.name}
                  </span>
                </div>
                <div>
                  <RoleBadge role={currentUser.role} />
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-6 py-3 bg-muted/10">
            <h3 className="text-sm font-semibold tracking-tight text-foreground capitalize">
              {activeTab === "profile" && "Profile & Account"}
              {activeTab === "members" && "Team Members & Permissions"}
              {activeTab === "workspace" && "Workspace Settings"}
              {activeTab === "appearance" && "Appearance & Density"}
              {activeTab === "outlook" && "Outlook & AI Sync"}
            </h3>

            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "profile" && (
              <ProfileTab
                currentUser={currentUser}
                onUpdateCurrentUser={onUpdateCurrentUser}
                onClose={onClose}
                isLoading={isLoading}
              />
            )}

            {activeTab === "members" && (
              <MembersTab
                currentUser={currentUser}
                users={users}
                workspace={workspace}
                isAdmin={isAdmin}
                onUpdateUserRole={onUpdateUserRole}
                onAddMember={onAddMember}
                onRemoveMember={onRemoveMember}
                isLoading={isLoading}
              />
            )}

            {activeTab === "workspace" && (
              <WorkspaceTab
                workspace={workspace}
                isAdmin={isAdmin}
                onUpdateWorkspace={onUpdateWorkspace}
                onOpenCreateWorkspace={onOpenCreateWorkspace}
                onClose={onClose}
                isLoading={isLoading}
              />
            )}

            {activeTab === "appearance" && (
              <AppearanceTab
                workspace={workspace}
                currentUser={currentUser}
                onUpdateWorkspace={onUpdateWorkspace}
                isLoading={isLoading}
              />
            )}

            {activeTab === "outlook" && (
              <OutlookTab
                onClose={onClose}
                onOpenOutlookSync={onOpenOutlookSync}
                onTriggerManualSync={onTriggerManualSync}
                isLoading={isLoading}
                workspace={workspace}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { SettingsTab, SettingsModalProps } from "./types";
export { RoleBadge } from "./RoleBadge";
