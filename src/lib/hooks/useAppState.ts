"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Task,
  Project,
  User,
  Workspace,
  TaskStatus,
  TaskPriority,
  TaskVisibility,
  CommentAttachment,
  AppNotification,
  ChatMessage,
  UserRole,
} from "@/types";
import { useUnreadChatTracker, applyDbReadTimestamps } from "@/lib/unread-chat-service";
import { useUiStore } from "@/lib/stores/ui-store";
import { toastAlert } from "@/components/ui/alert-toast";
import { triggerWaNotification } from "@/components/ui/wa-notification";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  getOutlookSchedulerConfig,
  updateLastSyncTime,
  OUTLOOK_PROJECT_CREATED_EVENT,
} from "@/lib/outlook-scheduler";
import { getDefaultAvatar } from "@/lib/utils";
import {
  fetchInvitationByToken,
  acceptInvitation,
  createInvitation,
  WorkspaceInvitation,
  fetchServerJoinRequests,
  JoinRequest,
} from "@/lib/invitation-service";
import {
  registerPushServiceWorker,
  subscribeToPushNotifications,
  getNotificationPermissionState,
  checkAndRefreshPushSubscription,
  syncPushSubscriptionHeartbeat,
} from "@/lib/web-push";
import {
  initSocket,
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
} from "@/lib/socket-client";

export const EMPTY_WORKSPACE: Workspace = {
  id: "",
  name: "",
  slug: "",
  description: "",
  color: "#6366f1",
};

export type CurrentNavType =
  | "all-issues"
  | "project"
  | "my-tasks"
  | "chat"
  | "ai-assistant"
  | "flowchart"
  | "whiteboard";

