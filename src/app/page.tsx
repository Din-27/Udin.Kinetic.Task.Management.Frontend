"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";
import { AppModals } from "@/components/layout/AppModals";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { ListView } from "@/components/list/ListView";
import { TeamChatView } from "@/components/chat/TeamChatView";
import { ProjectOverview } from "@/components/overview/ProjectOverview";
import { AIAssistantView } from "@/components/rag/AIAssistantView";
import { FlowchartView } from "@/components/flowchart/FlowchartView";
import { WhiteboardView } from "@/components/whiteboard/WhiteboardView";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { LandingPage } from "@/components/landing/LandingPage";
import { WorkspaceOnboarding } from "@/components/workspace/WorkspaceOnboarding";
import { toastAlert } from "@/components/ui/alert-toast";
import { subscribeToPushNotifications } from "@/lib/web-push";
import { useAppState } from "@/lib/hooks/useAppState";

export default function AsanaApp() {
  const {
    // States
    workspaces,
    workspace,
    isNewUserOnboarding,
    isCreateWorkspaceOpen,
    setIsCreateWorkspaceOpen,
    activeProjectId,
    setActiveProjectId,
    tasks,
    users,
    currentUser,
    notifications,
    isAuthenticated,
    showAuthScreen,
    setShowAuthScreen,
    currentNav,
    setCurrentNav,
    isFlowchartSidebarCollapsed,
    setIsFlowchartSidebarCollapsed,
    myTasksFilter,
    setMyTasksFilter,
    currentTab,
    setCurrentTab,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    selectedTask,
    setSelectedTask,
    isCreateTaskOpen,
    setIsCreateTaskOpen,
    createTaskStatus,
    setCreateTaskStatus,
    isCreateProjectOpen,
    setIsCreateProjectOpen,
    editingProject,
    setEditingProject,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsInitialTab,
    setSettingsInitialTab,
    isOutlookSyncOpen,
    setIsOutlookSyncOpen,
    isAuthInitializing,
    isWorkspacesInitializing,
    isDataLoading,
    isRefreshing,
    pendingInvitation,
    hasPushEnabled,
    setHasPushEnabled,
    sessionStatus,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    isMarketingModalOpen,
    setIsMarketingModalOpen,

    // Computed
    workspaceProjects,
    activeProject,
    workspaceTasks,
    displayedTasks,
    myAssignedCount,
    myCreatedCount,
    myAllCount,
    teamChatUnreadCount,
    projectChatUnreadMap,
    activeProjectChatUnreadCount,

    // Actions & Handlers
    handleLogin,
    handleLogout,
    handleSwitchUser,
    refreshData,
    handleSelectTask,
    handleAddNotification,
    handleMarkAllNotificationsRead,
    handleNotificationClick,
    handleCreateTask,
    handleOutlookTasksCreated,
    handleUpdateTask,
    handleDeleteTask,
    handleToggleComplete,
    handleMoveTask,
    handleQuickAddTask,
    handleAddSubtask,
    handleToggleSubtask,
    handleAddComment,
    handleCreateProject,
    handleOpenCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleUpdateCurrentUser,
    handleUpdateUserRole,
    handleAddMember,
    handleRemoveMember,
    handleUpdateWorkspace,
    handleCreateWorkspace,
    handleJoinedWorkspace,
    handleSelectWorkspace,
    runOutlookAutoSync,
  } = useAppState();

  // 1. Initial Loading Screen
  if (
    isAuthInitializing ||
    sessionStatus === "loading" ||
    (isAuthenticated && isWorkspacesInitializing)
  ) {
    return <AppLoadingScreen />;
  }

  // 2. Unauthenticated: Landing Page or Login Screen
  if (!isAuthenticated) {
    if (!showAuthScreen && !pendingInvitation) {
      return (
        <LandingPage
          onGetStarted={() => setShowAuthScreen(true)}
          onLogin={() => setShowAuthScreen(true)}
        />
      );
    }
    return (
      <LoginScreen
        availableUsers={users}
        onLogin={handleLogin}
        pendingInvitation={pendingInvitation}
        onBackToHome={() => setShowAuthScreen(false)}
      />
    );
  }

  // 3. New User Onboarding / No Workspace
  if (isNewUserOnboarding || workspaces.length === 0 || !workspace?.id) {
    return (
      <WorkspaceOnboarding
        currentUser={currentUser}
        onCreateWorkspace={handleCreateWorkspace}
        onLogout={handleLogout}
        onJoinedWorkspace={handleJoinedWorkspace}
      />
    );
  }

  // 4. Main Responsive Application Layout
  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background"
      style={
        {
          "--workspace-accent": workspace.color || "#6366f1",
        } as React.CSSProperties
      }
    >
      {/* Desktop Sidebar (Collapsible khusus di fitur Draw.io Flowchart) */}
      <div
        className={`hidden md:flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          currentNav === "flowchart" && isFlowchartSidebarCollapsed
            ? "w-0 opacity-0 pointer-events-none -ml-60 sm:-ml-60"
            : "w-60 opacity-100"
        }`}
      >
        <Sidebar
          workspace={workspace}
          workspaces={workspaces}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
          projects={workspaceProjects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setCurrentNav("project");
          }}
          onOpenCreateProject={handleOpenCreateProject}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentNav={currentNav}
          onSelectNav={(nav) => {
            setCurrentNav(nav);
            if (nav !== "chat" && currentTab === "chat" && nav !== "project") {
              setCurrentTab("board");
            } else if (currentTab === "overview" && nav !== "project") {
              setCurrentTab("board");
            }
          }}
          myTasksCount={myAssignedCount}
          onEditProject={(proj) => setEditingProject(proj)}
          teamChatUnreadCount={teamChatUnreadCount}
          projectChatUnreadMap={projectChatUnreadMap}
          isLoading={isDataLoading}
        />
      </div>

      {/* Mobile Sidebar Overlay Drawer (Responsive Mobile Drawer) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-sidebar border-r border-sidebar-border z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              workspace={workspace}
              workspaces={workspaces}
              onSelectWorkspace={(ws) => {
                handleSelectWorkspace(ws);
                setMobileSidebarOpen(false);
              }}
              onOpenCreateWorkspace={() => {
                setIsCreateWorkspaceOpen(true);
                setMobileSidebarOpen(false);
              }}
              projects={workspaceProjects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                setCurrentNav("project");
                setMobileSidebarOpen(false);
              }}
              onOpenCreateProject={() => {
                handleOpenCreateProject();
                setMobileSidebarOpen(false);
              }}
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenSettings={() => {
                setIsSettingsOpen(true);
                setMobileSidebarOpen(false);
              }}
              currentNav={currentNav}
              onSelectNav={(nav) => {
                setCurrentNav(nav);
                setMobileSidebarOpen(false);
                if (nav !== "chat" && currentTab === "chat" && nav !== "project") {
                  setCurrentTab("board");
                } else if (currentTab === "overview" && nav !== "project") {
                  setCurrentTab("board");
                }
              }}
              myTasksCount={myAssignedCount}
              onEditProject={(proj) => {
                setEditingProject(proj);
                setMobileSidebarOpen(false);
              }}
              teamChatUnreadCount={teamChatUnreadCount}
              projectChatUnreadMap={projectChatUnreadMap}
              isLoading={isDataLoading}
            />
          </div>
        </div>
      )}

      {/* Main App Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Navbar */}
        <Navbar
          currentNav={currentNav}
          project={currentNav === "project" ? activeProject : undefined}
          currentUser={currentUser}
          workspace={workspace}
          workspaces={workspaces}
          workspaceName={workspace.name}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateTask={() => {
            if (currentUser.role === "VIEWER") {
              toastAlert({
                title: "Akses Viewer (Read-only)",
                description: "Anda tidak memiliki izin untuk membuat issue baru.",
                variant: "warning",
              });
              return;
            }
            setCreateTaskStatus("TODO");
            setIsCreateTaskOpen(true);
          }}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          onOpenOutlookSync={() => setIsOutlookSyncOpen(true)}
          myTasksFilter={myTasksFilter}
          onMyTasksFilterChange={setMyTasksFilter}
          myTasksCount={{
            assigned: myAssignedCount,
            created: myCreatedCount,
            all: myAllCount,
          }}
          onOpenEditProject={(proj) => setEditingProject(proj)}
          notifications={notifications}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onNotificationClick={handleNotificationClick}
          onRefresh={refreshData}
          isRefreshing={isRefreshing}
          isLoading={isDataLoading}
          projectChatUnreadCount={activeProjectChatUnreadCount}
        />

        {/* View Contents (Diberi padding-bottom di mobile agar tidak terhalang bottom nav) */}
        <main
          className={
            currentNav === "flowchart" || currentNav === "whiteboard"
              ? "flex-1 overflow-hidden p-0 relative h-full w-full"
              : "flex-1 overflow-y-auto p-4 sm:p-5 pb-20 md:pb-5 transition-colors relative"
          }
          style={
            currentNav === "flowchart" || currentNav === "whiteboard"
              ? { background: "var(--background)" }
              : {
                  background: `radial-gradient(ellipse 90% 40% at 50% 0%, ${workspace.color || "#6366f1"}0d, transparent 70%), var(--background)`,
                }
          }
        >
          {/* Top Loading Progress Bar */}
          {isDataLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/20 overflow-hidden z-30 pointer-events-none">
              <div className="h-full bg-[var(--workspace-accent,#6366f1)] animate-indeterminate" />
            </div>
          )}

          {/* Interactive Onboarding Checklist for New Users (hanya ditampilkan pada halaman board/project/tasks, tidak di Tanya AI, Chat, Flowchart, atau Whiteboard) */}
          {currentNav !== "flowchart" &&
            currentNav !== "whiteboard" &&
            currentNav !== "ai-assistant" &&
            currentNav !== "chat" && (
            <OnboardingChecklist
              workspaceName={workspace.name}
              tasksCount={workspaceTasks.length}
              membersCount={users.length}
              hasPushEnabled={hasPushEnabled}
              isLoading={isDataLoading}
              onOpenCreateTask={() => {
                setCreateTaskStatus("TODO");
                setIsCreateTaskOpen(true);
              }}
              onOpenInviteMember={() => setIsSettingsOpen(true)}
              onEnablePush={async () => {
                try {
                  const ok = await subscribeToPushNotifications({
                    userId: currentUser?.id,
                    workspaceId: workspace?.id,
                  });
                  if (ok) setHasPushEnabled(true);
                } catch (e: any) {
                  toastAlert({
                    title: "Izin Notifikasi",
                    description:
                      e?.message || "Gagal mengaktifkan notifikasi Windows.",
                    variant: "destructive",
                  });
                }
              }}
            />
          )}

          {/* Main View Switcher */}
          {currentNav === "chat" ? (
            <TeamChatView
              currentUser={currentUser}
              users={users}
              projects={workspaceProjects}
              activeProjectId={activeProjectId}
              workspaceId={workspace.id}
              mode="team-discussion"
              onSelectProject={(id) => setActiveProjectId(id)}
              isLoading={isDataLoading}
            />
          ) : currentNav === "ai-assistant" ? (
            <AIAssistantView
              tasks={workspaceTasks}
              projects={workspaceProjects}
              activeProject={activeProject}
              currentUser={currentUser}
              workspace={workspace}
              isLoadingData={isDataLoading}
              onSelectTask={(tId) => {
                const t = tasks.find((item) => item.id === tId);
                if (t) setSelectedTask(t);
              }}
            />
          ) : currentNav === "flowchart" ? (
            <FlowchartView
              workspace={workspace}
              currentUser={currentUser}
              initialDiagramId={
                typeof window !== "undefined"
                  ? new URLSearchParams(window.location.search).get("diagramId") || undefined
                  : undefined
              }
              isSidebarCollapsed={isFlowchartSidebarCollapsed}
              onToggleSidebar={() =>
                setIsFlowchartSidebarCollapsed((prev) => !prev)
              }
            />
          ) : currentNav === "whiteboard" ? (
            <WhiteboardView
              workspace={workspace}
              currentUser={currentUser}
            />
          ) : (
            <>
              {currentTab === "board" && (
                <KanbanBoard
                  tasks={displayedTasks}
                  users={users}
                  workspaceId={workspace.id}
                  onSelectTask={handleSelectTask}
                  onMoveTask={handleMoveTask}
                  onQuickAddTask={handleQuickAddTask}
                  onToggleComplete={handleToggleComplete}
                  isReadOnly={currentUser.role === "VIEWER"}
                  isLoading={isDataLoading}
                />
              )}

              {currentTab === "list" && (
                <ListView
                  tasks={displayedTasks}
                  users={users}
                  workspaceId={workspace.id}
                  onSelectTask={handleSelectTask}
                  onToggleComplete={handleToggleComplete}
                  onQuickAddTask={handleQuickAddTask}
                  isReadOnly={currentUser.role === "VIEWER"}
                  isLoading={isDataLoading}
                />
              )}

              {currentTab === "chat" && (
                <TeamChatView
                  currentUser={currentUser}
                  users={users}
                  projects={workspaceProjects}
                  activeProjectId={activeProjectId}
                  workspaceId={workspace.id}
                  mode="project-chat"
                  onSelectProject={(id) => setActiveProjectId(id)}
                  isLoading={isDataLoading}
                />
              )}

              {currentTab === "overview" && activeProject && (
                <ProjectOverview
                  project={activeProject}
                  tasks={displayedTasks}
                  users={users}
                  onEditProject={(proj) => setEditingProject(proj)}
                  canEdit={currentUser.role !== "VIEWER"}
                  isLoading={isDataLoading}
                />
              )}
            </>
          )}
        </main>

        {/* Mobile Touch-Friendly Bottom Navigation Bar (md:hidden) */}
        <MobileBottomNav
          currentNav={currentNav}
          onSelectNav={(nav) => {
            setCurrentNav(nav);
            if (nav !== "chat" && currentTab === "chat" && nav !== "project") {
              setCurrentTab("board");
            } else if (currentTab === "overview" && nav !== "project") {
              setCurrentTab("board");
            }
          }}
          onOpenCreateTask={() => {
            if (currentUser.role === "VIEWER") {
              toastAlert({
                title: "Akses Viewer (Read-only)",
                description: "Anda tidak memiliki izin untuk membuat issue baru.",
                variant: "warning",
              });
              return;
            }
            setCreateTaskStatus("TODO");
            setIsCreateTaskOpen(true);
          }}
          isReadOnly={currentUser.role === "VIEWER"}
          myTasksCount={myAssignedCount}
          teamChatUnreadCount={teamChatUnreadCount}
        />
      </div>

      {/* Consolidated Modal & Drawer Manager */}
      <AppModals
        selectedTask={selectedTask}
        onCloseTaskDetail={() => setSelectedTask(null)}
        users={users}
        currentUser={currentUser}
        workspace={workspace}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onAddComment={handleAddComment}
        onAddNotification={handleAddNotification}
        isCreateTaskOpen={isCreateTaskOpen}
        onCloseCreateTask={() => setIsCreateTaskOpen(false)}
        workspaceProjects={workspaceProjects}
        activeProjectId={activeProjectId}
        createTaskStatus={createTaskStatus}
        currentNav={currentNav}
        onCreateTask={handleCreateTask}
        isCreateProjectOpen={isCreateProjectOpen}
        onCloseCreateProject={() => setIsCreateProjectOpen(false)}
        onCreateProject={handleCreateProject}
        editingProject={editingProject}
        onCloseEditProject={() => setEditingProject(null)}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        settingsInitialTab={settingsInitialTab}
        onUpdateCurrentUser={handleUpdateCurrentUser}
        onUpdateUserRole={handleUpdateUserRole}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateWorkspace={handleUpdateWorkspace}
        onOpenCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
        onOpenOutlookSync={() => setIsOutlookSyncOpen(true)}
        onTriggerManualSync={() => runOutlookAutoSync(true)}
        onLogout={handleLogout}
        isCreateWorkspaceOpen={isCreateWorkspaceOpen}
        onCloseCreateWorkspace={() => setIsCreateWorkspaceOpen(false)}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinedWorkspace={handleJoinedWorkspace}
        isOutlookSyncOpen={isOutlookSyncOpen}
        onCloseOutlookSync={() => setIsOutlookSyncOpen(false)}
        onOutlookTasksCreated={handleOutlookTasksCreated}
        isMarketingModalOpen={isMarketingModalOpen}
        onCloseMarketingModal={() => setIsMarketingModalOpen(false)}
        onSelectNav={(tab) => setCurrentNav(tab)}
      />
    </div>
  );
}
