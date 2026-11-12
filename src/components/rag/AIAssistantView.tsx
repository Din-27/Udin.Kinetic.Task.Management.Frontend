"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Task, Project, User, Workspace } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  FileText,
  MessageSquare,
  Layers,
  ChevronDown,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  Search,
  Plus,
  X,
  History,
  Cpu,
  Paperclip,
} from "lucide-react";
import { toastAlert } from "@/components/ui/alert-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AIMarkdownRenderer } from "./AIMarkdownRenderer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAsRead, getLastReadTimestamp } from "@/lib/unread-chat-service";

import {
  useRagSessionsQuery,
  useCreateRagSessionMutation,
  useUpdateRagSessionMutation,
  useDeleteRagSessionMutation,
  useAskRagMutation,
  useIngestChatMutation,
  type AIChatSession,
  type AIMessage,
  type AIMessageSource,
} from "@/lib/hooks/useRagQueries";

export type { AIChatSession, AIMessage, AIMessageSource };

interface AIAssistantViewProps {
  tasks: Task[];
  projects: Project[];
  activeProject?: Project;
  currentUser: User;
  workspace?: Workspace;
  onSelectTask?: (taskId: string) => void;
  isLoadingData?: boolean;
}

// Opsi Model Gemini Cepat & Responsif
export const AVAILABLE_MODELS = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tagline: "Cepat & Cerdas (Rekomendasi)",
    badge: "3.6 Flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    tagline: "Ultra Cepat (~1s Latensi)",
    badge: "Flash-Lite",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tagline: "Stabil & Handal",
    badge: "3.5 Flash",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tagline: "Next-Gen Flash",
    badge: "3.8 Flash",
  },
];

const QUICK_PROMPTS = [
  "Ringkas isi dokumen lampiran kartu ini",
  "Apa kendala atau blockers di thread chat?",
  "Apa action items yang perlu diselesaikan?",
];

