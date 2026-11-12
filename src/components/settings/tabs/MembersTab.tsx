"use client";

import React, { useState, useEffect } from "react";
import { User, UserRole, Workspace } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toastAlert } from "@/components/ui/alert-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RoleBadge } from "../RoleBadge";
import {
  createInvitation,
  getInviteUrl,
  WorkspaceInvitation,
  JoinRequest,
} from "@/lib/invitation-service";
import {
  useWorkspaceInvitationsQuery,
  useWorkspaceJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
  useRevokeInvitationMutation,
} from "@/lib/hooks/useInvitationQueries";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Copy,
  Check,
  Send,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface MembersTabProps {
  currentUser: User;
  users: User[];
  workspace: Workspace;
  isAdmin: boolean;
  isLoading?: boolean;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onAddMember?: (member: { name: string; email: string; role: UserRole; title: string }) => void;
  onRemoveMember?: (userId: string) => void;
}

export function MembersTab({
  currentUser,
  users,
  workspace,
  isAdmin,
  isLoading = false,
  onUpdateUserRole,
  onAddMember,
  onRemoveMember,
}: MembersTabProps) {
  // Invite Form state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("MEMBER");
  const [inviteTitle, setInviteTitle] = useState("");

  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitation[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [sentInviteModalData, setSentInviteModalData] = useState<{ invitation: WorkspaceInvitation; inviteUrl: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: User;
    newRole: UserRole;
  } | null>(null);
  const [pendingRevokeInvite, setPendingRevokeInvite] = useState<WorkspaceInvitation | null>(null);

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // TanStack Query: Ambil undangan dan permohonan gabung workspace
  const { data: serverInvites, isLoading: isLoadingInvites } = useWorkspaceInvitationsQuery(workspace.id);
  const { data: serverRequests, isLoading: isLoadingRequests } = useWorkspaceJoinRequestsQuery(workspace.id);
  const approveMutation = useApproveJoinRequestMutation();
  const rejectMutation = useRejectJoinRequestMutation();
  const revokeMutation = useRevokeInvitationMutation();

  const activeJoinRequests = serverRequests !== undefined ? serverRequests : pendingJoinRequests;

  useEffect(() => {
    if (serverInvites) {
      setPendingInvites(serverInvites);
    }
  }, [serverInvites]);

  useEffect(() => {
    if (serverRequests) {
      setPendingJoinRequests(serverRequests);
    }
  }, [serverRequests]);

  useEffect(() => {
    setIsLoadingData(isLoadingInvites || isLoadingRequests);
  }, [isLoadingInvites, isLoadingRequests]);

  const handleExecuteRoleChange = async () => {
    if (!pendingRoleChange) return;
    setUpdatingRoleId(pendingRoleChange.user.id);
    try {
      await Promise.resolve(onUpdateUserRole(pendingRoleChange.user.id, pendingRoleChange.newRole));
      setPendingRoleChange(null);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleApproveJoinRequest = async (req: JoinRequest) => {
    setProcessingRequestId(`${req.id}-approve`);
    try {
      const res = await approveMutation.mutateAsync(req.id);
      if (res.success) {
        if (onAddMember) {
          onAddMember({
            name: req.userName,
            email: req.userEmail,
            role: "MEMBER",
            title: "Team Member",
          });
        }
        setPendingJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
        toastAlert({
          title: "Permintaan Disetujui",
          description: `${req.userName} sekarang adalah anggota workspace.`,
          variant: "success",
        });
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectJoinRequest = async (req: JoinRequest) => {
    setProcessingRequestId(`${req.id}-reject`);
    try {
      const res = await rejectMutation.mutateAsync(req.id);
      if (res.success) {
        setPendingJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
        toastAlert({
          title: "Permintaan Ditolak",
          description: `Permintaan bergabung dari ${req.userName} telah ditolak.`,
        });
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !inviteEmail.trim()) return;

    const existing = users.find(
      (u) => u.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (existing) {
      toastAlert({
        title: "Sudah Terdaftar",
        description: `Pengguna ${existing.name} (${existing.email}) sudah menjadi anggota workspace ini.`,
        variant: "warning",
      });
      return;
    }

    setIsInviting(true);
    try {
      const res = await Promise.resolve(
        createInvitation({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          email: inviteEmail.trim(),
          name: inviteName.trim() || inviteEmail.trim().split("@")[0],
          role: inviteRole,
          title:
            inviteTitle.trim() ||
            (inviteRole === "ADMIN" ? "Lead" : inviteRole === "VIEWER" ? "Guest" : "Engineer"),
          invitedBy: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
        })
      );

      setPendingInvites((prev) => [
        res.invitation,
        ...prev.filter((i) => i.id !== res.invitation.id),
      ]);
      setSentInviteModalData(res);
      setInviteName("");
      setInviteEmail("");
      setInviteTitle("");
      setInviteRole("MEMBER");
      setIsInviteOpen(false);

      toastAlert({
        title: "Undangan Disiapkan",
        description: `Undangan email telah dikirimkan ke ${res.invitation.email}.`,
        variant: "success",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const url = getInviteUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toastAlert({
      title: "Tautan Disalin",
      description: "URL tautan undangan berhasil disalin ke clipboard.",
      variant: "success",
    });
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevokeInvite = async (invId: string) => {
    setRevokingInviteId(invId);
    try {
      await revokeMutation.mutateAsync(invId);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invId));
      toastAlert({
        title: "Undangan Dibatalkan",
        description: "Tautan undangan tersebut telah dinonaktifkan.",
      });
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !onRemoveMember) return;
    setIsDeletingMember(true);
    try {
      await Promise.resolve(onRemoveMember(memberToDelete.id));
      toastAlert({
        title: "Anggota Dikeluarkan",
        description: `${memberToDelete.name} telah dikeluarkan dari workspace.`,
      });
      setMemberToDelete(null);
    } finally {
      setIsDeletingMember(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground">
            Workspace Members ({users.length})
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {isAdmin
              ? "Sebagai Admin, Anda dapat mengatur hak akses (Role) masing-masing anggota."
              : "Hanya Admin yang dapat mengubah role dan mengundang anggota baru."}
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInviteOpen(!isInviteOpen)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Join Requests from Users (Pending Admin Approval) */}
      {isAdmin &&
        (isLoadingData ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2.5 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3.5 w-48 rounded" />
              </div>
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-2.5 w-44 rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-14 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ) : activeJoinRequests.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-foreground">
                  Permintaan Bergabung / Approval ({activeJoinRequests.length})
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                Menunggu Persetujuan Admin
              </span>
            </div>

            <div className="space-y-2 divide-y divide-border/40">
              {activeJoinRequests.map((req) => (
                <div key={req.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{req.userName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{req.userEmail}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!processingRequestId}
                      onClick={() => handleRejectJoinRequest(req)}
                      className="h-6 px-2.5 text-[11px] text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                    >
                      {processingRequestId === `${req.id}-reject` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Tolak"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="asana"
                      disabled={!!processingRequestId}
                      onClick={() => handleApproveJoinRequest(req)}
                      className="h-6 px-3 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processingRequestId === `${req.id}-approve` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Setujui"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 px-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span>Permintaan Bergabung (Approval): Tidak ada permintaan baru.</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/50">0 Pending</span>
          </div>
        ))}

      {/* Invite Form */}
      {isInviteOpen && isAdmin && (
        <form
          onSubmit={handleInviteSubmit}
          className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3 animate-fade-in text-xs"
        >
          <div className="font-semibold text-foreground">Invite New Teammate</div>
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              value={inviteName}
              disabled={isInviting}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name..."
              className="h-7 text-xs bg-transparent"
              required
            />
            <Input
              type="email"
              value={inviteEmail}
              disabled={isInviting}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@company.com..."
              className="h-7 text-xs bg-transparent"
              required
            />
            <Input
              value={inviteTitle}
              disabled={isInviting}
              onChange={(e) => setInviteTitle(e.target.value)}
              placeholder="Title (e.g. QA Engineer)..."
              className="h-7 text-xs bg-transparent"
            />
            <Select
              value={inviteRole}
              onValueChange={(val) => setInviteRole(val as UserRole)}
            >
              <SelectTrigger disabled={isInviting} className="h-7 text-xs bg-background">
                <SelectValue placeholder="Pilih Role">
                  {inviteRole === "ADMIN"
                    ? "Role: Admin"
                    : inviteRole === "MEMBER"
                    ? "Role: Member"
                    : "Role: Viewer (Read-only)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Role: Member</SelectItem>
                <SelectItem value="ADMIN">Role: Admin</SelectItem>
                <SelectItem value="VIEWER">Role: Viewer (Read-only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isInviting}
              onClick={() => setIsInviteOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isInviting}
              variant="asana"
              size="sm"
              className="h-7 text-xs gap-1.5"
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Menambahkan...</span>
                </>
              ) : (
                "Add Teammate"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Members List Table */}
      <div className="rounded-lg border border-border/80 divide-y divide-border/60 overflow-hidden">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-2.5 w-48 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-md" />
                {isAdmin && <Skeleton className="h-6 w-6 rounded-md" />}
              </div>
            </div>
          ))
        ) : (
          users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors first:rounded-t-lg last:rounded-b-lg relative"
              >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={u.avatar}
                  fallback={u.name}
                  size="sm"
                  className="h-7 w-7 text-xs ring-1 ring-border shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {u.name}
                    </span>
                    {isSelf && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                        you
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 truncate">
                    {u.email} • {u.title || "Member"}
                  </div>
                </div>
              </div>

              {/* Role Selector / Display */}
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <div className="w-28 sm:w-36 min-w-0 flex items-center gap-1.5">
                    {updatingRoleId === u.id && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                    )}
                    <Select
                      value={u.role}
                      onValueChange={(val) => {
                        if (val !== u.role) {
                          setPendingRoleChange({ user: u, newRole: val as UserRole });
                        }
                      }}
                    >
                      <SelectTrigger disabled={updatingRoleId === u.id} className="h-7 text-xs bg-background w-full min-w-0 cursor-pointer">
                        <SelectValue placeholder="Role">
                          {u.role === "VIEWER" ? "VIEWER (Read-only)" : u.role}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end" className="w-36 min-w-[140px] z-50">
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                        <SelectItem value="MEMBER">MEMBER</SelectItem>
                        <SelectItem value="VIEWER">VIEWER (Read-only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <RoleBadge role={u.role} />
                )}

                {isAdmin && !isSelf && onRemoveMember && (
                  <button
                    type="button"
                    onClick={() => setMemberToDelete(u)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={`Keluarkan ${u.name} dari workspace`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Pending Invitations Section */}
      <div className="pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <h5 className="text-xs font-semibold text-foreground">
              Pending Email Invitations ({pendingInvites.length})
            </h5>
          </div>
          {pendingInvites.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Belum Di-accept
            </span>
          )}
        </div>

        {isLoadingData ? (
          <div className="rounded-lg border border-border/80 overflow-hidden divide-y divide-border/60">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-muted/10 text-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-14 rounded" />
                  </div>
                  <Skeleton className="h-2.5 w-48 rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 p-3.5 text-center text-xs text-muted-foreground/70">
            Tidak ada undangan pending saat ini. Klik &quot;Invite Member&quot; untuk mengirim tautan undangan via email.
          </div>
        ) : (
          <div className="rounded-lg border border-border/80 overflow-hidden divide-y divide-border/60">
            {pendingInvites.map((inv) => {
              const isCopied = copiedToken === inv.token;
              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-muted/10 hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {inv.name}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                        {inv.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {inv.email} • {inv.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 font-mono">
                      Diundang oleh {inv.invitedBy.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(inv.token)}
                      className="h-6.5 text-[11px] px-2 gap-1"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSentInviteModalData({
                          invitation: inv,
                          inviteUrl: getInviteUrl(inv.token),
                        })
                      }
                      className="h-6.5 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                      title="Pratinjau email undangan Outlook"
                    >
                      <Send className="h-3 w-3" />
                      <span className="hidden sm:inline">Preview Email</span>
                    </Button>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={revokingInviteId === inv.id}
                        onClick={() => setPendingRevokeInvite(inv)}
                        className="h-6.5 w-6.5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Batalkan undangan ini"
                      >
                        {revokingInviteId === inv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-rose-500" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Member Confirmation AlertDialog */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={(val) => !val && setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkan {memberToDelete?.name} dari Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Anggota ini ({memberToDelete?.email}) tidak akan lagi memiliki akses ke task, project, dan obrolan tim di workspace ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingMember}
              onClick={() => setMemberToDelete(null)}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingMember}
              onClick={handleConfirmDeleteMember}
            >
              {isDeletingMember ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Mengeluarkan...
                </>
              ) : (
                "Keluarkan Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Invitation Delivery & Copy Link Dialog */}
      <Dialog
        open={!!sentInviteModalData}
        onOpenChange={(val) => !val && setSentInviteModalData(null)}
      >
        <DialogContent className="max-w-md p-5">
          {sentInviteModalData && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-border/80">
                <div className="h-7 w-7 rounded-md bg-[#0078d4] text-white flex items-center justify-center font-bold">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    Undangan Email Disiapkan
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Simulasi Pengiriman Email Outlook / Microsoft
                  </p>
                </div>
              </div>

              {/* Mock Outlook Email Card */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-[11px]">
                <div className="grid grid-cols-4 gap-1 text-muted-foreground pb-2 border-b border-border/60">
                  <span className="font-medium text-foreground">To:</span>
                  <span className="col-span-3 font-mono text-foreground">{sentInviteModalData.invitation.email}</span>
                  <span className="font-medium text-foreground">From:</span>
                  <span className="col-span-3 text-foreground">{currentUser.name} (via Kinetic System)</span>
                  <span className="font-medium text-foreground">Subject:</span>
                  <span className="col-span-3 font-medium text-foreground">
                    Undangan Bergabung ke Workspace &quot;{sentInviteModalData.invitation.workspaceName}&quot;
                  </span>
                </div>

                <div className="pt-1 space-y-2 text-foreground/90 leading-relaxed">
                  <p>Halo <strong>{sentInviteModalData.invitation.name}</strong>,</p>
                  <p>
                    <strong>{currentUser.name}</strong> telah mengundang Anda untuk bergabung ke workspace <strong>{sentInviteModalData.invitation.workspaceName}</strong> sebagai <strong>{sentInviteModalData.invitation.role}</strong>.
                  </p>
                  <p className="text-muted-foreground">
                    Klik tombol di bawah atau buka tautan untuk menerima undangan. Jika Anda belum memiliki akun, Anda dapat login langsung menggunakan akun email Outlook Anda.
                  </p>
                </div>
              </div>

              {/* Invite Link Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Tautan Undangan Langsung (Invite URL):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={sentInviteModalData.inviteUrl}
                    className="h-8 text-xs font-mono bg-muted/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyInviteLink(sentInviteModalData.invitation.token)}
                    className="h-8 text-xs gap-1 shrink-0"
                  >
                    {copiedToken === sentInviteModalData.invitation.token ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-border/80">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.open(sentInviteModalData.inviteUrl, "_blank");
                  }}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Buka di Tab Baru</span>
                </Button>

                <Button
                  type="button"
                  variant="asana"
                  size="sm"
                  onClick={() => setSentInviteModalData(null)}
                  className="h-7 text-xs px-4"
                >
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 1. Modal Validasi Keluarkan Anggota Tim */}
      <ConfirmationDialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title={`Keluarkan "${memberToDelete?.name}"?`}
        description={`Apakah Anda yakin ingin mengeluarkan ${memberToDelete?.name} (${memberToDelete?.email}) dari workspace "${workspace.name}"? Pengguna ini tidak akan memiliki akses ke seluruh task, project, dan diskusi tim di workspace ini.`}
        confirmText="Ya, Keluarkan Anggota"
        cancelText="Batal"
        variant="destructive"
        isLoading={isDeletingMember}
        onConfirm={handleConfirmDeleteMember}
      />

      {/* 2. Modal Validasi Ubah Hak Akses / Role Anggota */}
      <ConfirmationDialog
        open={Boolean(pendingRoleChange)}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
        title={`Ubah Role "${pendingRoleChange?.user.name}"?`}
        description={`Apakah Anda yakin ingin mengubah hak akses ${pendingRoleChange?.user.name} dari ${pendingRoleChange?.user.role} menjadi ${pendingRoleChange?.newRole}? Perubahan role ini akan langsung mempengaruhi izin membuat, mengedit, atau menghapus issue dan project di workspace.`}
        confirmText="Ya, Ubah Role"
        cancelText="Batal"
        variant="default"
        isLoading={Boolean(updatingRoleId)}
        onConfirm={handleExecuteRoleChange}
      />

      {/* 3. Modal Validasi Batalkan Undangan Pending */}
      <ConfirmationDialog
        open={Boolean(pendingRevokeInvite)}
        onOpenChange={(open) => !open && setPendingRevokeInvite(null)}
        title="Batalkan Undangan?"
        description={`Apakah Anda yakin ingin membatalkan undangan untuk ${pendingRevokeInvite?.email}? Tautan yang dikirimkan sebelumnya tidak akan dapat digunakan lagi.`}
        confirmText="Ya, Batalkan Undangan"
        cancelText="Batal"
        variant="destructive"
        isLoading={Boolean(revokingInviteId)}
        onConfirm={async () => {
          if (pendingRevokeInvite) {
            await handleRevokeInvite(pendingRevokeInvite.id);
            setPendingRevokeInvite(null);
          }
        }}
      />
    </div>
  );
}
