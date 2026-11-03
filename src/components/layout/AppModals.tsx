"use client";

import React from "react";
import { Task, Project, User, Workspace, TaskStatus, CommentAttachment, UserRole } from "@/types";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";
import { CreateTaskModal } from "@/components/task/CreateTaskModal";
import { CreateProjectModal } from "@/components/project/CreateProjectModal";
import { EditProjectModal } from "@/components/project/EditProjectModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { OutlookSyncModal } from "@/components/integrations/OutlookSyncModal";
import { MarketingCarousel } from "@/components/marketing/MarketingCarousel";

interface AppModalsProps {
  // Task Detail Drawer
  selectedTask: Task | null;
  onCloseTaskDetail: () => void;
  users: User[];
  currentUser: User;
  workspace: Workspace;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (subtaskId: string, completed: boolean) => void;
  onAddComment: (
    taskId: string,
    content: string,
    attachments?: CommentAttachment[],
    commentId?: string
  ) => void;
  onAddNotification: (notification: any) => void;

  // Create Task Modal
  isCreateTaskOpen: boolean;
  onCloseCreateTask: () => void;
  workspaceProjects: Project[];
  activeProjectId: string;
  createTaskStatus: TaskStatus;
  currentNav: string;
  onCreateTask: (data: any) => void;

  // Create Project Modal
  isCreateProjectOpen: boolean;
  onCloseCreateProject: () => void;
  onCreateProject: (data: any) => void;

  // Edit Project Modal
  editingProject: Project | null;
  onCloseEditProject: () => void;
  onUpdateProject: (id: string, data: any) => void;
  onDeleteProject: (id: string) => void;

  // Settings Modal
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  settingsInitialTab: "profile" | "members" | "workspace" | "appearance" | "outlook";
  onUpdateCurrentUser: (updates: Partial<User>) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onAddMember: (member: any) => void;
  onRemoveMember: (userId: string) => void;
  onUpdateWorkspace: (updates: Partial<Workspace>) => void;
  onOpenCreateWorkspace: () => void;
  onOpenOutlookSync: () => void;
  onTriggerManualSync: () => Promise<void>;
  onLogout: () => void;

  // Create Workspace Modal
  isCreateWorkspaceOpen: boolean;
  onCloseCreateWorkspace: () => void;
  onCreateWorkspace: (data: any) => void;
  onJoinedWorkspace: (workspace: Workspace) => void;

  // Outlook Sync Modal
  isOutlookSyncOpen: boolean;
  onCloseOutlookSync: () => void;
  onOutlookTasksCreated: (tasks: Task[]) => void;

  // Marketing Tour Modal
  isMarketingModalOpen: boolean;
  onCloseMarketingModal: () => void;
  onSelectNav: (nav: any) => void;
}

export function AppModals({
  selectedTask,
  onCloseTaskDetail,
  users,
  currentUser,
  workspace,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onAddComment,
  onAddNotification,
  isCreateTaskOpen,
  onCloseCreateTask,
  workspaceProjects,
  activeProjectId,
  createTaskStatus,
  currentNav,
  onCreateTask,
  isCreateProjectOpen,
  onCloseCreateProject,
  onCreateProject,
  editingProject,
  onCloseEditProject,
  onUpdateProject,
  onDeleteProject,
  isSettingsOpen,
  onCloseSettings,
  settingsInitialTab,
  onUpdateCurrentUser,
  onUpdateUserRole,
  onAddMember,
  onRemoveMember,
  onUpdateWorkspace,
  onOpenCreateWorkspace,
  onOpenOutlookSync,
  onTriggerManualSync,
  onLogout,
  isCreateWorkspaceOpen,
  onCloseCreateWorkspace,
  onCreateWorkspace,
  onJoinedWorkspace,
  isOutlookSyncOpen,
  onCloseOutlookSync,
  onOutlookTasksCreated,
  isMarketingModalOpen,
  onCloseMarketingModal,
  onSelectNav,
}: AppModalsProps) {
  return (
    <>
      {/* 1. Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        users={users}
        currentUser={currentUser}
        workspace={workspace}
        workspaceId={workspace.id}
        onClose={onCloseTaskDetail}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onAddComment={onAddComment}
        onAddNotification={onAddNotification}
      />

      {/* 2. Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        projects={workspaceProjects}
        users={users}
        defaultProjectId={activeProjectId}
        defaultStatus={createTaskStatus}
        defaultAssigneeId={
          currentNav === "my-tasks" ? currentUser.id : undefined
        }
        onClose={onCloseCreateTask}
        onCreateTask={onCreateTask}
      />

      {/* 3. Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={onCloseCreateProject}
        onCreateProject={onCreateProject}
      />

      {/* 4. Edit & Delete Project Modal */}
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        currentUser={currentUser}
        onClose={onCloseEditProject}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
      />

      {/* 5. Workspace & Account Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        currentUser={currentUser}
        users={users}
        workspace={workspace}
        initialTab={settingsInitialTab}
        onUpdateCurrentUser={onUpdateCurrentUser}
        onUpdateUserRole={onUpdateUserRole}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
        onUpdateWorkspace={onUpdateWorkspace}
        onOpenCreateWorkspace={onOpenCreateWorkspace}
        onOpenOutlookSync={onOpenOutlookSync}
        onTriggerManualSync={onTriggerManualSync}
        onLogout={onLogout}
      />

      {/* 6. Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={onCloseCreateWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        currentUser={currentUser}
        onJoinedWorkspace={(targetWs) => {
          onJoinedWorkspace(targetWs);
          onCloseCreateWorkspace();
        }}
      />

      {/* 7. Outlook Email Sync & AI Backlog Modal */}
      <OutlookSyncModal
        isOpen={isOutlookSyncOpen}
        onClose={onCloseOutlookSync}
        workspaceId={workspace.id}
        projectId={activeProjectId}
        members={users}
        onTasksCreated={onOutlookTasksCreated}
      />

      {/* 8. Marketing Feature Tour Modal (Global Zustand) */}
      <MarketingCarousel
        isOpen={isMarketingModalOpen}
        onClose={onCloseMarketingModal}
        onSelectTab={(tab) => {
          onSelectNav(tab);
          onCloseMarketingModal();
        }}
      />
    </>
  );
}
