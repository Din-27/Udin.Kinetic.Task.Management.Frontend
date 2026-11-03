import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@/types";

export interface ChatQueryFilter {
  type: "PROJECT_CHAT" | "TEAM_DISCUSSION";
  projectId?: string;
  workspaceId?: string;
}

export function useChatMessagesQuery({ type, projectId, workspaceId }: ChatQueryFilter) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", type, projectId, workspaceId],
    queryFn: async () => {
      const queryParts: string[] = [`type=${encodeURIComponent(type)}`];
      if (projectId) {
        queryParts.push(`projectId=${encodeURIComponent(projectId)}`);
      }
      if (workspaceId) {
        queryParts.push(`workspaceId=${encodeURIComponent(workspaceId)}`);
      }
      const res = await fetch(`/api/chat?${queryParts.join("&")}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil pesan chat");
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 5000,
  });
}

export function useSendChatMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      content: string;
      senderId?: string;
      projectId?: string | null;
      type: "PROJECT_CHAT" | "TEAM_DISCUSSION";
      workspaceId?: string;
      clientEndpoint?: string;
    }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim pesan chat");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", variables.type, variables.projectId || undefined, variables.workspaceId || undefined],
      });
    },
  });
}
