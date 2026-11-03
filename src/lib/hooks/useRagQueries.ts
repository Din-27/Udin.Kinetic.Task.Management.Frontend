import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AIMessageSource {
  sourceType?: "FILE" | "CHAT";
  sourceId?: string;
  snippet?: string;
  title?: string;
  type?: "TASK_DESCRIPTION" | "TASK_COMMENT" | "ATTACHMENT_DOCUMENT";
  content?: string;
  metadata?: any;
  similarity?: number;
}

export interface AIMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  sources?: AIMessageSource[] | any[];
  rawText?: string;
}

export interface AIChatSession {
  id: string;
  title: string;
  taskId: string;
  model: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

// 1. Query: Ambil semua sesi chat milik user
export function useRagSessionsQuery(userId?: string) {
  return useQuery<AIChatSession[]>({
    queryKey: ["rag-sessions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/rag/sessions?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil sesi AI chat");
      }
      return res.json();
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2 menit
  });
}

// 2. Mutation: Buat sesi baru di DB Neon
export function useCreateRagSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      userId: string;
      userName?: string;
      title: string;
      taskId?: string;
      model?: string;
      initialMessage?: AIMessage;
    }) => {
      const res = await fetch("/api/rag/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat sesi baru");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rag-sessions", variables.userId] });
    },
  });
}

// 3. Mutation: Update metadata / judul / model / pesan sesi
export function useUpdateRagSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      data,
    }: {
      sessionId: string;
      userId?: string;
      data: Partial<AIChatSession> & { messages?: AIMessage[] };
    }) => {
      const res = await fetch(`/api/rag/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memperbarui sesi");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ["rag-sessions", variables.userId] });
      }
    },
  });
}

// 4. Mutation: Hapus sesi
export function useDeleteRagSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId?: string }) => {
      const res = await fetch(`/api/rag/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus sesi");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ["rag-sessions", variables.userId] });
      }
    },
  });
}

// 5. Mutation: Tanya RAG (Ask Gemini RAG API)
export function useAskRagMutation() {
  return useMutation({
    mutationFn: async ({
      taskId,
      question,
      model,
      sessionId,
      userId,
      userName,
      topK = 5,
    }: {
      taskId: string;
      question: string;
      model: string;
      sessionId: string;
      userId?: string;
      userName?: string;
      topK?: number;
    }) => {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          topK,
          model,
          sessionId,
          userId,
          userName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mendapatkan jawaban dari RAG API");
      }
      return res.json();
    },
  });
}

// 6. Mutation: Ingest chat diskusi ke pgvector
export function useIngestChatMutation() {
  return useMutation({
    mutationFn: async ({ taskId, batchSize = 12 }: { taskId: string; batchSize?: number }) => {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ingest-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal sinkronisasi chat");
      }
      return data;
    },
  });
}
