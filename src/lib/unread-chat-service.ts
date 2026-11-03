"use client";

import { useEffect, useState, useCallback } from "react";
import { Task, User, ChatMessage } from "@/types";
import { getSocket } from "./socket-client";

// Custom event name untuk sinkronisasi state unread di seluruh komponen
const UNREAD_UPDATE_EVENT = "kinetic_unread_chat_updated";

// In-memory cache untuk timestamp status baca yang disinkronkan dari database
let dbReadTimestampsCache: Record<string, number> = {};

function notifyUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UNREAD_UPDATE_EVENT));
  }
}

/**
 * Menerapkan data timestamp status baca dari respon bundle API secara langsung ke cache
 */
export function applyDbReadTimestamps(readTimestamps: Record<string, number>): void {
  if (readTimestamps && typeof readTimestamps === "object") {
    dbReadTimestampsCache = { ...dbReadTimestampsCache, ...readTimestamps };
    for (const [k, ts] of Object.entries(readTimestamps)) {
      try {
        localStorage.setItem(`kinetic_last_read_${k}`, String(ts));
      } catch {}
    }
    notifyUnreadChanged();
  }
}

/**
 * Mengambil timestamp terakhir kali chat dibaca (dari Cache DB atau localStorage)
 */
export function getLastReadTimestamp(key: string): number {
  if (dbReadTimestampsCache[key]) {
    return dbReadTimestampsCache[key];
  }
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(`kinetic_last_read_${key}`);
    const parsed = val ? parseInt(val, 10) : 0;
    if (parsed) dbReadTimestampsCache[key] = parsed;
    return parsed;
  } catch {
    return 0;
  }
}

/**
 * Menandai percakapan sebagai telah dibaca sekarang dan simpan ke Database via API
 */
export function markAsRead(key: string, userId?: string): void {
  const now = Date.now();
  dbReadTimestampsCache[key] = now;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`kinetic_last_read_${key}`, now.toString());
      notifyUnreadChanged();
    } catch {
      // ignore
    }
  }

  // Sinkronisasi ke Database via API
  const activeUserId =
    userId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("kinetic_active_user_id") || "usr-1"
      : "usr-1");

  if (activeUserId) {
    fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: activeUserId,
        key,
        timestamp: now,
      }),
    }).catch((err) => {
      console.warn("Failed to persist read status to DB:", err);
    });
  }
}

/**
 * Helper untuk menghitung komentar task yang belum dibaca
 */
export function getTaskUnreadCommentsCount(task: Task, currentUserId?: string): number {
  if (!task.comments || task.comments.length === 0) return 0;
  const lastRead = getLastReadTimestamp(`task_${task.id}`);
  
  return task.comments.filter((c) => {
    // Jangan hitung komentar yang ditulis oleh user sendiri
    if (currentUserId && c.userId === currentUserId) return false;
    const commentTime = new Date(c.createdAt).getTime();
    return commentTime > lastRead;
  }).length;
}

/**
 * Hook reaktif untuk memantau status unread chat di seluruh aplikasi
 */
export function useUnreadChatTracker(currentUser?: User, workspaceId?: string, activeProjectId?: string) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Re-render saat ada event read/unread lokal
  useEffect(() => {
    const handleUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener(UNREAD_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(UNREAD_UPDATE_EVENT, handleUpdate);
  }, []);

  // Socket listener untuk pesan baru
  useEffect(() => {
    const socket = getSocket();
    if (!socket || typeof socket.on !== "function") return;

    const onChatMessage = (payload: { workspaceId?: string; projectId?: string | null; message: any }) => {
      if (!payload?.message) return;
      // Jika pesan bukan dari user saat ini, trigger update unread
      if (payload.message.senderId !== currentUser?.id) {
        setRefreshTrigger((prev) => prev + 1);
        notifyUnreadChanged();
      }
    };

    const onComment = (payload: { taskId: string; comment: any }) => {
      if (!payload?.comment) return;
      if (payload.comment.userId !== currentUser?.id) {
        setRefreshTrigger((prev) => prev + 1);
        notifyUnreadChanged();
      }
    };

    socket.on("chat-message-received", onChatMessage);
    socket.on("comment-received", onComment);

    return () => {
      socket.off("chat-message-received", onChatMessage);
      socket.off("comment-received", onComment);
    };
  }, [currentUser?.id]);

  // Muat status timestamp baca dari Database Neon PostgreSQL saat mount / user login
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem("kinetic_active_user_id", currentUser.id);
    } catch {}

    fetch(`/api/chat/read-status?userId=${encodeURIComponent(currentUser.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.readTimestamps && typeof data.readTimestamps === "object") {
          dbReadTimestampsCache = { ...dbReadTimestampsCache, ...data.readTimestamps };
          for (const [k, ts] of Object.entries(data.readTimestamps)) {
            try {
              localStorage.setItem(`kinetic_last_read_${k}`, String(ts));
            } catch {}
          }
          setRefreshTrigger((prev) => prev + 1);
        }
      })
      .catch((err) => {
        console.warn("Failed to load chat read status from DB:", err);
      });
  }, [currentUser?.id]);

  /**
   * Menghitung unread pesan untuk Diskusi Tim
   */
  const getTeamChatUnread = useCallback(
    (messages: ChatMessage[] = []): number => {
      if (!workspaceId) return 0;
      const lastRead = getLastReadTimestamp(`team_discussion_${workspaceId}`);
      return messages.filter((m) => {
        if (m.type !== "TEAM_DISCUSSION") return false;
        if (currentUser?.id && m.senderId === currentUser.id) return false;
        return new Date(m.createdAt).getTime() > lastRead;
      }).length;
    },
    [workspaceId, currentUser?.id, refreshTrigger]
  );

  /**
   * Menghitung unread pesan untuk Project Chat tertentu
   */
  const getProjectChatUnread = useCallback(
    (projectId: string, messages: ChatMessage[] = []): number => {
      if (!projectId) return 0;
      const lastRead = getLastReadTimestamp(`project_chat_${projectId}`);
      return messages.filter((m) => {
        if (m.type !== "PROJECT_CHAT" || m.projectId !== projectId) return false;
        if (currentUser?.id && m.senderId === currentUser.id) return false;
        return new Date(m.createdAt).getTime() > lastRead;
      }).length;
    },
    [currentUser?.id, refreshTrigger]
  );

  /**
   * Tandai Diskusi Tim telah dibaca
   */
  const markTeamChatRead = useCallback(() => {
    if (workspaceId) {
      markAsRead(`team_discussion_${workspaceId}`, currentUser?.id);
    }
  }, [workspaceId, currentUser?.id]);

  /**
   * Tandai Obrolan Proyek telah dibaca
   */
  const markProjectChatRead = useCallback(
    (projectId?: string) => {
      const pid = projectId || activeProjectId;
      if (pid) {
        markAsRead(`project_chat_${pid}`, currentUser?.id);
      }
    },
    [activeProjectId, currentUser?.id]
  );

  /**
   * Tandai Komentar Task telah dibaca
   */
  const markTaskCommentsRead = useCallback((taskId: string) => {
    if (taskId) {
      markAsRead(`task_${taskId}`, currentUser?.id);
    }
  }, [currentUser?.id]);

  return {
    getTeamChatUnread,
    getProjectChatUnread,
    getTaskUnreadCommentsCount: (task: Task) => getTaskUnreadCommentsCount(task, currentUser?.id),
    markTeamChatRead,
    markProjectChatRead,
    markTaskCommentsRead,
    refreshTrigger,
  };
}