export function AIAssistantView({
  tasks,
  currentUser,
  onSelectTask,
  isLoadingData = false,
}: AIAssistantViewProps) {
  // Key unik per user ID agar riwayat chat tidak bercampur
  const userStorageKey = useMemo(() => {
    return `kinetic_rag_sessions_${currentUser?.id || "default_user"}`;
  }, [currentUser?.id]);

  // Sesi Percakapan Multi-Chat
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // TanStack Query: Query & Mutasi Sesi serta RAG
  const { data: dbSessions, isLoading: isSessionsLoading } = useRagSessionsQuery(currentUser?.id);
  const createSessionMutation = useCreateRagSessionMutation();
  const updateSessionMutation = useUpdateRagSessionMutation();
  const deleteSessionMutation = useDeleteRagSessionMutation();
  const askRagMutation = useAskRagMutation();
  const ingestChatMutation = useIngestChatMutation();

  // Input & state operasional
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Searchable Context Selector State
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const taskSelectorRef = useRef<HTMLDivElement>(null);

  // Sesi Selector Popover / Dropdown State
  const [isSessionListOpen, setIsSessionListOpen] = useState(false);
  const sessionListRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper untuk membuat sesi baru
  const createNewSession = useCallback((initialTaskId?: string): AIChatSession => {
    const defaultTaskId = initialTaskId || (tasks.length > 0 ? tasks[0].id : "");
    const matchedTask = tasks.find((t) => t.id === defaultTaskId);
    const sessionTitle = matchedTask
      ? `Tanya: ${matchedTask.title.slice(0, 28)}...`
      : "Obrolan Baru";

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: sessionTitle,
      taskId: defaultTaskId,
      model: "gemini-3.6-flash",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "ai",
          text: `Halo ${currentUser?.name || "Rekan"}! Sesi obrolan baru telah siap. Anda dapat memilih kartu tugas di dropdown konteks dan menanyakan informasi terkait tugas, dokumen lampiran, maupun riwayat percakapan.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
  }, [tasks, currentUser?.name]);

  // 1. Inisialisasi: Sinkronkan Sesi dari TanStack Query (Database Neon) dengan fallback ke localStorage
  useEffect(() => {
    if (dbSessions && Array.isArray(dbSessions) && dbSessions.length > 0) {
      setSessions(dbSessions);
      setActiveSessionId((prev) => {
        if (prev && dbSessions.some((s) => s.id === prev)) return prev;
        return dbSessions[0].id;
      });
      return;
    }

    if (!isSessionsLoading && (!dbSessions || dbSessions.length === 0)) {
      // Fallback ke localStorage
      try {
        const rawStored = localStorage.getItem(userStorageKey);
        if (rawStored) {
          const parsed: AIChatSession[] = JSON.parse(rawStored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        }
      } catch (e) {
        console.warn("Gagal membaca riwayat sesi chat dari localStorage:", e);
      }

      // Default jika belum ada riwayat obrolan sama sekali
      const defaultSession = createNewSession();
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);

      // Buat record sesi perdana di database Neon via TanStack Query
      if (currentUser?.id) {
        createSessionMutation.mutate({
          id: defaultSession.id,
          userId: currentUser.id,
          userName: currentUser.name,
          title: defaultSession.title,
          taskId: defaultSession.taskId,
          model: defaultSession.model,
          initialMessage: defaultSession.messages[0],
        });
      }
    }
  }, [dbSessions, isSessionsLoading, currentUser?.id, currentUser?.name, userStorageKey, createNewSession, createSessionMutation]);

  // 2. Simpan backup lokal ke localStorage setiap kali sessions berubah
  useEffect(() => {
    if (sessions.length > 0 && userStorageKey) {
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(sessions));
      } catch (e) {
        console.error("Gagal menyimpan sesi chat ke localStorage:", e);
      }
    }
  }, [sessions, userStorageKey]);

  // Click outside listener untuk dropdown context & session selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        taskSelectorRef.current &&
        !taskSelectorRef.current.contains(event.target as Node)
      ) {
        setIsTaskSelectorOpen(false);
      }
      if (
        sessionListRef.current &&
        !sessionListRef.current.contains(event.target as Node)
      ) {
        setIsSessionListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sesi aktif saat ini
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // Task terpilih pada sesi aktif
  const selectedTask = useMemo(() => {
    if (!activeSession) return tasks[0] || null;
    return tasks.find((t) => t.id === activeSession.taskId) || tasks[0] || null;
  }, [tasks, activeSession]);

  // Filter tasks berdasarkan input pencarian pada context dropdown
  const filteredTasks = useMemo(() => {
    if (!taskSearchQuery.trim()) return tasks;
    const q = taskSearchQuery.toLowerCase();
    return tasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const idMatch = t.id.toLowerCase().includes(q);
      return titleMatch || descMatch || idMatch;
    });
  }, [tasks, taskSearchQuery]);

  // Helper scroll ke pesan terakhir (last chat)
  const scrollToLastChat = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Deteksi posisi scroll: tampilkan tombol scroll ke bawah jika user melihat riwayat atas
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;
    setShowScrollBottomBtn(!isNearBottom);
  };

  // 1. Selalu scroll ke pesan terakhir (last chat) saat pertama kali buka atau saat ganti sesi obrolan
  useEffect(() => {
    // Scroll instant (auto) agar langsung di last chat tanpa janky animation saat load
    const t1 = setTimeout(() => scrollToLastChat(false), 50);
    const t2 = setTimeout(() => scrollToLastChat(false), 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeSessionId, scrollToLastChat]);

  // 2. Auto-scroll halus (smooth) saat ada pesan baru dikirim atau selesai streaming AI
  useEffect(() => {
    const t = setTimeout(() => scrollToLastChat(true), 30);
    return () => clearTimeout(t);
  }, [activeSession?.messages?.length, isLoading, scrollToLastChat]);

  // Tandai sesi AI yang sedang aktif sebagai telah dibaca
  useEffect(() => {
    if (activeSessionId) {
      markAsRead(`ai_session_${activeSessionId}`);
    }
  }, [activeSessionId, activeSession?.messages.length]);

  // Switch atau ubah task pada sesi aktif
  const handleSelectTaskForActiveSession = (taskId: string) => {
    if (!activeSession) return;
    const taskObj = tasks.find((t) => t.id === taskId);
    const newTitle =
      activeSession.messages.length <= 1 && taskObj
        ? `Tanya: ${taskObj.title.slice(0, 28)}...`
        : activeSession.title;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            taskId,
            title: newTitle,
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return s;
      })
    );
    setIsTaskSelectorOpen(false);
    setTaskSearchQuery("");

    // Sinkronkan perubahan task & judul sesi ke DB via TanStack Query
    updateSessionMutation.mutate({
      sessionId: activeSession.id,
      userId: currentUser?.id,
      data: { taskId, title: newTitle },
    });
  };

  // Ubah model Gemini pada sesi aktif
  const handleChangeModel = (modelId: string) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, model: modelId } : s))
    );
    const chosen = AVAILABLE_MODELS.find((m) => m.id === modelId);
    toastAlert({
      title: "Model Diperbarui",
      description: `Menggunakan ${chosen?.name || modelId} untuk sesi ini.`,
    });

    // Sinkronkan pilihan model ke DB via TanStack Query
    updateSessionMutation.mutate({
      sessionId: activeSession.id,
      userId: currentUser?.id,
      data: { model: modelId },
    });
  };

  // Buat sesi baru
  const handleAddNewSession = async () => {
    const newSession = createNewSession(selectedTask?.id);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSessionListOpen(false);
    toastAlert({
      title: "Obrolan Baru Dimulai",
      description: "Anda kini berada di percakapan baru dengan konteks terisolasi.",
    });
    setTimeout(() => inputRef.current?.focus(), 150);

    // Persist sesi baru ke DB Neon via TanStack Query
    if (currentUser?.id) {
      try {
        await createSessionMutation.mutateAsync({
          id: newSession.id,
          userId: currentUser.id,
          userName: currentUser.name,
          title: newSession.title,
          taskId: newSession.taskId,
          model: newSession.model,
          initialMessage: newSession.messages[0],
        });
      } catch (e) {
        console.warn("Gagal menyimpan sesi baru ke database:", e);
      }
    }
  };

  // Hapus sesi
  const handleDeleteSession = async (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Jika hanya ada 1 sesi, reset isinya
      const reset = createNewSession();
      setSessions([reset]);
      setActiveSessionId(reset.id);
      toastAlert({
        title: "Obrolan Direset",
        description: "Sesi terakhir telah dibersihkan kembali ke awal.",
      });

      // Hapus sesi lama di DB dan buat sesi default via TanStack Query
      deleteSessionMutation.mutate({
        sessionId: sessionIdToDelete,
        userId: currentUser?.id,
      });
      if (currentUser?.id) {
        createSessionMutation.mutate({
          id: reset.id,
          userId: currentUser.id,
          userName: currentUser.name,
          title: reset.title,
          taskId: reset.taskId,
          model: reset.model,
          initialMessage: reset.messages[0],
        });
      }
      return;
    }

    const updated = sessions.filter((s) => s.id !== sessionIdToDelete);
    setSessions(updated);
    if (activeSessionId === sessionIdToDelete) {
      setActiveSessionId(updated[0].id);
    }
    toastAlert({
      title: "Obrolan Dihapus",
      description: "Sesi percakapan telah dihapus dari database.",
    });

    // Hapus sesi dari database via TanStack Query
    deleteSessionMutation.mutate({
      sessionId: sessionIdToDelete,
      userId: currentUser?.id,
    });
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Handler lampirkan file dokumen tambahan untuk pertanyaan AI
  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: `[Lampiran Gambar: ${file.name} (${Math.round(file.size / 1024) || 1} KB)]`,
      });
      toastAlert({
        title: "Gambar Terlampir",
        description: `Gambar "${file.name}" siap disertakan ke AI.`,
        variant: "info",
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setAttachedFile({
          name: file.name,
          size: file.size,
          content: text,
        });
        toastAlert({
          title: "File Terlampir",
          description: `Dokumen "${file.name}" siap digunakan sebagai data tambahan pertanyaan AI.`,
          variant: "success",
        });
      };
      reader.onerror = () => {
        toastAlert({
          title: "Gagal Membaca File",
          description: "Tidak dapat membaca file dokumen ini.",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  // Mengirim Pertanyaan ke RAG API & Persistensi Otomatis ke DB
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if ((!textToSend && !attachedFile) || isLoading || !activeSession) return;

    if (!selectedTask) {
      toastAlert({
        title: "Pilih Kartu Task",
        description: "Silakan pilih salah satu kartu Kanban untuk konteks pertanyaan.",
        variant: "warning",
      });
      return;
    }

    const currentModel = activeSession.model || "gemini-3.8-flash";

    // Siapkan teks tampilan dan pertanyaan lengkap untuk RAG AI
    let questionForRAG = textToSend;
    let displayText = textToSend;

    if (attachedFile) {
      const docHeader = `\n\n[DATA TAMBAHAN DOKUMEN: "${attachedFile.name}"]:\n${attachedFile.content}`;
      questionForRAG = textToSend
        ? `${textToSend}${docHeader}`
        : `Jelaskan atau analisislah isi dokumen berikut:${docHeader}`;

      displayText = textToSend
        ? `${textToSend}\n\n*Lampiran Dokumen:* \`${attachedFile.name}\` (${Math.round(attachedFile.size / 1024) || 1} KB)`
        : `*Lampiran Dokumen:* \`${attachedFile.name}\` (${Math.round(attachedFile.size / 1024) || 1} KB)\n*(Menganalisis isi dokumen terlampir)*`;
    }

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: displayText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update title sesi jika ini pesan pertama dari user
    const shouldUpdateTitle =
      activeSession.messages.filter((m) => m.sender === "user").length === 0;
    const newTitle = shouldUpdateTitle
      ? textToSend.length > 32
        ? `${textToSend.slice(0, 32)}...`
        : textToSend || `Dokumen: ${attachedFile?.name}`
      : activeSession.title;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            title: newTitle,
            updatedAt: userMsg.timestamp,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );

    if (shouldUpdateTitle) {
      updateSessionMutation.mutate({
        sessionId: activeSession.id,
        userId: currentUser?.id,
        data: { title: newTitle },
      });
    }

    setInputQuery("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const data = await askRagMutation.mutateAsync({
        taskId: selectedTask.id,
        question: questionForRAG,
        model: currentModel,
        sessionId: activeSession.id,
        userId: currentUser?.id,
        userName: currentUser?.name,
        topK: 5,
      });

      const aiMsg: AIMessage = {
        id: data.aiMessageId || `ai-${Date.now()}`,
        sender: "ai",
        text: data.answer || "Maaf, tidak ada informasi yang ditemukan.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: data.sources || [],
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, aiMsg],
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: `Terjadi kendala saat memproses pertanyaan: ${err?.message || "Koneksi backend bermasalah"}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Re-indeks Komentar/Chat Task ke pgvector via TanStack Query
  const handleSyncChatEmbeddings = async () => {
    if (!selectedTask || isIngesting) return;
    setIsIngesting(true);
    try {
      const data = await ingestChatMutation.mutateAsync({
        taskId: selectedTask.id,
        batchSize: 12,
      });

      toastAlert({
        title: "Sinkronisasi Berhasil",
        description: data.message || "Riwayat chat berhasil diindeks ke pgvector.",
      });
    } catch (err: any) {
      toastAlert({
        title: "Gagal Sinkronisasi",
        description: err.message || "Terjadi kesalahan saat mengindeks ke pgvector.",
        variant: "destructive",
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearCurrentChat = () => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [
              {
                id: `welcome-${Date.now()}`,
                sender: "ai",
                text: `Percakapan ini dibersihkan. Silakan ajukan pertanyaan baru seputar kartu "${selectedTask?.title || "task"}".`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ],
          };
        }
        return s;
      })
    );
    toastAlert({
      title: "Chat Direset",
      description: "Percakapan sesi ini telah dibersihkan.",
    });
  };

  const currentActiveModelInfo = useMemo(() => {
    const currentModelId = activeSession?.model || "gemini-3.8-flash";
    return (
      AVAILABLE_MODELS.find((m) => m.id === currentModelId) || AVAILABLE_MODELS[0]
    );
  }, [activeSession?.model]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-w-5xl mx-auto space-y-2.5 pb-2">
      {/* Top Header Bar: Clean, Linear-style, Multi-Chat & Dynamic Controls */}
      <div className="relative z-20 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md px-3.5 py-2.5 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Sisi Kiri: Branding & Sesi Selector Drawer */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            {/* <div className="h-7 w-7 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div> */}

            {/* Session Switcher Popover */}
            <div className="relative z-20 flex items-center gap-1.5" ref={sessionListRef}>
              <button
                type="button"
                onClick={() => setIsSessionListOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold text-foreground transition-colors max-w-[140px] sm:max-w-[180px] md:max-w-[220px] truncate shadow-2xs"
                title="Pilih atau kelola sesi obrolan (Tersimpan di database Neon PostgreSQL)"
              >
                <History className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{activeSession?.title || "Obrolan AI"}</span>
                <span className="text-[10px] text-muted-foreground font-mono font-normal">
                  ({sessions.length})
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>

              {/* Popover List Sesi Chat */}
              {isSessionListOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between px-1.5 py-1 border-b border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Daftar Obrolan
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewSession}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                      <span>Obrolan Baru</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {sessions.map((s) => {
                      const isActive = s.id === activeSessionId;
                      const sessionTask = tasks.find((t) => t.id === s.taskId);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setIsSessionListOpen(false);
                          }}
                          className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors border ${isActive
                            ? "bg-accent text-accent-foreground border-border font-medium"
                            : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
                              <span className="truncate text-xs">{s.title}</span>
                              {!isActive && s.messages.length > 1 && s.messages[s.messages.length - 1]?.sender === "ai" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 shadow-2xs" title="Terdapat balasan AI baru" />
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5 truncate font-mono">
                              {sessionTask && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-foreground/80 font-medium border border-border/60 shrink-0">
                                  {sessionTask.id}
                                </span>
                              )}
                              <span className="truncate max-w-[110px]">
                                {sessionTask?.title || "Umum"}
                              </span>
                              <span>•</span>
                              <span>{s.messages.length} pesan</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all shrink-0"
                            title="Hapus sesi ini"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Dynamic Model Selector, Searchable Task Context & Secondary Menu */}
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end shrink-0">
            {/* Dynamic Model Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 px-2 rounded-md flex items-center gap-1.5 text-xs font-medium text-foreground bg-background border border-border/80 hover:bg-muted transition-colors shrink-0 focus:outline-none shadow-2xs"
                title="Pilih Model Google Gemini"
              >
                <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[130px] md:max-w-none">
                  {currentActiveModelInfo.name}
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                  {currentActiveModelInfo.badge}
                </span>
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Model Gemini Dinamis
                </div>
                {AVAILABLE_MODELS.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => handleChangeModel(m.id)}
                    className="flex items-center justify-between gap-2 cursor-pointer py-1.5"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.id === "gemini-3.8-flash" && (
                          <span className="text-[9px] text-muted-foreground">(Default)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {m.tagline}
                      </p>
                    </div>
                    {activeSession?.model === m.id && (
                      <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Searchable Context Task Dropdown */}
            <div className="relative z-20 flex-1 sm:flex-initial" ref={taskSelectorRef}>
              <button
                type="button"
                onClick={() => setIsTaskSelectorOpen((prev) => !prev)}
                className="w-full sm:w-auto h-7 flex items-center justify-between gap-2 bg-background border border-border/80 rounded-md px-2.5 text-xs text-foreground hover:bg-muted transition-colors shadow-2xs focus:outline-none"
                title="Pilih konteks kartu Kanban yang dapat dicari"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                  {selectedTask && (
                    <span className="font-mono text-[9px] font-medium px-1.5 py-0.2 rounded bg-muted text-foreground border border-border/70 shrink-0">
                      {selectedTask.id}
                    </span>
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-[160px] font-medium text-left">
                    {selectedTask ? selectedTask.title : "Pilih Kartu Task..."}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>

              {/* Popover Searchable Context Dropdown Panel */}
              {isTaskSelectorOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl z-50 p-2 space-y-2 animate-in fade-in-0 zoom-in-95">
                  {/* Search Input Box */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      placeholder="Cari ID kartu / task..."
                      className="h-7.5 pl-8 pr-7 text-xs bg-muted/40 border-border/70 rounded-lg focus-visible:ring-foreground/20"
                    />
                    {taskSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTaskSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground font-mono">
                    <span>{filteredTasks.length} kartu ditemukan</span>
                    <span>Konteks RAG</span>
                  </div>

                  {/* List of Tasks with Task ID */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {filteredTasks.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Tidak ada kartu yang cocok dengan pencarian.
                      </div>
                    ) : (
                      filteredTasks.map((t) => {
                        const isSelected = selectedTask?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTaskForActiveSession(t.id)}
                            className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border ${isSelected
                              ? "bg-accent text-accent-foreground border-border font-medium"
                              : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[9px] font-medium px-1.5 py-0.2 rounded bg-muted text-foreground border border-border/70 shrink-0">
                                  {t.id}
                                </span>
                                <p className="truncate font-medium text-foreground">
                                  {t.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-muted border border-border/60">
                                  {t.status}
                                </span>
                                {t.priority && (
                                  <span className="text-[9px] text-muted-foreground/80">
                                    • {t.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Three-dots dropdown menu untuk aksi sekunder */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 transition-colors shrink-0 focus:outline-none shadow-2xs"
                title="Menu opsi AI"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                {/* Obrolan Baru di dalam Menu Titik 3 */}
                <DropdownMenuItem
                  onClick={handleAddNewSession}
                  className="gap-2.5 cursor-pointer font-medium text-foreground"
                >
                  <Plus className="h-3.5 w-3.5 text-foreground" />
                  <span>Obrolan Baru</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSyncChatEmbeddings}
                  disabled={isIngesting || !selectedTask}
                  className="gap-2.5 cursor-pointer"
                >
                  <RotateCw
                    className={`h-3.5 w-3.5 ${isIngesting ? "animate-spin text-foreground" : "text-muted-foreground"}`}
                  />
                  <span>{isIngesting ? "Mengindeks..." : "Sinkronkan pgvector"}</span>
                </DropdownMenuItem>

                {selectedTask && onSelectTask && (
                  <DropdownMenuItem
                    onClick={() => onSelectTask(selectedTask.id)}
                    className="gap-2.5 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Buka Detail Task</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleClearCurrentChat}
                  className="gap-2.5 cursor-pointer text-rose-500 focus:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Bersihkan Chat Sesi Ini</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info Strip Sesi Terpilih & User Unik */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 border-t border-border/50 pt-1.5 px-0.5">
          <div className="flex items-center gap-2 truncate">
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground">Konteks Aktif:</span>
              {selectedTask && (
                <span className="font-mono text-[9px] font-medium px-1.5 py-0.2 rounded bg-muted text-foreground border border-border/70 shrink-0">
                  {selectedTask.id}
                </span>
              )}
              <span className="truncate max-w-[200px] sm:max-w-md">
                {selectedTask ? selectedTask.title : "(Belum ada kartu dipilih)"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
            <span>User: {currentUser?.name || "Anonim"}</span>
            <span>•</span>
            <span className="text-foreground font-semibold">
              {currentActiveModelInfo.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="relative z-10 flex-1 rounded-xl border border-border bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-2xs">
        <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 relative">
          {isLoadingData && (activeSession?.messages || []).length === 0 ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex gap-2.5 max-w-xl mr-auto">
                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-16 w-full rounded-2xl rounded-tl-none" />
                </div>
              </div>
              <div className="flex gap-2.5 max-w-md ml-auto flex-row-reverse">
                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                <div className="space-y-2 flex-1 items-end">
                  <Skeleton className="h-4 w-24 rounded ml-auto" />
                  <Skeleton className="h-10 w-full rounded-2xl rounded-tr-none" />
                </div>
              </div>
              <div className="flex gap-2.5 max-w-2xl mr-auto">
                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-24 w-full rounded-2xl rounded-tl-none" />
                </div>
              </div>
            </div>
          ) : (
            (activeSession?.messages || []).map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`h-6 w-6 rounded-md shrink-0 flex items-center justify-center text-xs font-semibold shadow-2xs ${isUser
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground border border-border/80"
                      }`}
                  >
                    {isUser ? (
                      <UserIcon className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-foreground" />
                    )}
                  </div>

                  {/* Message Bubble Content */}
                  <div className="space-y-1 max-w-[88%]">
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${isUser
                        ? "bg-foreground text-background rounded-tr-none font-medium whitespace-pre-wrap"
                        : "bg-muted/40 border border-border/80 text-foreground rounded-tl-none"
                        }`}
                    >
                      <AIMarkdownRenderer content={msg.text} isUser={isUser} />
                    </div>

                    {/* Clean Collapsible Citations (No Clutter) */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => toggleSources(msg.id)}
                          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground py-0.5 px-1.5 rounded transition-colors"
                          title="Klik untuk melihat rujukan dokumen/chat"
                        >
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>{msg.sources.length} Rujukan Terindeks</span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform duration-200 ${expandedSources[msg.id] ? "rotate-180" : ""
                              }`}
                          />
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="rounded-lg border border-border/70 bg-muted/20 p-2 space-y-1.5 mt-1 animate-in fade-in-0 duration-150">
                            {msg.sources.map((src, i) => (
                              <div
                                key={i}
                                className="rounded-md border border-border/60 bg-background/90 p-2 text-[10px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                    {src.sourceType === "FILE" ? (
                                      <>
                                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="truncate">
                                          {src.metadata?.filename || "Dokumen Lampiran"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span>Diskusi Chat Thread</span>
                                      </>
                                    )}
                                  </span>
                                  <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 shrink-0">
                                    {Math.round(src.similarity * 100)}% Relevan
                                  </span>
                                </div>
                                <p className="text-muted-foreground italic text-[10px] line-clamp-2">
                                  &ldquo;{src.snippet}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Meta Info */}
                    <div
                      className={`flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60 ${isUser ? "justify-end" : "justify-start"
                        }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                          title="Salin jawaban"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                              <span className="text-emerald-500">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing/Thinking Loader with Skeleton */}
          {isLoading && (
            <div className="flex gap-2.5 max-w-xl mr-auto animate-fade-in w-full">
              <div className="h-6 w-6 rounded-md shrink-0 flex items-center justify-center bg-muted text-foreground border border-border/80 text-xs shadow-2xs">
                <Bot className="h-3.5 w-3.5 text-foreground" />
              </div>
              <div className="flex-1 space-y-2 rounded-2xl rounded-tl-none border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/70 animate-bounce" />
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/70 animate-bounce [animation-delay:0.2s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/70 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground/80">
                    Mengolah rujukan via {currentActiveModelInfo.name}...
                  </span>
                </div>
                {/* Skeleton Preview Lines */}
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-3 w-5/6 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* Tombol Cepat Kembali ke Pesan Terakhir (Last Chat) */}
          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={() => scrollToLastChat(true)}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-primary-foreground/20"
              title="Lompat ke pesan terakhir (Last Chat)"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Pesan Terakhir</span>
            </button>
          )}
        </div>

        {/* Subtle Quick Prompts */}
        {(activeSession?.messages || []).length <= 2 && (
          <div className="px-4 py-1.5 border-t border-border/60 bg-muted/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-muted-foreground/70 shrink-0 font-medium">
              Saran:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(prompt)}
                className="text-[10px] px-2.5 py-0.5 rounded-full border border-border/70 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 hover:border-foreground/30 shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Query Input Bar */}
        <div className="p-2.5 bg-card border-t border-border/80 space-y-2">
          {/* Hidden Input File untuk Data Tambahan AI */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleAttachFile}
            accept=".txt,.md,.json,.csv,.sql,.js,.ts,.html,.py,.doc,.docx,.pdf,image/*"
            className="hidden"
          />

          {/* Pill File Terlampir (Data Tambahan Tanya AI) */}
          {attachedFile && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-foreground/10 border border-border text-xs text-foreground animate-in fade-in-0 duration-150">
              <FileText className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span className="font-semibold truncate max-w-[200px] sm:max-w-md">{attachedFile.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({Math.round(attachedFile.size / 1024) || 1} KB)
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-foreground/15 text-foreground font-medium">
                Data Tambahan
              </span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="ml-auto p-1 rounded-md hover:bg-foreground/15 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Hapus file lampiran"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Tombol Lampirkan File Data Tambahan */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${attachedFile
                  ? "bg-foreground/15 border-foreground/30 text-foreground font-medium"
                  : "border-border/80 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              title="Lampirkan file data tambahan (.txt, .md, .json, .csv, gambar, dsb)"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Lampirkan</span>
            </button>

            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputQuery}
                disabled={isLoading}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  attachedFile
                    ? `Tanyakan sesuatu berdasarkan file "${attachedFile.name}" (atau langsung Kirim)...`
                    : selectedTask
                      ? `Tanyakan tentang "${selectedTask.title}" (${currentActiveModelInfo.badge})...`
                      : "Pilih kartu task dan ketik pertanyaan..."
                }
                className="text-xs h-9 bg-muted/30 border-border/80 focus-visible:ring-foreground/20 pl-3.5 pr-9 rounded-lg"
              />
              <Sparkles className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
            </div>

            <Button
              type="submit"
              disabled={isLoading || (!inputQuery.trim() && !attachedFile)}
              className="h-9 px-3.5 text-xs font-medium gap-1.5 bg-foreground text-background hover:bg-foreground/90 shadow-2xs rounded-lg cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Kirim</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
