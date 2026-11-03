import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Workspace } from "@/types";
import { JoinRequest } from "@/lib/invitation-service";

export type { JoinRequest };

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`/api/workspaces?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil data workspace");
  }
  return res.json();
}

export function useWorkspacesQuery(enabled = true) {
  return useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    enabled,
    staleTime: 1000 * 30, // 30 detik
  });
}

export async function fetchUserJoinRequests(userId?: string, userEmail?: string): Promise<JoinRequest[]> {
  if (!userId && !userEmail) return [];
  const uId = userId || "";
  const uEmail = userEmail || "";
  const res = await fetch(
    `/api/join-requests?userId=${encodeURIComponent(uId)}&userEmail=${encodeURIComponent(uEmail)}&t=${Date.now()}`
  );
  if (!res.ok) {
    throw new Error("Gagal mengambil status permohonan gabung");
  }
  return res.json();
}

export function useUserJoinRequestsQuery(userId?: string, userEmail?: string, refetchInterval?: number | false) {
  return useQuery<JoinRequest[]>({
    queryKey: ["join-requests", userId, userEmail],
    queryFn: () => fetchUserJoinRequests(userId, userEmail),
    enabled: Boolean(userId || userEmail),
    refetchInterval: refetchInterval || false,
  });
}

export function useUpdateJoinRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "CONSUMED" }) => {
      const res = await fetch("/api/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal memperbarui permohonan gabung");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
    },
  });
}

export function useCreateJoinRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      workspaceName: string;
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
    }) => {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengirim permohonan gabung");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
    },
  });
}
