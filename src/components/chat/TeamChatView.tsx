"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, User, Project } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Hash, MessageSquare, Users, AtSign, Radio } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { MentionSuggestions } from "@/components/common/MentionSuggestions";
import { extractMentions, renderTextWithMentions } from "@/lib/mention-utils";
import {
  initSocket,
  getSocket,
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
} from "@/lib/socket-client";
import { markAsRead, getLastReadTimestamp } from "@/lib/unread-chat-service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChatMessagesQuery,
  useSendChatMessageMutation,
} from "@/lib/hooks/useChatQueries";

interface TeamChatViewProps {
  currentUser: User;
  users: User[]; // Anggota workspace aktif untuk @mention
  projects: Project[];
  activeProjectId: string;
  workspaceId?: string;
  mode?: "team-discussion" | "project-chat";
  onSelectProject?: (projectId: string) => void;
  isLoading?: boolean;
}

function deduplicateMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [...existing];

  for (const item of incoming) {
    const existingIndex = result.findIndex((m) => {
      if (m.id === item.id) return true;
      // Match temporary or optimistic items with same content, same sender, within 10s
      if (
        m.content === item.content &&
        (m.senderId === item.senderId || (m.sender?.email && item.sender?.email && m.sender.email === item.sender.email)) &&
        Math.abs(new Date(m.createdAt).getTime() - new Date(item.createdAt).getTime()) < 10000
      ) {
        return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      result[existingIndex] = item;
    } else {
      result.push(item);
    }
  }

  return result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function TeamChatView({
  currentUser,
  users,
  projects,
  activeProjectId,
  workspaceId,
  mode = "project-chat",
  onSelectProject,
  isLoading = false,
}: TeamChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedUserDm, setSelectedUserDm] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Mention State (@Tag Anggota)
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionMatchStart, setMentionMatchStart] = useState(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const targetWsId = workspaceId || activeProject?.workspaceId || "";
  const currentProjId = activeProject?.id || activeProjectId;

  // Pembedaan tipe chat di level database: PROJECT_CHAT vs TEAM_DISCUSSION
  const chatType: "PROJECT_CHAT" | "TEAM_DISCUSSION" =
    mode === "team-discussion" ? "TEAM_DISCUSSION" : "PROJECT_CHAT";

  // TanStack Query: Ambil pesan obrolan & Mutasi pengiriman
  const { data: serverMessages, isLoading: isChatLoading, refetch: refetchChatMessages } = useChatMessagesQuery({
    type: chatType,
    projectId: chatType === "PROJECT_CHAT" ? currentProjId : undefined,
    workspaceId: targetWsId || undefined,
  });
  const sendMessageMutation = useSendChatMessageMutation();

  useEffect(() => {
    if (serverMessages && Array.isArray(serverMessages)) {
      setMessages(serverMessages);
    }
  }, [serverMessages]);

  useEffect(() => {
    setLoading(isChatLoading);
  }, [isChatLoading]);

  // Reset & tandai baca saat beralih project atau mode
  useEffect(() => {
    if (chatType === "TEAM_DISCUSSION" && targetWsId) {
      markAsRead(`team_discussion_${targetWsId}`, currentUser.id);
    } else if (chatType === "PROJECT_CHAT" && currentProjId) {
      markAsRead(`project_chat_${currentProjId}`, currentUser.id);
    }
  }, [currentProjId, chatType, targetWsId, currentUser.id]);

  useEffect(() => {
    if (messages.length > 0) {
      if (chatType === "TEAM_DISCUSSION" && targetWsId) {
        markAsRead(`team_discussion_${targetWsId}`);
      } else if (chatType === "PROJECT_CHAT" && currentProjId) {
        markAsRead(`project_chat_${currentProjId}`);
      }
    }
  }, [messages.length, chatType, targetWsId, currentProjId]);

  // 2. Real-time Socket.IO Connection & Listeners
  useEffect(() => {
    if (!targetWsId) return;

    let isMounted = true;
    initSocket().then((socket) => {
      if (!isMounted) return;
      setIsSocketConnected(socket.connected);

      const onConnect = () => setIsSocketConnected(true);
      const onDisconnect = () => setIsSocketConnected(false);

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);

      joinWorkspaceRoom(targetWsId);

      // Event pesan chat baru realtime
      const handleChatReceived = (payload: {
        workspaceId?: string;
        projectId?: string | null;
        type?: "PROJECT_CHAT" | "TEAM_DISCUSSION";
        message: ChatMessage;
      }) => {
        if (payload?.message) {
          // Abaikan jika pesan dikirim oleh diri sendiri (sudah ada di state secara optimistik)
          const isSelf =
            payload.message.senderId === currentUser.id ||
            (Boolean(currentUser.email) && payload.message.sender?.email === currentUser.email);
          if (isSelf) return;

          // ISOLASI DATABASE & FITUR KETAT:
          // Pastikan tipe fitur chat cocok persis (PROJECT_CHAT vs TEAM_DISCUSSION)
          const msgType = payload.message.type || payload.type || (payload.projectId ? "PROJECT_CHAT" : "TEAM_DISCUSSION");
          if (msgType !== chatType) return;

          // Jika ini Obrolan Project, tolak jika projectId tidak cocok
          if (chatType === "PROJECT_CHAT" && payload.projectId !== currentProjId) return;

          setMessages((prev) => deduplicateMessages(prev, [payload.message]));
        }
      };

      // Typing indicator
      const handleUserTyping = (payload: { user: { id: string; name: string } }) => {
        if (payload?.user?.id && payload.user.id !== currentUser.id) {
          setTypingUser(payload.user.name);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 3000);
        }
      };

      const handleUserStopTyping = (payload: { user: { id: string } }) => {
        if (payload?.user?.id !== currentUser.id) {
          setTypingUser(null);
        }
      };

      socket.on("chat-message-received", handleChatReceived);
      socket.on("user-typing", handleUserTyping);
      socket.on("user-stop-typing", handleUserStopTyping);

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("chat-message-received", handleChatReceived);
        socket.off("user-typing", handleUserTyping);
        socket.off("user-stop-typing", handleUserStopTyping);
        leaveWorkspaceRoom(targetWsId);
      };
    });

    return () => {
      isMounted = false;
      leaveWorkspaceRoom(targetWsId);
    };
  }, [targetWsId, currentProjId, currentUser.id, currentUser.email, chatType]);

  useEffect(() => {
    // Langsung posisikan tampilan pada pesan terakhir (last chat) secara instan tanpa animasi bergulir
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, typingUser]);

  // 3. Logika Input & Tag Mention (@)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    // Kirim event typing via socket
    if (targetWsId) {
      const socket = getSocket();
      socket.emit("typing", {
        roomId: `ws:${targetWsId}`,
        user: { id: currentUser.id, name: currentUser.name },
      });
    }

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = /(?:^|\s)@([a-zA-Z0-9_\s]{0,25})$/.exec(textBeforeCursor);

    if (mentionMatch && users.length > 0) {
      const q = mentionMatch[1];
      setMentionQuery(q);
      setMentionMatchStart(cursorPos - q.length - 1);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionOpen) return;

    const filteredUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(mentionQuery.toLowerCase()))
    );

    if (filteredUsers.length === 0) {
      if (e.key === "Escape") setMentionOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filteredUsers[mentionIndex];
      if (selected) {
        selectMentionUser(selected);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const selectMentionUser = (user: User) => {
    const cursorPos = inputRef.current?.selectionStart || inputMessage.length;
    const beforeMention = inputMessage.slice(0, Math.max(0, mentionMatchStart));
    const afterMention = inputMessage.slice(cursorPos);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    setInputMessage(newContent);
    setMentionOpen(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const nextPos = beforeMention.length + user.name.length + 2;
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  // 4. Kirim Pesan Diskusi
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const content = inputMessage.trim();
    setInputMessage("");
    setMentionOpen(false);

    // Stop typing event
    if (targetWsId) {
      const socket = getSocket();
      socket.emit("stop-typing", {
        roomId: `ws:${targetWsId}`,
        user: { id: currentUser.id, name: currentUser.name },
      });
    }

    // Generate persistent message ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      id: messageId,
      content,
      workspaceId: targetWsId,
      projectId: chatType === "PROJECT_CHAT" ? currentProjId : null,
      type: chatType,
      senderId: currentUser.id,
      createdAt: new Date().toISOString(),
      sender: currentUser,
    };

    // Tambah pesan secara optimis ke state lokal
    setMessages((prev) => deduplicateMessages(prev, [newMsg]));

    // Emit real-time message via socket HANYA SEKALI ke peers
    try {
      const socket = getSocket();
      socket.emit("new-chat-message", {
        workspaceId: targetWsId,
        projectId: chatType === "PROJECT_CHAT" ? currentProjId : null,
        type: chatType,
        message: newMsg,
      });
    } catch (e) {
      console.warn("Socket chat emit failed:", e);
    }

    // Deteksi tag mention ke anggota workspace
    const mentionedMembers = extractMentions(content, users);

    try {
      setLoading(true);

      let clientEndpoint: string | undefined = undefined;
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub?.endpoint) clientEndpoint = sub.endpoint;
        } catch {}
      }

      // Kirim via TanStack Query mutation
      await sendMessageMutation.mutateAsync({
        id: messageId,
        content,
        senderId: currentUser.id,
        projectId: chatType === "PROJECT_CHAT" ? currentProjId : null,
        type: chatType,
        workspaceId: targetWsId || undefined,
        clientEndpoint,
      });

      // Broadcast user mention events
      if (mentionedMembers.length > 0 && targetWsId) {
        const socket = getSocket();
        mentionedMembers.forEach((member: User) => {
          if (member.id !== currentUser.id) {
            socket.emit("user-mentioned", {
              workspaceId: targetWsId,
              targetUserId: member.id,
              senderName: currentUser.name,
              source: "chat",
              title: `Disebut di diskusi project (#${activeProject?.name || "project"})`,
              preview: content.slice(0, 100),
            });
          }
        });
      }
    } catch (err) {
      console.error("Failed to save message to server:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSnippet = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="flex h-[calc(100vh-175px)] w-full rounded-lg border border-border/80 bg-card shadow-2xs overflow-hidden">
      {/* Sidebar: Channels & Team Members */}
      <div className="w-60 border-r border-border/80 bg-muted/20 p-3 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          {/* Channels Section: Hanya project-project, masing-masing terisolasi */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 px-2 mb-1 flex items-center justify-between">
              <span>Channel Project</span>
              <span className="text-[9px] lowercase text-[var(--workspace-accent,#6366f1)] font-mono">
                terisolasi
              </span>
            </div>
            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isSelected = currentProjId === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      if (onSelectProject) {
                        onSelectProject(proj.id);
                      }
                      setSelectedUserDm(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-muted text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--workspace-accent,#6366f1)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Members Section (Workspace Only) */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 px-2 mb-1 flex items-center justify-between">
              <span>Anggota ({users.length})</span>
              <span className="text-[9px] lowercase text-[var(--workspace-accent,#6366f1)] font-mono">
                workspace
              </span>
            </div>
            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                        setInputMessage((prev) => `${prev}@${u.name} `);
                      }
                    }}
                    title={`Klik untuk tag @${u.name}`}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all text-muted-foreground hover:bg-muted/60 hover:text-foreground group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar src={u.avatar} fallback={u.name} size="sm" className="h-4 w-4 text-[8px]" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <span className="font-medium truncate text-xs">
                        {u.name} {isCurrent && "(Anda)"}
                      </span>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--workspace-accent,#6366f1)] font-mono">
                      @tag
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sync & Socket Status Badge */}
        <div className="rounded border border-border/70 bg-card p-2 text-[10px] font-mono text-muted-foreground/90 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" />
            <span className="font-medium text-foreground">
              Obrolan Khusus Project
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">
            Pesan terisolasi khusus project ini &amp; tidak dapat dilihat oleh project lain.
          </p>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="flex flex-1 flex-col justify-between bg-card relative">
        {/* Channel Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#</span>
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                <span>
                  {selectedUserDm
                    ? `${selectedUserDm.name}`
                    : `${activeProject?.name || "Project"}`}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted font-normal text-muted-foreground">
                  khusus project ini
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground/75">
                Diskusi terisolasi hanya untuk project ini. Anggota dari project lain tidak dapat melihat percakapan ini.
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {users.length} anggota workspace
          </span>
        </div>

        {/* Messages List */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {(loading || isLoading) && messages.length === 0 ? (
            <div className="space-y-4 animate-fade-in">
              {[1, 2, 3, 4, 5].map((i) => {
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`flex gap-2.5 text-xs ${
                      isEven ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                    <div
                      className={`space-y-1.5 flex flex-col ${
                        isEven ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-2.5 w-12 rounded" />
                      </div>
                      <Skeleton
                        className={`h-9 rounded-lg ${
                          i === 1
                            ? "w-64"
                            : i === 2
                            ? "w-48"
                            : i === 3
                            ? "w-72"
                            : "w-56"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 stroke-1 mb-1.5 opacity-40" />
              <p className="text-xs font-medium text-foreground">Belum ada diskusi di channel ini</p>
              <p className="text-[11px] max-w-sm mt-0.5 text-muted-foreground/70">
                Ketik pesan untuk berkoordinasi. Gunakan <span className="font-semibold text-foreground">@</span> untuk men-tag anggota tim di workspace ini.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              const sender = msg.sender || users.find((u) => u.id === msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 text-xs ${
                    isMine ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar
                    src={sender?.avatar}
                    fallback={sender?.name || "U"}
                    size="sm"
                    className="shrink-0 h-6 w-6 text-[9px] mt-0.5 ring-1 ring-border"
                  />

                  <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-0.5 px-0.5">
                      <span className="font-semibold text-[11px] text-foreground">
                        {isMine ? "Anda" : sender?.name || "Member"}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {formatRelativeDate(msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`rounded-lg px-3 py-1.5 text-xs leading-relaxed shadow-2xs break-words ${
                        isMine
                          ? "bg-foreground text-background"
                          : "bg-background text-foreground border border-border/80"
                      }`}
                    >
                      {/* Render text with workspace @mention highlights */}
                      {renderTextWithMentions(msg.content, users, currentUser.id)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUser && (
          <div className="px-4 py-1 text-[11px] text-muted-foreground/80 italic flex items-center gap-1.5 animate-fade-in bg-background/50">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--workspace-accent,#6366f1)] animate-ping" />
            <span>{typingUser} sedang mengetik pesan...</span>
          </div>
        )}

        {/* Quick Snippets & Input Box */}
        <div className="border-t border-border/80 p-3 bg-muted/10 relative">
          {/* Mention Suggestions Popup Scoped to Workspace Users */}
          <MentionSuggestions
            users={users}
            isOpen={mentionOpen}
            query={mentionQuery}
            selectedIndex={mentionIndex}
            onSelectUser={selectMentionUser}
            onClose={() => setMentionOpen(false)}
          />

          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto text-[11px]">
            <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">quick reply:</span>
            <button
              type="button"
              onClick={() => handleQuickSnippet("LGTM! Moving issue to in-progress")}
              className="rounded border border-border/80 bg-card px-2 py-0.5 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              LGTM
            </button>
            <button
              type="button"
              onClick={() => handleQuickSnippet("Database schema migrated successfully.")}
              className="rounded border border-border/80 bg-card px-2 py-0.5 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              db-migrated
            </button>
            <button
              type="button"
              onClick={() => handleQuickSnippet("Please review the PR and test checklist.")}
              className="rounded border border-border/80 bg-card px-2 py-0.5 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              ready-for-review
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            {/* Quick @ Button */}
            <button
              type="button"
              disabled={loading || users.length === 0}
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  setInputMessage((prev) => `${prev}@`);
                  setMentionQuery("");
                  setMentionMatchStart(inputMessage.length);
                  setMentionOpen(true);
                  setMentionIndex(0);
                }
              }}
              className="h-8 w-8 rounded-md flex items-center justify-center border border-border/80 bg-background text-muted-foreground hover:text-[var(--workspace-accent,#6366f1)] hover:bg-muted/70 transition-colors shrink-0"
              title="Tag Anggota Workspace (@)"
            >
              <AtSign className="h-4 w-4" />
            </button>

            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={
                selectedUserDm
                  ? `Pesan ke ${selectedUserDm.name}...`
                  : `Ketik pesan obrolan #${activeProject?.name || "project"} atau ketik @ untuk tag...`
              }
              className="h-8 text-xs flex-1 rounded-md border-border/80 bg-background focus-visible:ring-1 focus-visible:ring-foreground/20"
            />
            <Button
              type="submit"
              variant="asana"
              size="sm"
              disabled={!inputMessage.trim() || loading}
              className="h-8 px-3 rounded-md gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kirim</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