export function useAppState() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [isNewUserOnboarding, setIsNewUserOnboarding] = useState<boolean>(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceMembersMap, setWorkspaceMembersMap] = useState<
    Record<string, User[]>
  >({});

  const saveWorkspaceMembers = (wsId: string, memberList: User[]) => {
    if (!wsId || wsId.trim() === "") return;
    setWorkspaceMembersMap((prev) => ({ ...prev, [wsId]: memberList }));
    if (typeof window !== "undefined") {
      try {
        fetch("/api/workspace-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: wsId, members: memberList }),
        }).catch((e) =>
          console.warn("Failed to sync workspace members to API:", e),
        );
      } catch {}
    }
  };

  const loadWorkspaceMembers = useCallback(async (wsId: string) => {
    if (!wsId || typeof window === "undefined") return null;
    try {
      const res = await fetch(
        `/api/workspace-members?workspaceId=${encodeURIComponent(wsId)}&t=${Date.now()}`,
      );
      if (res.ok) {
        const data = await res.json();
        const memberList: User[] = Array.isArray(data)
          ? data
          : data && Array.isArray(data.members)
            ? data.members
            : [];

        if (memberList.length > 0) {
          setWorkspaceMembersMap((prev) => ({ ...prev, [wsId]: memberList }));
          setUsers(memberList);

          // Sinkronkan role currentUser dari database jika user terdaftar di workspace ini
          setCurrentUser((curr) => {
            const foundInWs = memberList.find(
              (m: User) =>
                (curr.id && m.id === curr.id) ||
                (curr.email &&
                  m.email &&
                  m.email.toLowerCase() === curr.email.toLowerCase()),
            );
            if (foundInWs && foundInWs.role !== curr.role) {
              const updated = {
                ...curr,
                role: foundInWs.role,
                title: foundInWs.title || curr.title,
              };
              return updated;
            }
            return curr;
          });

          return memberList;
        }
      }
    } catch (e) {
      console.warn("Failed to load workspace members from API:", e);
    }
    return null;
  }, []);

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: "usr-guest",
    name: "User",
    email: "",
    avatar: getDefaultAvatar("User"),
    role: "ADMIN",
    title: "Team Member",
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Auth & Session State: strictly requires both valid user and session token
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("auth") === "true" || params.get("login") === "true";
    }
    return false;
  });

  // Views & Navigation via Global Zustand Store
  const {
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    isMarketingModalOpen,
    setIsMarketingModalOpen,
  } = useUiStore();

  const [currentNav, setCurrentNav] = useState<CurrentNavType>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const navParam = params.get("nav");
      if (
        navParam === "all-issues" ||
        navParam === "project" ||
        navParam === "my-tasks" ||
        navParam === "chat" ||
        navParam === "ai-assistant" ||
        navParam === "flowchart" ||
        navParam === "whiteboard"
      ) {
        return navParam;
      }
    }
    return "project";
  });
  const [isFlowchartSidebarCollapsed, setIsFlowchartSidebarCollapsed] =
    useState<boolean>(false);

  // Sync navigation from URL parameter
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const navParam = params.get("nav");
      if (
        navParam === "all-issues" ||
        navParam === "project" ||
        navParam === "my-tasks" ||
        navParam === "chat" ||
        navParam === "ai-assistant" ||
        navParam === "flowchart" ||
        navParam === "whiteboard"
      ) {
        setCurrentNav(navParam);
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  const [myTasksFilter, setMyTasksFilter] = useState<
    "assigned" | "created" | "all"
  >("assigned");
  const [currentTab, setCurrentTab] = useState<
    "board" | "list" | "chat" | "overview"
  >("board");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Modals & Drawers
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("TODO");
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    "profile" | "members" | "workspace" | "appearance" | "outlook"
  >("profile");
  const [isOutlookSyncOpen, setIsOutlookSyncOpen] = useState(false);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [isWorkspacesInitializing, setIsWorkspacesInitializing] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingInvitation, setPendingInvitation] =
    useState<WorkspaceInvitation | null>(null);
  const [hasPushEnabled, setHasPushEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return getNotificationPermissionState() === "granted";
    }
    return false;
  });

  // Refresh workspace members whenever settings modal is opened
  useEffect(() => {
    if (isSettingsOpen && workspace?.id) {
      loadWorkspaceMembers(workspace.id);
    }
  }, [isSettingsOpen, workspace?.id, loadWorkspaceMembers]);

  const { data: session, status: sessionStatus } = useSession();

  // Detect and validate inviteToken from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      if (Notification.permission !== "default") {
        Notification.requestPermission().then((permission) => {
          console.log("Status izin notifikasi:", permission);
        });
      }
    }
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("inviteToken") || urlParams.get("invite");
    if (!inviteToken) return;

    fetchInvitationByToken(inviteToken).then((inv) => {
      if (inv) {
        setPendingInvitation(inv);
      } else {
        toastAlert({
          title: "Undangan Tidak Valid",
          description:
            "Tautan undangan tidak ditemukan, sudah kadaluarsa, atau telah digunakan.",
          variant: "warning",
        });
        const url = new URL(window.location.href);
        url.searchParams.delete("inviteToken");
        url.searchParams.delete("invite");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : ""),
        );
      }
    });
  }, []);

  // Initialize background Service Worker for Windows Push Notifications & Auto-sync subscription
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const doSync = () => {
      if (getNotificationPermissionState() === "granted") {
        setHasPushEnabled(true);
        syncPushSubscriptionHeartbeat({
          userId: currentUser?.id,
          workspaceId: workspace?.id,
        }).catch(() => {});
      }
    };

    registerPushServiceWorker()
      .then(() => {
        if (getNotificationPermissionState() === "granted") {
          setHasPushEnabled(true);
          checkAndRefreshPushSubscription({
            userId: currentUser?.id,
            workspaceId: workspace?.id,
          }).catch(() => {});

          heartbeatInterval = setInterval(doSync, 5 * 60 * 1000);

          window.addEventListener("focus", doSync);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") doSync();
          });
        }
      })
      .catch(() => {});

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      window.removeEventListener("focus", doSync);
    };
  }, [currentUser?.id, workspace?.id]);

  // Process invitation when user is authenticated
  useEffect(() => {
    if (!pendingInvitation || !isAuthenticated || !currentUser) return;

    const targetWs = workspaces.find(
      (w) => w.id === pendingInvitation.workspaceId,
    );
    if (targetWs) {
      setWorkspace(targetWs);
    }

    setUsers((prev) => {
      const exists = prev.some(
        (u) =>
          u.id === currentUser.id ||
          u.email.toLowerCase() === currentUser.email.toLowerCase(),
      );
      if (exists) {
        return prev.map((u) =>
          u.id === currentUser.id ||
          u.email.toLowerCase() === currentUser.email.toLowerCase()
            ? { ...u, role: pendingInvitation.role }
            : u,
        );
      }
      return [
        ...prev,
        {
          ...currentUser,
          role: pendingInvitation.role,
          title: pendingInvitation.title || currentUser.title,
        },
      ];
    });

    const invitedUser: User = {
      ...currentUser,
      role: pendingInvitation.role,
      title: pendingInvitation.title || "Team Member",
    };
    setCurrentUser(invitedUser);

    acceptInvitation(pendingInvitation.token);

    fetch("/api/workspace-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: pendingInvitation.workspaceId,
        member: invitedUser,
      }),
    })
      .then(() => {
        loadWorkspaceMembers(pendingInvitation.workspaceId);
      })
      .catch(() => {});

    toastAlert({
      title: "Selamat Datang di Workspace!",
      description: `Anda berhasil bergabung ke workspace "${pendingInvitation.workspaceName}" sebagai ${pendingInvitation.role}.`,
      variant: "success",
    });

    setPendingInvitation(null);
    setIsNewUserOnboarding(false);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("inviteToken");
      url.searchParams.delete("invite");
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.search ? url.search : ""),
      );
    } catch {}
  }, [pendingInvitation, isAuthenticated, currentUser, workspaces, loadWorkspaceMembers]);

  // Centralized data synchronizer per-workspace
  const loadWorkspaceData = useCallback(
    async (wsId: string) => {
      if (!wsId || typeof window === "undefined") return;
      setIsDataLoading(true);
      try {
        const activeUserId = currentUser?.id || "";
        const bundleUrl = `/api/workspaces/bundle?workspaceId=${encodeURIComponent(wsId)}&userId=${encodeURIComponent(activeUserId)}&t=${Date.now()}`;
        const bundleRes = await fetch(bundleUrl);

        let memberList: User[] = [];
        let currentProjects: Project[] = [];
        let tasksRes: Task[] = [];

        if (bundleRes.ok) {
          const bundle = await bundleRes.json();
          memberList = Array.isArray(bundle.members) ? bundle.members : [];
          currentProjects = Array.isArray(bundle.projects) ? bundle.projects : [];
          tasksRes = Array.isArray(bundle.tasks) ? bundle.tasks : [];

          if (bundle.readTimestamps && typeof bundle.readTimestamps === "object") {
            applyDbReadTimestamps(bundle.readTimestamps);
          }
        } else {
          const [members, proj, tasks] = await Promise.all([
            loadWorkspaceMembers(wsId),
            fetch(
              `/api/projects?workspaceId=${encodeURIComponent(wsId)}&t=${Date.now()}`,
            ).then((r) => (r.ok ? r.json() : [])),
            fetch(
              `/api/tasks?workspaceId=${encodeURIComponent(wsId)}&t=${Date.now()}`,
            ).then((r) => (r.ok ? r.json() : [])),
          ]);
          memberList = members || [];
          currentProjects = Array.isArray(proj) ? proj : [];
          tasksRes = Array.isArray(tasks) ? tasks : [];
        }

        if (memberList.length > 0) {
          setWorkspaceMembersMap((prev) => ({ ...prev, [wsId]: memberList }));
          setUsers(memberList);

          setCurrentUser((curr) => {
            const foundInWs = memberList.find(
              (m: User) =>
                (curr.id && m.id === curr.id) ||
                (curr.email &&
                  m.email &&
                  m.email.toLowerCase() === curr.email.toLowerCase()),
            );
            if (foundInWs && foundInWs.role !== curr.role) {
              return {
                ...curr,
                role: foundInWs.role,
                title: foundInWs.title || curr.title,
              };
            }
            return curr;
          });
        }

        if (currentProjects.length === 0) {
          try {
            const createRes = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "General",
                description: "Default project untuk memulai pekerjaan tim",
                color: "#6366f1",
                icon: "FolderKanban",
                workspaceId: wsId,
              }),
            });
            if (createRes.ok) {
              const defaultProj = await createRes.json();
              currentProjects = [defaultProj];
            }
          } catch (projErr) {
            console.warn("Failed to create default project:", projErr);
          }
        }

        setProjects((prev) => {
          const otherWsProjects = prev.filter((p) => p.workspaceId !== wsId);
          return [...otherWsProjects, ...currentProjects];
        });

        if (currentProjects.length > 0) {
          setActiveProjectId((curr) => {
            if (curr && currentProjects.some((p) => p.id === curr)) return curr;
            return currentProjects[0].id;
          });
        }

        if (Array.isArray(tasksRes)) {
          setTasks((prev) => {
            const currentProjIdSet = new Set(currentProjects.map((p) => p.id));
            const otherTasks = prev.filter(
              (t) => !currentProjIdSet.has(t.projectId),
            );
            return [...otherTasks, ...tasksRes];
          });
        }
      } catch (err) {
        console.warn("Failed to load workspace data:", err);
      } finally {
        setIsDataLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser?.id, loadWorkspaceMembers],
  );

  const refreshData = useCallback(() => {
    if (workspace?.id) {
      setIsRefreshing(true);
      loadWorkspaceData(workspace.id);
    }
  }, [workspace?.id, loadWorkspaceData]);

  // Validasi sesi & sinkronisasi data profil pengguna yang login
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("kinetic_logged_out") === "true"
    ) {
      setIsAuthenticated(false);
      setIsAuthInitializing(false);
      setIsWorkspacesInitializing(false);
      return;
    }

    if (sessionStatus === "loading") {
      setIsAuthInitializing(true);
      return;
    }

    if (sessionStatus === "unauthenticated" || !session?.user) {
      setIsAuthenticated(false);
      setIsAuthInitializing(false);
      setIsWorkspacesInitializing(false);
      return;
    }

    const sessionError = (session as any)?.error;
    if (
      sessionError === "UserNotFoundInDb" ||
      sessionError === "RefreshAccessTokenError"
    ) {
      signOut({ redirect: false });
      setIsAuthenticated(false);
      setIsAuthInitializing(false);
      setIsWorkspacesInitializing(false);
      toastAlert({
        title: "Sesi Tidak Valid",
        description:
          sessionError === "UserNotFoundInDb"
            ? "Akun pengguna tidak ditemukan di database. Silakan login kembali."
            : "Token sesi telah kadaluarsa. Silakan login kembali.",
        variant: "warning",
      });
      return;
    }

    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const userEmail = sessionUser.email;

    if (userId || userEmail) {
      setIsAuthenticated(true);
      const name =
        sessionUser.name || (userEmail ? userEmail.split("@")[0] : "User");
      const avatar = sessionUser.image || getDefaultAvatar(name, userEmail);
      const role = sessionUser.role || "MEMBER";

      setCurrentUser((prev) => {
        if (
          prev.id === userId &&
          prev.email === userEmail &&
          prev.name === name &&
          prev.avatar === avatar
        ) {
          return prev;
        }
        return {
          id: userId || prev.id,
          name: name,
          email: userEmail || prev.email,
          avatar: avatar,
          role: prev.role || role,
          title: prev.title || "Team Member",
        };
      });
    } else {
      setIsAuthenticated(false);
      setIsWorkspacesInitializing(false);
    }

    setIsAuthInitializing(false);
  }, [session, sessionStatus]);

  // Inisialisasi daftar workspace pengguna setelah terautentikasi
  useEffect(() => {
    if (!isAuthenticated) {
      setIsWorkspacesInitializing(false);
      return;
    }

    const targetUserId = (session?.user as any)?.id || currentUser?.id;
    const targetEmail = session?.user?.email || currentUser?.email;
    if (!targetUserId && !targetEmail) {
      setIsWorkspacesInitializing(false);
      return;
    }

    setIsWorkspacesInitializing(true);

    try {
      const params = new URLSearchParams();
      params.set("t", String(Date.now()));
      if (targetUserId) params.set("userId", targetUserId);
      if (targetEmail) params.set("email", targetEmail);

      fetch(`/api/workspaces?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((serverWsList) => {
          if (Array.isArray(serverWsList) && serverWsList.length > 0) {
            setWorkspaces(serverWsList);
            const stillExists = serverWsList.find(
              (w: Workspace) => w.id === workspace?.id,
            );
            const activeWs = stillExists || serverWsList[0];
            setWorkspace(activeWs);
            loadWorkspaceData(activeWs.id);
            setIsNewUserOnboarding(false);
          } else {
            setWorkspaces([]);
            setWorkspace(EMPTY_WORKSPACE);
            setIsNewUserOnboarding(true);
          }
        })
        .catch(() => {
          setWorkspaces([]);
          setWorkspace(EMPTY_WORKSPACE);
          setIsNewUserOnboarding(true);
        })
        .finally(() => {
          setIsAuthInitializing(false);
          setIsWorkspacesInitializing(false);
        });
    } catch (err) {
      console.warn("Failed to initialize workspaces:", err);
      setIsAuthInitializing(false);
      setIsWorkspacesInitializing(false);
    }
  }, [
    isAuthenticated,
    (session?.user as any)?.id,
    session?.user?.email,
    currentUser?.id,
    currentUser?.email,
    workspace?.id,
    loadWorkspaceData,
  ]);

  const handleLogin = (user: User) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kinetic_logged_out");
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsWorkspacesInitializing(true);

    const params = new URLSearchParams();
    params.set("t", String(Date.now()));
    if (user.id) params.set("userId", user.id);
    if (user.email) params.set("email", user.email);

    fetch(`/api/workspaces?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((serverWsList) => {
        if (Array.isArray(serverWsList) && serverWsList.length > 0) {
          setWorkspaces(serverWsList);
          const activeWs = serverWsList[0];
          setWorkspace(activeWs);
          loadWorkspaceData(activeWs.id);
          setIsNewUserOnboarding(false);
        } else {
          setWorkspaces([]);
          setWorkspace(EMPTY_WORKSPACE);
          setIsNewUserOnboarding(true);
        }
      })
      .catch(() => {
        setWorkspaces([]);
        setWorkspace(EMPTY_WORKSPACE);
        setIsNewUserOnboarding(true);
      })
      .finally(() => {
        setIsWorkspacesInitializing(false);
      });
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kinetic_logged_out", "true");
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim();
          if (cookieName.includes("next-auth") || cookieName.includes("session")) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
      await signOut({ redirect: false });
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setIsAuthenticated(false);
      setShowAuthScreen(false);
      setIsNewUserOnboarding(false);
      setIsWorkspacesInitializing(false);
    }
  };

  const handleSwitchUser = async (user: User) => {
    setCurrentUser(user);
    if (user.email) {
      try {
        await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            role: user.role,
          }),
        }).catch(() => null);
        await signIn("credentials", {
          email: user.email,
          name: user.name,
          redirect: false,
        });
      } catch (err) {
        console.warn("Failed to sync session on user switch:", err);
      }
    }
  };

  const recentChatNotifIdsRef = useRef<Set<string>>(new Set());

  // Socket.IO Workspace Listener for Mentions & Realtime Comments
  useEffect(() => {
    if (!workspace?.id || !isAuthenticated) return;

    let isMounted = true;
    let activeSocket: any = null;

    const handleGlobalCommentReceived = (payload: {
      taskId: string;
      workspaceId?: string;
      comment: any;
      taskTitle?: string;
    }) => {
      if (payload?.taskId && payload?.comment) {
        if (
          payload.workspaceId &&
          workspace?.id &&
          payload.workspaceId !== workspace.id
        ) {
          return;
        }

        const isSelf =
          payload.comment.userId === currentUser?.id ||
          (Boolean(currentUser?.email) &&
            payload.comment.user?.email === currentUser?.email) ||
          (Boolean(currentUser?.name) &&
            payload.comment.user?.name === currentUser?.name);
        if (isSelf) return;

        const isMatchingComment = (c: any, target: any) => {
          if (c.id === target.id) return true;
          if (
            c.content === target.content &&
            (c.userId === target.userId ||
              (c.user?.email &&
                target.user?.email &&
                c.user.email === target.user.email)) &&
            Math.abs(
              new Date(c.createdAt).getTime() -
              new Date(target.createdAt).getTime(),
            ) < 10000
          ) {
            return true;
          }
          return false;
        };

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === payload.taskId) {
              if (t.comments.some((c) => isMatchingComment(c, payload.comment)))
                return t;
              return { ...t, comments: [...t.comments, payload.comment] };
            }
            return t;
          }),
        );
        setSelectedTask((curr) => {
          if (curr && curr.id === payload.taskId) {
            if (
              curr.comments.some((c) => isMatchingComment(c, payload.comment))
            )
              return curr;
            return { ...curr, comments: [...curr.comments, payload.comment] };
          }
          return curr;
        });

        const senderName = payload.comment.user?.name || "Anggota Tim";
        const targetTask = tasks.find((t) => t.id === payload.taskId);
        const taskTitle = payload.taskTitle || targetTask?.title || "Task";

        triggerWaNotification({
          type: "COMMENT_ADDED",
          title: `Komentar di "${taskTitle}"`,
          message: `${senderName}: ${payload.comment.content}`,
          senderName,
          senderAvatar: payload.comment.user?.avatar,
          meta: { taskId: payload.taskId },
        });
      }
    };

    const handleUserMentioned = (payload: {
      workspaceId: string;
      targetUserId: string;
      senderName: string;
      source: "comment" | "chat";
      title: string;
      preview: string;
      taskId?: string;
    }) => {
      if (payload?.targetUserId === currentUser?.id) {
        toastAlert({
          title: `@Anda disebut oleh ${payload.senderName}`,
          description: `${payload.title}: "${payload.preview}"`,
          variant: "default",
        });

        triggerWaNotification({
          type: "COMMENT_ADDED",
          title: `@${currentUser.name} disebut oleh ${payload.senderName}`,
          message: payload.preview,
          senderName: payload.senderName,
        });
      }
    };

    const handleGlobalChatMessageReceived = (payload: {
      workspaceId?: string;
      projectId?: string | null;
      message: any;
    }) => {
      if (!payload?.message) return;

      if (
        payload.workspaceId &&
        workspace?.id &&
        payload.workspaceId !== workspace.id
      ) {
        return;
      }

      const isSelf =
        payload.message.senderId === currentUser?.id ||
        (Boolean(currentUser?.email) &&
          payload.message.sender?.email?.toLowerCase() ===
          currentUser?.email?.toLowerCase()) ||
        (Boolean(currentUser?.name) &&
          payload.message.sender?.name?.toLowerCase() ===
          currentUser?.name?.toLowerCase());
      if (isSelf) return;

      const msgId =
        payload.message.id ||
        `${payload.message.senderId || "usr"}-${payload.message.content}-${payload.message.createdAt || Date.now()}`;
      const contentKey = `${payload.message.senderId || "usr"}:${payload.message.content}`;

      if (
        recentChatNotifIdsRef.current.has(msgId) ||
        recentChatNotifIdsRef.current.has(contentKey)
      ) {
        return;
      }
      recentChatNotifIdsRef.current.add(msgId);
      recentChatNotifIdsRef.current.add(contentKey);
      setTimeout(() => {
        recentChatNotifIdsRef.current.delete(msgId);
        recentChatNotifIdsRef.current.delete(contentKey);
      }, 10000);

      const isMentioned =
        Boolean(currentUser?.name) &&
        typeof payload.message.content === "string" &&
        payload.message.content
          .toLowerCase()
          .includes(`@${currentUser.name.toLowerCase()}`);
      if (isMentioned) return;

      const senderName =
        payload.message.sender?.name ||
        payload.message.senderName ||
        "Anggota Tim";
      const contentPreview = payload.message.content || "";

      triggerWaNotification({
        type: "CHAT_MESSAGE",
        title: "Diskusi Tim",
        message: `${senderName}: ${contentPreview}`,
        senderName: senderName,
        senderAvatar: payload.message.sender?.avatar,
        meta: { projectId: payload.projectId || undefined },
      });
    };

    initSocket().then((socket) => {
      if (!isMounted) return;
      activeSocket = socket;
      joinWorkspaceRoom(workspace.id);

      socket.off("comment-received", handleGlobalCommentReceived);
      socket.off("user-mentioned-received", handleUserMentioned);
      socket.off("chat-message-received", handleGlobalChatMessageReceived);

      socket.on("comment-received", handleGlobalCommentReceived);
      socket.on("user-mentioned-received", handleUserMentioned);
      socket.on("chat-message-received", handleGlobalChatMessageReceived);
    });

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.off("comment-received", handleGlobalCommentReceived);
        activeSocket.off("user-mentioned-received", handleUserMentioned);
        activeSocket.off("chat-message-received", handleGlobalChatMessageReceived);
      }
      if (workspace?.id) {
        leaveWorkspaceRoom(workspace.id);
      }
    };
  }, [
    workspace?.id,
    isAuthenticated,
    currentUser?.id,
    currentUser?.name,
    currentUser?.email,
    tasks,
  ]);

  // Process Shared Task Deep-link with Workspace, Team, Project, and Privacy validation
  const processedSharedTaskRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) return;
    if (tasks.length === 0 || projects.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlTaskId = urlParams.get("taskId") || urlParams.get("task");
    const urlWorkspace =
      urlParams.get("workspace") || urlParams.get("workspaceId");
    const urlProject = urlParams.get("project") || urlParams.get("projectId");

    if (!urlTaskId) return;
    if (processedSharedTaskRef.current === urlTaskId) return;

    const cleanUrl = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("taskId");
        url.searchParams.delete("task");
        url.searchParams.delete("workspace");
        url.searchParams.delete("workspaceId");
        url.searchParams.delete("project");
        url.searchParams.delete("projectId");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : ""),
        );
      } catch (err) {
        console.warn("Could not clean URL:", err);
      }
    };

    processedSharedTaskRef.current = urlTaskId;

    if (
      urlWorkspace &&
      urlWorkspace !== workspace.id &&
      urlWorkspace !== workspace.slug
    ) {
      toastAlert({
        title: "Akses Ditolak: Workspace Berbeda",
        description: `Anda tidak dapat mengakses task ini karena berada di workspace lain yang tidak Anda miliki aksesnya. Workspace aktif Anda: "${workspace.name}".`,
        variant: "destructive",
      });
      cleanUrl();
      return;
    }

    const isMemberOfWorkspace = users.some(
      (u) => u.id === currentUser.id || u.email === currentUser.email,
    );
    if (!isMemberOfWorkspace) {
      toastAlert({
        title: "Akses Ditolak: Bukan Anggota Tim",
        description:
          "Akun Anda tidak terdaftar sebagai anggota tim di workspace ini.",
        variant: "destructive",
      });
      cleanUrl();
      return;
    }

    const matchingTask = tasks.find((t) => t.id === urlTaskId);
    if (!matchingTask) {
      toastAlert({
        title: "Task Tidak Ditemukan",
        description: `Task dengan ID "${urlTaskId}" tidak ditemukan di database atau mungkin sudah dihapus.`,
        variant: "destructive",
      });
      cleanUrl();
      return;
    }

    const targetProject =
      projects.find(
        (p) =>
          p.id === matchingTask.projectId && p.workspaceId === workspace.id,
      ) || projects.find((p) => p.id === matchingTask.projectId);

    if (!targetProject) {
      toastAlert({
        title: "Akses Ditolak: Project Tidak Ditemukan",
        description:
          "Project yang memuat task ini tidak tersedia di workspace aktif Anda.",
        variant: "destructive",
      });
      cleanUrl();
      return;
    }

    if (urlProject && urlProject !== matchingTask.projectId) {
      toastAlert({
        title: "Akses Ditolak: Project Mismatch",
        description:
          "Task ini bukan bagian dari project yang ditentukan pada tautan.",
        variant: "destructive",
      });
      cleanUrl();
      return;
    }

    if (matchingTask.visibility === "PRIVATE") {
      const isCreator =
        matchingTask.creatorId === currentUser.id ||
        matchingTask.creator?.email === currentUser.email;
      const isAssignee =
        matchingTask.assigneeId === currentUser.id ||
        matchingTask.assignee?.email === currentUser.email;
      const isCollaborator =
        matchingTask.collaboratorIds?.includes(currentUser.id) ||
        matchingTask.collaborators?.some(
          (c) => c.id === currentUser.id || c.email === currentUser.email,
        );
      const isAdmin = currentUser.role === "ADMIN";

      if (!isCreator && !isAssignee && !isCollaborator && !isAdmin) {
        toastAlert({
          title: "Akses Ditolak: Task Privat",
          description:
            "Task ini bersifat privat. Hanya pembuat task, penanggung jawab, kolaborator, atau Admin yang dapat membukanya.",
          variant: "destructive",
        });
        cleanUrl();
        return;
      }
    }

    setActiveProjectId(matchingTask.projectId);
    setCurrentNav("project");
    setSelectedTask(matchingTask);

    toastAlert({
      title: "Task Berhasil Dibuka",
      description: `Membuka task "${matchingTask.title}" di project "${targetProject.name}".`,
    });

    cleanUrl();
  }, [isAuthenticated, tasks, projects, workspace, currentUser, users]);

  // Dynamically update document title & meta tags when viewing a task or project
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (selectedTask) {
      const taskKey = `TSK-${(selectedTask.id.replace(/\D/g, "") || selectedTask.id.slice(-3)).padStart(2, "0")}`;
      const taskTitle = `${taskKey}: ${selectedTask.title} • Kinetic`;
      document.title = taskTitle;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          "content",
          selectedTask.description
            ? `${selectedTask.description.slice(0, 150)}... [Status: ${selectedTask.status}]`
            : `Detail issue ${taskKey} di workspace Kinetic.`,
        );
      }

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", taskTitle);
      }
    } else {
      const activeProj = projects.find((p) => p.id === activeProjectId);
      const baseTitle = activeProj
        ? `${activeProj.name} — Kinetic Issue Tracking`
        : "Kinetic — High-Performance Issue Tracking & Project Management";
      document.title = baseTitle;

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", baseTitle);
      }
    }
  }, [selectedTask, activeProjectId, projects]);

  const workspaceProjects = useMemo(
    () => projects.filter((p: Project) => p.workspaceId === workspace.id),
    [projects, workspace.id],
  );
  const activeProject =
    workspaceProjects.find((p: Project) => p.id === activeProjectId) ||
    workspaceProjects[0] ||
    projects[0];

  const workspaceProjectIds = useMemo(
    () => new Set(workspaceProjects.map((p: Project) => p.id)),
    [workspaceProjects],
  );

  const workspaceTasks = useMemo(
    () => tasks.filter((t: Task) => workspaceProjectIds.has(t.projectId)),
    [tasks, workspaceProjectIds],
  );

  const myAssignedCount = workspaceTasks.filter(
    (t: Task) =>
      t.assigneeId === currentUser.id ||
      t.assignee?.email === currentUser.email,
  ).length;
  const myCreatedCount = workspaceTasks.filter(
    (t: Task) =>
      t.creatorId === currentUser.id || t.creator?.email === currentUser.email,
  ).length;
  const myAllCount = workspaceTasks.filter(
    (t: Task) =>
      t.assigneeId === currentUser.id ||
      t.assignee?.email === currentUser.email ||
      t.creatorId === currentUser.id ||
      t.creator?.email === currentUser.email,
  ).length;

  const [globalChatMessages, setGlobalChatMessages] = useState<ChatMessage[]>([]);

  const fetchWorkspaceChats = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const res = await fetch(`/api/chat?workspaceId=${encodeURIComponent(workspace.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGlobalChatMessages(data);
        }
      }
    } catch (e) {
      console.warn("Failed to load workspace chat messages:", e);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchWorkspaceChats();
    const interval = setInterval(fetchWorkspaceChats, 5000);
    return () => clearInterval(interval);
  }, [fetchWorkspaceChats]);

  const {
    getTeamChatUnread,
    getProjectChatUnread,
    markTeamChatRead,
    markProjectChatRead,
  } = useUnreadChatTracker(currentUser, workspace?.id, activeProjectId);

  const teamChatUnreadCount = getTeamChatUnread(globalChatMessages);

  const projectChatUnreadMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const proj of workspaceProjects) {
      map[proj.id] = getProjectChatUnread(proj.id, globalChatMessages);
    }
    return map;
  }, [workspaceProjects, globalChatMessages, getProjectChatUnread]);

  const activeProjectChatUnreadCount = activeProjectId
    ? projectChatUnreadMap[activeProjectId] || 0
    : 0;

  useEffect(() => {
    if (currentNav === "chat") {
      markTeamChatRead();
    } else if (currentNav === "project" && currentTab === "chat") {
      markProjectChatRead(activeProjectId);
    }
  }, [currentNav, currentTab, activeProjectId, markTeamChatRead, markProjectChatRead]);

  // Filter tasks based on current nav & filters
  const displayedTasks = tasks.filter((task) => {
    if (!workspaceProjectIds.has(task.projectId)) {
      return false;
    }
    if (task.visibility === "PRIVATE") {
      const isCreator =
        task.creatorId === currentUser.id ||
        task.creator?.email === currentUser.email;
      const isAssignee =
        task.assigneeId === currentUser.id ||
        task.assignee?.email === currentUser.email;
      const isCollaborator =
        task.collaboratorIds?.includes(currentUser.id) ||
        task.collaborators?.some(
          (c) => c.id === currentUser.id || c.email === currentUser.email,
        );
      const isAdmin = currentUser.role === "ADMIN";
      if (!isCreator && !isAssignee && !isCollaborator && !isAdmin) {
        return false;
      }
    }

    if (currentNav === "my-tasks") {
      const isAssigned =
        task.assigneeId === currentUser.id ||
        task.assignee?.email === currentUser.email;
      const isCreated =
        task.creatorId === currentUser.id ||
        task.creator?.email === currentUser.email;
      const isCollaborator =
        task.collaboratorIds?.includes(currentUser.id) ||
        task.collaborators?.some(
          (c) => c.id === currentUser.id || c.email === currentUser.email,
        );

      if (!isAssigned && !isCreated && !isCollaborator) return false;
    } else if (currentNav === "all-issues") {
      // Show all workspace tasks across all projects
    } else if (currentNav === "project") {
      if (task.projectId !== activeProjectId) return false;
    }

    if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleAddNotification = (
    notifData: Omit<AppNotification, "id" | "createdAt" | "read">,
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notifData,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toastAlert({
      title: "Notifikasi Dibaca",
      description: "Semua notifikasi telah ditandai sudah dibaca.",
    });
  };

  useEffect(() => {
    const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";
    if (!isAuthenticated || !isAdmin || !workspace?.id) return;

    const checkJoinRequests = async () => {
      try {
        const pendingRequests = await fetchServerJoinRequests(workspace.id);
        const uniquePendingMap = new Map<string, JoinRequest>();
        for (const req of pendingRequests) {
          const key = (req.userEmail || req.userId).trim().toLowerCase();
          if (!uniquePendingMap.has(key)) {
            uniquePendingMap.set(key, req);
          }
        }
        const uniquePending = Array.from(uniquePendingMap.values());
        const activeEmails = new Set(
          uniquePending.map((r) =>
            (r.userEmail || r.userId).trim().toLowerCase(),
          ),
        );

        setNotifications((prev) => {
          const existingEmails = new Set<string>();
          const filteredPrev = prev.filter((n) => {
            if (n.type !== "JOIN_REQUEST") return true;
            const emailMatch = n.message.match(/\((.*?)\)/)?.[1];
            const email = (emailMatch || n.id).trim().toLowerCase();
            if (!activeEmails.has(email)) return false;
            if (existingEmails.has(email)) return false;
            existingEmails.add(email);
            return true;
          });

          const newNotifs: AppNotification[] = [];
          for (const req of uniquePending) {
            const email = (req.userEmail || req.userId).trim().toLowerCase();
            if (!existingEmails.has(email)) {
              existingEmails.add(email);
              newNotifs.push({
                id: `notif-join-${req.id}`,
                title: "Permintaan Bergabung Baru",
                message: `${req.userName} (${req.userEmail}) meminta approval untuk bergabung ke workspace ini.`,
                type: "JOIN_REQUEST",
                createdAt: req.requestedAt,
                read: false,
                workspaceId: req.workspaceId,
              });
            }
          }

          if (newNotifs.length > 0) {
            const latest = newNotifs[0];
            toastAlert({
              title: "Permintaan Masuk Workspace",
              description: latest.message,
              variant: "info",
            });
            return [...newNotifs, ...filteredPrev];
          }

          if (filteredPrev.length !== prev.length) {
            return filteredPrev;
          }

          return prev;
        });
      } catch (err) {
        console.warn("Failed to check join requests:", err);
      }
    };

    checkJoinRequests();
    const interval = setInterval(checkJoinRequests, 3000);
    window.addEventListener("storage", checkJoinRequests);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkJoinRequests);
    };
  }, [isAuthenticated, currentUser.role, workspace?.id]);

  const handleNotificationClick = (notification: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );

    if (notification.type === "JOIN_REQUEST") {
      setSettingsInitialTab("members");
      setIsSettingsOpen(true);
      return;
    }

    if (notification.taskId) {
      const targetTask = tasks.find((t) => t.id === notification.taskId);
      if (targetTask) {
        setSelectedTask(targetTask);
        if (targetTask.projectId) {
          setActiveProjectId(targetTask.projectId);
        }
      }
    }
  };

  const handleCreateTask = async (data: {
    title: string;
    description: string;
    projectId: string;
    status: TaskStatus;
    priority: TaskPriority;
    visibility?: TaskVisibility;
    dueDate: string | null;
    assigneeId: string | null;
    tags?: string[];
  }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          visibility: data.visibility || "PUBLIC",
          creatorId: currentUser.id,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === data.projectId
              ? { ...p, taskCount: (p.taskCount || 0) + 1 }
              : p,
          ),
        );

        triggerWaNotification({
          type: "TASK_CREATED",
          title: "Task Baru Dibuat",
          message: `${currentUser.name} membuat task "${created.title}"`,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          meta: { taskId: created.id },
        });

        if (data.tags && data.tags.length > 0) {
          const taskKey = `TSK-${(created.id.replace(/\D/g, "") || created.id.slice(-3)).padStart(2, "0")}`;
          handleAddNotification({
            title: "Task Baru Dibuat",
            message: `Task ${taskKey} dibuat dengan tag: ${data.tags.join(", ")}`,
            type: "TAG_ADDED",
            taskId: created.id,
            taskTitle: created.title,
            actor: currentUser,
          });
        }
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleOutlookTasksCreated = (newTasks: Task[]) => {
    setTasks((prev) => [...newTasks, ...prev]);
    toastAlert({
      title: "Sinkronisasi Outlook Berhasil",
      description: `${newTasks.length} tiket backlog baru dari email berhasil diekstrak oleh AI.`,
      variant: "success",
    });
  };

  const runOutlookAutoSync = useCallback(
    async (isManualTrigger = false) => {
      const config = getOutlookSchedulerConfig();
      if (!config.enabled && !isManualTrigger) return;

      try {
        const memberEmails = users.map((u) => u.email).filter(Boolean);
        const res = await fetch("/api/integrations/outlook/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            projectId: isManualTrigger ? activeProjectId : undefined,
            isScheduled: !isManualTrigger,
            memberEmails,
          }),
        });

        if (!res.ok) {
          throw new Error("Gagal sinkronisasi email Outlook.");
        }

        const data = await res.json();
        const rawTasks = data.createdTasks || [];
        const createdTasks: Task[] = rawTasks.map(
          (item: any) => item.task || item,
        );
        updateLastSyncTime(createdTasks.length);

        if (data.targetProjectId) {
          setProjects((prev) => {
            const exists = prev.some((p) => p.id === data.targetProjectId);
            if (!exists) {
              fetch(`/api/projects?workspaceId=${encodeURIComponent(workspace.id)}&t=${Date.now()}`)
                .then((r) => (r.ok ? r.json() : []))
                .then((fetchedProjects) => {
                  if (Array.isArray(fetchedProjects)) {
                    setProjects((curr) => {
                      const other = curr.filter((p) => p.workspaceId !== workspace.id);
                      return [...other, ...fetchedProjects];
                    });
                  }
                })
                .catch(() => {});
            }
            return prev;
          });
        }

        if (createdTasks.length > 0) {
          setTasks((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const fresh = createdTasks.filter((t) => !existingIds.has(t.id));
            return [...fresh, ...prev];
          });

          toastAlert({
            title: "Outlook Sync Berhasil",
            description: `${createdTasks.length} task backlog baru dari email Outlook berhasil diekstrak ke project "Issues from Outlook".`,
            variant: "success",
          });
        } else if (isManualTrigger) {
          toastAlert({
            title: "Outlook Sync Selesai",
            description:
              "Tidak ditemukan email baru yang perlu dijadikan tiket task.",
            variant: "info",
          });
        }
      } catch (err) {
        console.warn("Auto-sync Outlook background error:", err);
        if (isManualTrigger) {
          toastAlert({
            title: "Gagal Sync Outlook",
            description: "Tidak dapat menghubungi API sinkronisasi email.",
            variant: "destructive",
          });
        }
      }
    },
    [workspace.id, activeProjectId, users],
  );

  // Background Worker Scheduler (Interval / Jam Tertentu)
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(() => {
      const config = getOutlookSchedulerConfig();
      if (!config.enabled) return;

      const now = new Date();
      const nowMs = now.getTime();

      if (config.mode === "interval") {
        const intervalMs = (config.intervalMinutes || 30) * 60 * 1000;
        const lastSync = config.lastSyncTime
          ? new Date(config.lastSyncTime).getTime()
          : 0;
        if (nowMs - lastSync >= intervalMs) {
          runOutlookAutoSync(false);
        }
      } else if (config.mode === "time" && config.scheduledTime) {
        const [targetHour, targetMinute] = config.scheduledTime
          .split(":")
          .map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        if (currentHour === targetHour && currentMinute === targetMinute) {
          const lastSync = config.lastSyncTime
            ? new Date(config.lastSyncTime).getTime()
            : 0;
          if (nowMs - lastSync > 70000) {
            runOutlookAutoSync(false);
          }
        }
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, runOutlookAutoSync]);

  useEffect(() => {
    const handleOutlookProjectCreated = (e: Event) => {
      const customEvent = e as CustomEvent<Project>;
      if (customEvent.detail) {
        const newProj = customEvent.detail;
        setProjects((prev) => {
          if (prev.some((p) => p.id === newProj.id)) return prev;
          return [...prev, newProj];
        });
      }
    };
    window.addEventListener(OUTLOOK_PROJECT_CREATED_EVENT, handleOutlookProjectCreated);
    return () =>
      window.removeEventListener(OUTLOOK_PROJECT_CREATED_EVENT, handleOutlookProjectCreated);
  }, []);

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          currentUserId: currentUser.id,
        }),
      });
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (currentUser.role !== "ADMIN") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat menghapus issue.",
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleToggleComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk mengubah status issue.",
        variant: "warning",
      });
      return;
    }
    const nextCompleted = !task.completed;
    triggerWaNotification({
      type: "TASK_COMPLETED",
      title: nextCompleted ? "Task Selesai" : "Task Dibuka Kembali",
      message: `${currentUser.name} ${nextCompleted ? "menyelesaikan" : "membuka kembali"} "${task.title}"`,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      meta: { taskId: task.id },
    });
    handleUpdateTask(task.id, {
      completed: nextCompleted,
      status: nextCompleted ? "DONE" : "IN_PROGRESS",
    });
  };

  const handleMoveTask = async (
    taskId: string,
    newStatus: TaskStatus,
    newIndex: number,
  ) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk memindahkan issue.",
        variant: "warning",
      });
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus,
            order: newIndex,
            completed: newStatus === "DONE",
          }
        : t,
    );
    setTasks(updatedTasks);

    triggerWaNotification({
      type: "TASK_MOVED",
      title: "Perubahan Kolom Board",
      message: `${currentUser.name} memindahkan "${task.title}" ke kolom ${newStatus}`,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      meta: { taskId, status: newStatus },
    });

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          order: newIndex,
          completed: newStatus === "DONE",
          currentUserId: currentUser.id,
        }),
      });
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  };

  const handleQuickAddTask = (status: TaskStatus) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk membuat issue baru.",
        variant: "warning",
      });
      return;
    }
    setCreateTaskStatus(status);
    setIsCreateTaskOpen(true);
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk menambah sub-issue.",
        variant: "warning",
      });
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const sub = await res.json();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t,
          ),
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev) =>
            prev ? { ...prev, subtasks: [...prev.subtasks, sub] } : null,
          );
        }
      }
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description:
          "Anda tidak memiliki izin untuk mengubah status sub-issue.",
        variant: "warning",
      });
      return;
    }
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: t.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed } : s,
        ),
      })),
    );
    if (selectedTask) {
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed } : s,
              ),
            }
          : null,
      );
    }

    try {
      await fetch(`/api/tasks/${selectedTask?.id || "sub"}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskId, completed }),
      });
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleAddComment = async (
    taskId: string,
    content: string,
    attachments?: CommentAttachment[],
    commentId?: string,
  ) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Viewer (Read-only)",
        description: "Anda tidak memiliki izin untuk mengirim komentar.",
        variant: "warning",
      });
      return;
    }
    try {
      let clientEndpoint: string | undefined = undefined;
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub?.endpoint) clientEndpoint = sub.endpoint;
        } catch {}
      }

      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: commentId,
          content,
          userId: currentUser.id,
          workspaceId: workspace.id,
          attachments: attachments || [],
          clientEndpoint,
        }),
      });
      if (res.ok) {
        const comment = await res.json();
        const isCommentMatch = (c: any) =>
          c.id === comment.id ||
          (c.content === comment.content &&
            c.userId === comment.userId &&
            Math.abs(
              new Date(c.createdAt).getTime() -
              new Date(comment.createdAt).getTime(),
            ) < 10000);

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              if (t.comments.some(isCommentMatch)) return t;
              return { ...t, comments: [...t.comments, comment] };
            }
            return t;
          }),
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev) => {
            if (!prev) return null;
            if (prev.comments.some(isCommentMatch)) return prev;
            return { ...prev, comments: [...prev.comments, comment] };
          });
        }
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleCreateProject = async (data: {
    name: string;
    description: string;
    color: string;
    icon: string;
  }) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Akun dengan role Viewer tidak dapat membuat project baru.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId: workspace.id }),
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects((prev) => [...prev, newProj]);
        setActiveProjectId(newProj.id);
        setCurrentNav("project");
        toastAlert({
          title: "Project Berhasil Dibuat",
          description: `Project "${newProj.name}" siap digunakan.`,
        });
      } else {
        const fallbackProj: Project = {
          id: `proj-${Date.now()}`,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          workspaceId: workspace.id,
        };
        setProjects((prev) => [...prev, fallbackProj]);
        setActiveProjectId(fallbackProj.id);
        setCurrentNav("project");
        toastAlert({
          title: "Project Dibuat",
          description: `Project "${fallbackProj.name}" dibuat (mode lokal).`,
        });
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      const fallbackProj: Project = {
        id: `proj-${Date.now()}`,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        workspaceId: workspace.id,
      };
      setProjects((prev) => [...prev, fallbackProj]);
      setActiveProjectId(fallbackProj.id);
      setCurrentNav("project");
      toastAlert({
        title: "Project Dibuat",
        description: `Project "${fallbackProj.name}" dibuat secara lokal.`,
      });
    }
  };

  const handleOpenCreateProject = () => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Akun dengan role Viewer tidak dapat membuat project baru.",
        variant: "destructive",
      });
      return;
    }
    setIsCreateProjectOpen(true);
  };

  const handleUpdateProject = async (
    projectId: string,
    data: { name: string; description: string; color: string; icon: string },
  ) => {
    if (currentUser.role === "VIEWER") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Akun dengan role Viewer tidak dapat mengedit project.",
        variant: "destructive",
      });
      return;
    }
    try {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...data } : p)),
      );
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updatedProj = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...updatedProj } : p)),
        );
        toastAlert({
          title: "Project Diperbarui",
          description: `Perubahan pada project "${data.name}" berhasil disimpan.`,
        });
      } else {
        toastAlert({
          title: "Project Diperbarui",
          description: `Perubahan pada project "${data.name}" berhasil disimpan.`,
        });
      }
    } catch (err) {
      console.error("Failed to update project:", err);
      toastAlert({
        title: "Koneksi Bermasalah",
        description: "Perubahan disimpan secara lokal.",
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (currentUser.role !== "ADMIN") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat menghapus project.",
        variant: "destructive",
      });
      return;
    }
    const targetProject = projects.find((p) => p.id === projectId);
    const projectName = targetProject?.name || "Project";

    try {
      const remainingProjects = projects.filter((p) => p.id !== projectId);
      setProjects(remainingProjects);
      setTasks((prev) => prev.filter((t) => t.projectId !== projectId));

      if (activeProjectId === projectId) {
        if (remainingProjects.length > 0) {
          setActiveProjectId(remainingProjects[0].id);
        } else {
          setCurrentNav("all-issues");
        }
      }

      await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      toastAlert({
        title: "Project Dihapus",
        description: `Project "${projectName}" berhasil dihapus.`,
      });
    } catch (err) {
      console.error("Failed to delete project:", err);
      toastAlert({
        title: "Project Dihapus",
        description: `Project "${projectName}" telah dihapus secara lokal.`,
      });
    }
  };

  const handleUpdateCurrentUser = (updates: Partial<User>) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...updates } : u)),
    );
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    const isUserAdmin =
      currentUser.role === "ADMIN" ||
      workspace.ownerId === currentUser.id ||
      workspace.createdBy === currentUser.id ||
      users.some(
        (u) =>
          (u.id === currentUser.id ||
            (u.email &&
              u.email.toLowerCase() === currentUser.email.toLowerCase())) &&
          u.role === "ADMIN",
      );

    if (!isUserAdmin) {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat mengubah role anggota tim.",
        variant: "destructive",
      });
      return;
    }

    if (newRole !== "ADMIN") {
      const adminCount = users.filter((u) => u.role === "ADMIN").length;
      const targetUser = users.find((u) => u.id === userId);
      if (targetUser?.role === "ADMIN" && adminCount <= 1) {
        toastAlert({
          title: "Perubahan Role Ditolak",
          description:
            "Workspace harus memiliki minimal 1 anggota dengan role Admin.",
          variant: "warning",
        });
        return;
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
    if (userId === currentUser.id) {
      const updated = { ...currentUser, role: newRole };
      setCurrentUser(updated);
    }

    try {
      const res = await fetch("/api/workspace-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          targetUserId: userId,
          newRole,
          requesterId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastAlert({
          title: "Gagal Mengubah Role",
          description:
            data.error || "Gagal memperbarui role anggota di server.",
          variant: "destructive",
        });
        loadWorkspaceMembers(workspace.id);
      } else {
        toastAlert({
          title: "Role Diperbarui",
          description: `Role pengguna berhasil diubah menjadi ${newRole}.`,
          variant: "success",
        });
      }
    } catch (e) {
      console.warn("Failed to persist member role update:", e);
    }
  };

  const handleAddMember = async (member: {
    name: string;
    email: string;
    role: UserRole;
    title: string;
  }) => {
    if (currentUser.role !== "ADMIN") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat mengundang anggota baru.",
        variant: "destructive",
      });
      return;
    }
    const newMember: User = {
      id: `usr_${Date.now()}`,
      name: member.name,
      email: member.email,
      role: member.role,
      title: member.title,
      avatar: getDefaultAvatar(member.name, member.email),
    };
    try {
      const res = await fetch("/api/workspace-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, member: newMember }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members) {
          setUsers(data.members);
          setWorkspaceMembersMap((prevMap) => ({
            ...prevMap,
            [workspace.id]: data.members,
          }));
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to add member via API:", err);
    }
    setUsers((prev) => [...prev, newMember]);
  };

  const handleRemoveMember = (userId: string) => {
    if (currentUser.role !== "ADMIN") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat mengeluarkan anggota tim.",
        variant: "destructive",
      });
      return;
    }
    if (userId === currentUser.id) {
      toastAlert({
        title: "Tindakan Tidak Diizinkan",
        description:
          "Anda tidak dapat mengeluarkan akun Anda sendiri dari workspace.",
        variant: "warning",
      });
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    const targetEmail = targetUser?.email || "";

    setUsers((prev) => {
      const next = prev.filter(
        (u) => u.id !== userId && (!targetEmail || u.email !== targetEmail),
      );
      setWorkspaceMembersMap((prevMap) => ({
        ...prevMap,
        [workspace.id]: next,
      }));
      return next;
    });

    const params = new URLSearchParams();
    params.set("workspaceId", workspace.id);
    params.set("userId", userId);
    if (targetEmail) params.set("userEmail", targetEmail);

    fetch(`/api/workspace-members?${params.toString()}`, {
      method: "DELETE",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setUsers(data.members);
          setWorkspaceMembersMap((prevMap) => ({
            ...prevMap,
            [workspace.id]: data.members,
          }));
        }
      })
      .catch((err) => console.warn("Failed to delete workspace member:", err));
  };

  const handleUpdateWorkspace = (updates: Partial<Workspace>) => {
    if (currentUser.role !== "ADMIN") {
      toastAlert({
        title: "Akses Ditolak",
        description: "Hanya Admin yang dapat mengubah konfigurasi workspace.",
        variant: "destructive",
      });
      return;
    }
    const updated = { ...workspace, ...updates };
    setWorkspace(updated);

    setWorkspaces((prev) =>
      prev.map((w) => (w.id === workspace.id ? { ...w, ...updates } : w)),
    );

    try {
      fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workspace.id, updates }),
      }).catch((e) => console.warn("Failed to patch workspace:", e));
    } catch (e) {
      console.warn("Workspace patch error:", e);
    }

    toastAlert({
      title: "Workspace Diperbarui",
      description: `Pengaturan workspace "${updates.name || workspace.name}" berhasil disimpan.`,
    });
  };

  const handleCreateWorkspace = async (data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    projectName?: string;
    projectDescription?: string;
    taskTitle?: string;
    taskPriority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
    inviteEmails?: string[];
  }) => {
    const cleanName = data.name.trim();
    const cleanSlug =
      data.slug?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const wsColor = data.color || "#6366f1";
    const creatorUser: User = {
      ...currentUser,
      role: "ADMIN",
      title: "Workspace Creator",
    };
    const initialMembers = [creatorUser];

    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: cleanName,
      slug: cleanSlug,
      description: data.description || "",
      color: wsColor,
      createdBy: creatorUser.id,
    };

    const firstProjName = data.projectName?.trim() || "General";
    const defaultProj: Project = {
      id: `proj-${Date.now()}`,
      name: firstProjName,
      description:
        data.projectDescription?.trim() || `Project utama di ${newWs.name}`,
      color: wsColor,
      icon: "FolderKanban",
      workspaceId: newWs.id,
    };

    let firstTask: Task | null = null;
    if (data.taskTitle?.trim()) {
      firstTask = {
        id: `task-${Date.now()}`,
        title: data.taskTitle.trim(),
        description:
          "Task awal yang dibuat pada onboarding untuk memulai progres pekerjaan tim.",
        status: "TODO",
        priority: (data.taskPriority as TaskPriority) || "HIGH",
        projectId: defaultProj.id,
        assigneeId: creatorUser.id,
        creatorId: creatorUser.id,
        visibility: "PUBLIC",
        tags: ["Onboarding", "Getting-Started"],
        comments: [],
        subtasks: [],
        activities: [],
        dueDate: null,
        order: 0,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [firstTask!, ...prev]);
    }

    if (data.inviteEmails && data.inviteEmails.length > 0) {
      data.inviteEmails.forEach((email) => {
        try {
          createInvitation({
            workspaceId: newWs.id,
            workspaceName: newWs.name,
            email,
            role: "MEMBER",
            title: "Team Member",
            invitedBy: {
              id: creatorUser.id,
              name: creatorUser.name,
              email: creatorUser.email,
            },
          });
        } catch (e) {
          console.warn("Failed to create invitation for", email, e);
        }
      });
    }

    try {
      fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newWs.id,
          ...data,
          color: wsColor,
          createdBy: creatorUser.id,
          creator: {
            id: creatorUser.id,
            name: creatorUser.name,
            email: creatorUser.email,
            avatar: creatorUser.avatar,
          },
        }),
      })
        .then(() => {
          return fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: defaultProj.id,
              name: defaultProj.name,
              description: defaultProj.description,
              color: defaultProj.color,
              icon: defaultProj.icon,
              workspaceId: newWs.id,
            }),
          });
        })
        .then(() => {
          if (firstTask) {
            return fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: firstTask.id,
                title: firstTask.title,
                description: firstTask.description,
                status: firstTask.status,
                priority: firstTask.priority,
                projectId: defaultProj.id,
                creatorId: creatorUser.id,
                assigneeId: creatorUser.id,
              }),
            });
          }
        })
        .catch((e) =>
          console.warn(
            "Failed to persist workspace, project, or task to DB:",
            e,
          ),
        );
    } catch (e) {
      console.warn("Workspace API error:", e);
    }

    setWorkspaces((prev) => [...prev, newWs]);
    setProjects((prev) => [...prev, defaultProj]);
    setActiveProjectId(defaultProj.id);
    setWorkspace(newWs);
    setCurrentUser(creatorUser);
    setUsers(initialMembers);
    saveWorkspaceMembers(newWs.id, initialMembers);
    setIsNewUserOnboarding(false);
    setIsCreateWorkspaceOpen(false);

    try {
      localStorage.removeItem("kinetic_onboarding_checklist_dismissed");
    } catch {}

    toastAlert({
      title: "Workspace & Project Siap!",
      description: `Workspace "${newWs.name}" dan project "${defaultProj.name}" siap digunakan. Anda adalah Admin workspace ini.`,
      variant: "success",
    });
  };

  const handleJoinedWorkspace = (targetWs: Workspace) => {
    setWorkspaces((prev) =>
      prev.some((w) => w.id === targetWs.id) ? prev : [...prev, targetWs],
    );
    setWorkspace(targetWs);
    const memberUser: User = {
      ...currentUser,
      role: "MEMBER",
      title: "Team Member",
    };
    setCurrentUser(memberUser);

    try {
      localStorage.removeItem("kinetic_onboarding_checklist_dismissed");
    } catch {}

    fetch("/api/workspace-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: targetWs.id,
        member: memberUser,
      }),
    })
      .then(() => {
        loadWorkspaceMembers(targetWs.id);
      })
      .catch(() => {});

    setIsNewUserOnboarding(false);
    refreshData();

    toastAlert({
      title: "Permintaan Bergabung Disetujui!",
      description: `Selamat datang di workspace "${targetWs.name}".`,
      variant: "success",
    });
  };

  const handleSelectWorkspace = async (selected: Workspace) => {
    if (!selected || !selected.id) {
      setWorkspace(EMPTY_WORKSPACE);
      setIsNewUserOnboarding(true);
      return;
    }
    setWorkspace(selected);
    await loadWorkspaceData(selected.id);

    toastAlert({
      title: "Beralih Workspace",
      description: `Sekarang berada di workspace "${selected.name}".`,
    });
  };

  return {
    // States
    workspaces,
    setWorkspaces,
    workspace,
    setWorkspace,
    isNewUserOnboarding,
    setIsNewUserOnboarding,
    isCreateWorkspaceOpen,
    setIsCreateWorkspaceOpen,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    tasks,
    setTasks,
    users,
    setUsers,
    currentUser,
    setCurrentUser,
    notifications,
    setNotifications,
    isAuthenticated,
    setIsAuthenticated,
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
    runOutlookAutoSync,
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
  };
}
