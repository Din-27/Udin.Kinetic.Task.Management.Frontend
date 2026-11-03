import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  WorkspaceInvitation,
  JoinRequest,
  fetchWorkspaceInvitations,
  fetchServerJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  revokeInvitation,
} from "@/lib/invitation-service";

export function useWorkspaceInvitationsQuery(workspaceId?: string) {
  return useQuery<WorkspaceInvitation[]>({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: () => fetchWorkspaceInvitations(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceJoinRequestsQuery(workspaceId?: string) {
  return useQuery<JoinRequest[]>({
    queryKey: ["workspace-join-requests", workspaceId],
    queryFn: () => (workspaceId ? fetchServerJoinRequests(workspaceId) : Promise.resolve([])),
    enabled: Boolean(workspaceId),
  });
}

export function useApproveJoinRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => approveJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
    },
  });
}

export function useRejectJoinRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => rejectJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-join-requests"] });
    },
  });
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => Promise.resolve(revokeInvitation(token)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
    },
  });
}
