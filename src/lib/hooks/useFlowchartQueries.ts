import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FlowchartDiagram {
  id: string;
  workspaceId: string;
  userId?: string;
  creatorName?: string;
  title: string;
  description?: string;
  prompt?: string;
  nodes: any[];
  edges: any[];
  comments?: any[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchFlowcharts(workspaceId: string, userId?: string): Promise<FlowchartDiagram[]> {
  const urlUserId = userId ? `&userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`/api/flowchart?workspaceId=${encodeURIComponent(workspaceId)}${urlUserId}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil data flowchart");
  }
  return res.json();
}

export function useFlowchartsQuery(workspaceId: string, userId?: string) {
  return useQuery<FlowchartDiagram[]>({
    queryKey: ["flowcharts", workspaceId, userId],
    queryFn: () => fetchFlowcharts(workspaceId, userId),
    enabled: Boolean(workspaceId),
  });
}

export async function fetchFlowchartById(id: string, workspaceId?: string, userId?: string): Promise<FlowchartDiagram> {
  const queryParts: string[] = [];
  if (workspaceId) queryParts.push(`workspaceId=${encodeURIComponent(workspaceId)}`);
  if (userId) queryParts.push(`userId=${encodeURIComponent(userId)}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const res = await fetch(`/api/flowchart/${encodeURIComponent(id)}${qs}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Diagram flowchart tidak ditemukan atau telah dihapus.");
    }
    throw new Error("Diagram flowchart tidak ditemukan");
  }
  return res.json();
}

export function useFlowchartByIdQuery(id: string, workspaceId?: string, userId?: string) {
  return useQuery<FlowchartDiagram>({
    queryKey: ["flowchart", id, workspaceId, userId],
    queryFn: () => fetchFlowchartById(id, workspaceId, userId),
    enabled: Boolean(id),
  });
}

export function useSaveFlowchartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (diagram: Partial<FlowchartDiagram>) => {
      const res = await fetch("/api/flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagram),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan diagram flowchart");
      }
      return res.json();
    },
    onSuccess: (savedDiagram) => {
      queryClient.invalidateQueries({ queryKey: ["flowcharts"] });
      queryClient.setQueryData(["flowchart", savedDiagram.id], savedDiagram);
    },
  });
}

export function useDeleteFlowchartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId, userId }: { id: string; workspaceId: string; userId?: string }) => {
      const urlUserId = userId ? `&userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(
        `/api/flowchart/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}${urlUserId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menghapus diagram");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flowcharts"] });
    },
  });
}

export function useGenerateFlowchartMutation() {
  return useMutation({
    mutationFn: async (payload: {
      prompt: string;
      workspaceId: string;
      userId?: string;
      creatorName?: string;
    }) => {
      const res = await fetch("/api/flowchart/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Gagal generate flowchart dari AI.");
      }
      return res.json();
    },
  });
}

export function useShareFlowchartToChatMutation() {
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      senderId?: string;
      type: "TEAM_DISCUSSION";
      workspaceId?: string;
    }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Gagal membagikan flowchart ke diskusi tim.");
      }
      return res.json();
    },
  });
}

