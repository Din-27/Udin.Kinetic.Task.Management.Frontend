import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WhiteboardData {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  elements: any[];
  comments: any[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
  creatorName?: string;
}

export function useWhiteboardsQuery(workspaceId: string, userId?: string) {
  return useQuery<WhiteboardData[]>({
    queryKey: ["whiteboards", workspaceId, userId],
    queryFn: async () => {
      const urlUserId = userId ? `&userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/whiteboard?workspaceId=${encodeURIComponent(workspaceId)}${urlUserId}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil daftar papan tulis");
      }
      return res.json();
    },
    enabled: Boolean(workspaceId),
  });
}

export async function fetchWhiteboardById(id: string, workspaceId: string): Promise<WhiteboardData> {
  const res = await fetch(`/api/whiteboard/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) {
    throw new Error("Papan tulis tidak ditemukan");
  }
  return res.json();
}

export function useWhiteboardByIdQuery(id: string, workspaceId: string) {
  return useQuery<WhiteboardData>({
    queryKey: ["whiteboard", id],
    queryFn: () => fetchWhiteboardById(id, workspaceId),
    enabled: Boolean(id),
  });
}

export function useSaveWhiteboardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<WhiteboardData>) => {
      const res = await fetch("/api/whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan papan tulis");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["whiteboards"] });
      queryClient.setQueryData(["whiteboard", saved.id], saved);
    },
  });
}

export function useDeleteWhiteboardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId?: string }) => {
      const urlUserId = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/whiteboard/${encodeURIComponent(id)}${urlUserId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menghapus papan tulis");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboards"] });
    },
  });
}

export function useSendWhiteboardCommentMutation() {
  return useMutation({
    mutationFn: async ({
      whiteboardId,
      workspaceId,
      comment,
    }: {
      whiteboardId: string;
      workspaceId: string;
      comment: any;
    }) => {
      const res = await fetch(`/api/whiteboard/${encodeURIComponent(whiteboardId)}/comments?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comment),
      });
      if (!res.ok) {
        throw new Error("Gagal mengirim komentar");
      }
      return res.json();
    },
  });
}

