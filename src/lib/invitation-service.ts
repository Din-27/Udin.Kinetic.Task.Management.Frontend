"use client";

import { UserRole } from "@/types";

export interface WorkspaceInvitation {
  id: string;
  token: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
}

// Fetch invitations from server API for cross-browser realtime sync
export async function fetchWorkspaceInvitations(workspaceId?: string): Promise<WorkspaceInvitation[]> {
  if (!workspaceId) return [];
  try {
    const res = await fetch(`/api/invitations?workspaceId=${encodeURIComponent(workspaceId)}&t=${Date.now()}`);
    if (res.ok) {
      const serverList: WorkspaceInvitation[] = await res.json();
      return Array.isArray(serverList) ? serverList : [];
    }
  } catch (err) {
    console.warn("fetchWorkspaceInvitations failed:", err);
  }
  return [];
}



export function createInvitation(params: {
  workspaceId: string;
  workspaceName: string;
  email: string;
  name?: string;
  role: UserRole;
  title?: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
}): { invitation: WorkspaceInvitation; inviteUrl: string } {
  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const cleanEmail = params.email.trim().toLowerCase();

  const invitation: WorkspaceInvitation = {
    id: `inv-${Date.now()}`,
    token,
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    email: cleanEmail,
    name: params.name?.trim() || cleanEmail.split("@")[0],
    role: params.role,
    title: params.title?.trim() || "Team Member",
    invitedBy: params.invitedBy,
    createdAt: new Date().toISOString(),
    status: "PENDING",
  };

  // Sync to Server API for persistent PostgreSQL storage
  if (typeof window !== "undefined") {
    fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invitation),
    }).catch((err) => console.warn("Failed to sync invitation to server:", err));
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const inviteUrl = `${origin}/?inviteToken=${token}`;

  return { invitation, inviteUrl };
}

export async function fetchInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
  if (!token) return null;
  try {
    const res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}&t=${Date.now()}`);
    if (res.ok) {
      const serverInv: WorkspaceInvitation = await res.json();
      return serverInv;
    }
  } catch (err) {
    console.warn("fetchInvitationByToken server error:", err);
  }
  return null;
}



export function acceptInvitation(token: string): {
  success: boolean;
  invitation?: WorkspaceInvitation;
  message: string;
} {
  // Sync accept status to Server API
  if (typeof window !== "undefined") {
    fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, status: "ACCEPTED" }),
    }).catch((err) => console.warn("Failed to sync accept invitation to server:", err));
  }

  return {
    success: true,
    message: `Berhasil bergabung ke workspace!`,
  };
}

export function revokeInvitation(invitationId: string): boolean {
  // Sync revoke status to Server API
  if (typeof window !== "undefined") {
    fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: invitationId, status: "REVOKED" }),
    }).catch((err) => console.warn("Failed to sync revoke invitation to server:", err));
  }

  return true;
}

export function getInviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/?inviteToken=${token}`;
}

// ==========================================
// Join Request System (Persyaratan & Approval Admin)
// ==========================================
export interface JoinRequest {
  id: string;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}



export async function createJoinRequest(params: {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
}): Promise<{ success: boolean; request: JoinRequest; message: string }> {
  let targetRequest: JoinRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userAvatar: params.userAvatar,
    requestedAt: new Date().toISOString(),
    status: "PENDING",
  };

  // Selalu simpan ke server API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetRequest),
      });
      if (res.ok) {
        const serverData: JoinRequest = await res.json();
        if (serverData && serverData.id) {
          targetRequest = serverData;
        }
      }
    } catch (err) {
      console.warn("Failed to sync join request to server:", err);
    }
  }

  return {
    success: true,
    request: targetRequest,
    message: `Permintaan bergabung ke workspace "${params.workspaceName}" berhasil dikirim! Menunggu persetujuan admin.`,
  };
}

export async function approveJoinRequest(requestId: string): Promise<{ success: boolean; request?: JoinRequest }> {
  let updatedReq: JoinRequest | undefined;

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "APPROVED" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.request) {
          updatedReq = data.request;
        }
      }
    } catch (err) {
      console.warn("Failed to sync approve request to server:", err);
    }
  }

  return { success: true, request: updatedReq };
}

export async function rejectJoinRequest(requestId: string): Promise<{ success: boolean; request?: JoinRequest }> {
  let updatedReq: JoinRequest | undefined;

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "REJECTED" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.request) {
          updatedReq = data.request;
        }
      }
    } catch (err) {
      console.warn("Failed to sync reject request to server:", err);
    }
  }

  return { success: true, request: updatedReq };
}

export async function fetchServerJoinRequests(workspaceId: string): Promise<JoinRequest[]> {
  try {
    const res = await fetch(`/api/join-requests?workspaceId=${encodeURIComponent(workspaceId)}&t=${Date.now()}`);
    if (res.ok) {
      const serverList: JoinRequest[] = await res.json();
      return Array.isArray(serverList) ? serverList.filter((r) => r.status === "PENDING") : [];
    }
  } catch (err) {
    console.warn("fetchServerJoinRequests error:", err);
  }
  return [];
}
