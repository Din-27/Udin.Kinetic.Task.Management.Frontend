"use client";

import React, { useState, useEffect } from "react";
import { WORKSPACE_ACCENT_COLORS, Workspace, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Sparkles,
  Check,
  Loader2,
  Users,
  Search,
  AlertCircle,
  Clock,
  ShieldCheck,
  Plus,
  X,
  ArrowRight,
} from "lucide-react";
import { getDefaultAvatar } from "@/lib/utils";
import { createJoinRequest, JoinRequest } from "@/lib/invitation-service";
import {
  fetchWorkspaces,
  fetchUserJoinRequests,
  useUpdateJoinRequestMutation,
} from "@/lib/hooks/useWorkspaceQueries";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkspace: (data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    inviteEmails?: string[];
  }) => void;
  currentUser?: User;
  onJoinedWorkspace?: (workspace: Workspace) => void;
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreateWorkspace,
  currentUser,
  onJoinedWorkspace,
}: CreateWorkspaceModalProps) {
  // Mode: "create" (buat baru & undang anggota) atau "join" (gabung via ID/slug)
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // === Form: Buat Workspace Baru ===
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite emails saat buat workspace baru
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  // === Form: Gabung ke Workspace ===
  const [searchWsQuery, setSearchWsQuery] = useState("");
  const [isSearchingWs, setIsSearchingWs] = useState(false);
  const [foundWorkspace, setFoundWorkspace] = useState<Workspace | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [joinRequestSent, setJoinRequestSent] = useState<JoinRequest | null>(null);
  const [isSendingJoinRequest, setIsSendingJoinRequest] = useState(false);
  const updateJoinRequestMutation = useUpdateJoinRequestMutation();

  // Reset form saat modal dibuka/tutup
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSlug("");
      setDescription("");
      setColor("#6366f1");
      setIsCustomSlug(false);
      setInviteEmailInput("");
      setInviteEmails([]);
      setSearchWsQuery("");
      setFoundWorkspace(null);
      setSearchError(null);
      setActiveTab("create");
    }
  }, [isOpen]);

  // Initial check: apakah user sedang memiliki join request PENDING
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    let isMounted = true;

    const checkExistingRequests = async () => {
      try {
        const requests = await fetchUserJoinRequests(currentUser.id, currentUser.email);
        if (isMounted) {
          const pending = requests.find((r) => r.status === "PENDING");
          if (pending) {
            setJoinRequestSent(pending);
          }
        }
      } catch (err) {
        console.warn("Check join request failed:", err);
      }
    };

    checkExistingRequests();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser]);

  // Polling approval status saat user sedang menunggu persetujuan (joinRequestSent != null)
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !joinRequestSent) return;
    let isMounted = true;
    let isFetching = false;

    const pollApproval = async () => {
      if (isFetching || (typeof document !== "undefined" && document.hidden)) return;
      isFetching = true;
      try {
        const requests = await fetchUserJoinRequests(currentUser.id, currentUser.email);
        if (isMounted) {
          const approved = requests.find((r) => r.status === "APPROVED");
          if (approved) {
            updateJoinRequestMutation.mutate({ requestId: approved.id, status: "CONSUMED" });

            let targetWs: Workspace | null = null;
            try {
              const wsList = await fetchWorkspaces();
              targetWs = wsList.find((w) => w.id === approved.workspaceId) || null;
            } catch {}

            if (!targetWs) {
              targetWs = {
                id: approved.workspaceId,
                name: approved.workspaceName || "Workspace",
                slug: approved.workspaceId,
                description: "Joined workspace",
                color: "#6366f1",
              };
            }

            if (onJoinedWorkspace) {
              onJoinedWorkspace(targetWs);
            }
            onClose();
            return;
          }

          const isStillPending = requests.some(
            (r) => (r.id === joinRequestSent.id || r.workspaceId === joinRequestSent.workspaceId) && r.status === "PENDING"
          );
          if (!isStillPending) {
            setJoinRequestSent(null);
          }
        }
      } catch (err) {
        console.warn("Poll approval error:", err);
      } finally {
        isFetching = false;
      }
    };

    const interval = setInterval(pollApproval, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, currentUser, joinRequestSent, onJoinedWorkspace, onClose]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCustomSlug) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  };

  const handleAddEmail = () => {
    const clean = inviteEmailInput.trim().toLowerCase();
    if (clean && clean.includes("@") && !inviteEmails.includes(clean)) {
      setInviteEmails([...inviteEmails, clean]);
      setInviteEmailInput("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setInviteEmails(inviteEmails.filter((em) => em !== emailToRemove));
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      onCreateWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        color,
        inviteEmails: inviteEmails.length > 0 ? inviteEmails : undefined,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchWorkspace = async () => {
    const q = searchWsQuery.trim().toLowerCase();
    if (!q) return;

    setIsSearchingWs(true);
    setSearchError(null);
    setFoundWorkspace(null);

    try {
      let list: Workspace[] = [];
      try {
        list = await fetchWorkspaces();
      } catch (e) {
        console.warn("API fetch workspaces failed:", e);
      }

      const found = list.find(
        (w) =>
          w.id.toLowerCase() === q ||
          w.slug?.toLowerCase() === q ||
          w.name.toLowerCase().includes(q)
      );

      if (found) {
        setFoundWorkspace(found);
      } else {
        setSearchError(`Workspace dengan ID atau slug "${searchWsQuery}" tidak ditemukan.`);
      }
    } catch {
      setSearchError("Terjadi kesalahan saat mencari workspace.");
    } finally {
      setIsSearchingWs(false);
    }
  };

  const handleSendJoinRequest = async () => {
    if (!foundWorkspace || isSendingJoinRequest || !currentUser) return;

    setIsSendingJoinRequest(true);
    try {
      const res = await createJoinRequest({
        workspaceId: foundWorkspace.id,
        workspaceName: foundWorkspace.name,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar || getDefaultAvatar(currentUser.name, currentUser.email),
      });

      if (res.success && res.request) {
        setJoinRequestSent(res.request);
      }
    } catch (e) {
      console.warn("Failed to send join request:", e);
      setSearchError("Gagal mengirim permintaan bergabung.");
    } finally {
      setIsSendingJoinRequest(false);
    }
  };

  const handleCancelJoinRequest = async () => {
    if (!joinRequestSent) return;
    updateJoinRequestMutation.mutate({ requestId: joinRequestSent.id, status: "CANCELLED" });
    setJoinRequestSent(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md p-5">
        <DialogHeader className="pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-foreground/10 text-foreground flex items-center justify-center">
                {activeTab === "create" ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
              <DialogTitle className="text-sm font-semibold tracking-tight">
                {activeTab === "create" ? "Workspace Baru" : "Gabung ke Workspace"}
              </DialogTitle>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="mt-2.5 flex items-center rounded-lg bg-muted/50 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Buat Baru</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "join"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3 w-3" />
              <span>Gabung via ID</span>
              {joinRequestSent && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping ml-0.5" />
              )}
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: BUAT WORKSPACE BARU */}
        {activeTab === "create" && (
          <form onSubmit={handleSubmitCreate} className="mt-3.5 space-y-3.5">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Workspace Name *
              </label>
              <Input
                required
                autoFocus
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Acme Studio, Marketing Team"
                className="text-xs h-8 border-border/80 bg-muted/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Workspace URL
              </label>
              <div className="flex items-center rounded-md border border-border/80 bg-muted/20 px-2.5 py-1 text-xs">
                <span className="text-muted-foreground font-mono text-[11px]">kinetic.app/</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setIsCustomSlug(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="acme-studio"
                  className="bg-transparent font-mono text-foreground focus:outline-none ml-1 flex-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Description (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan tujuan atau cakupan tim untuk workspace ini..."
                rows={2}
                className="text-xs resize-none border-border/80 bg-muted/20 min-h-[50px]"
              />
            </div>

            {/* Tambah Anggota / Invite User */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-muted-foreground block">
                  Undang Anggota Tim (Opsional)
                </label>
                {inviteEmails.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {inviteEmails.length} anggota diundang
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="email"
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  placeholder="rekan@perusahaan.com"
                  className="text-xs h-8 border-border/80 bg-muted/20 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEmail}
                  disabled={!inviteEmailInput.trim() || !inviteEmailInput.includes("@")}
                  className="h-8 px-2.5 text-xs gap-1 border-border/80"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah</span>
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-20 overflow-y-auto pt-1">
                  {inviteEmails.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted/60 border border-border/80 text-foreground"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(em)}
                        className="text-muted-foreground hover:text-rose-500 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Signature Accent Color */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-muted-foreground block">
                  Signature Accent Color
                </label>
                <span className="text-[10px] font-mono text-muted-foreground/80 uppercase">
                  {color}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {WORKSPACE_ACCENT_COLORS.map((c) => {
                  const isSelected = color.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>
                  );
                })}

                <label
                  className="h-6 px-2 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-[10px] font-medium text-foreground flex items-center gap-1 cursor-pointer transition-all ml-1"
                  title="Pilih warna custom"
                >
                  <span>Custom</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="asana"
                size="sm"
                disabled={isSubmitting || !name.trim()}
                className="text-xs h-8 px-3 gap-1.5 transition-all text-white"
                style={{ backgroundColor: color }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>Create Workspace</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* TAB 2: GABUNG KE WORKSPACE BERDASARKAN ID / SLUG */}
        {activeTab === "join" && (
          <div className="mt-3.5 space-y-3.5">
            {/* Status jika ada join request PENDING */}
            {joinRequestSent ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">
                      Permintaan Bergabung Menunggu Persetujuan
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Permintaan Anda untuk bergabung ke workspace{" "}
                      <strong className="text-foreground">&ldquo;{joinRequestSent.workspaceName}&rdquo;</strong> telah
                      dikirim ke Admin. Akses akan aktif otomatis begitu disetujui.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Status: PENDING APPROVAL
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelJoinRequest}
                    className="text-xs h-7 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Batalkan Permintaan
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                    Workspace ID atau Slug *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={searchWsQuery}
                        onChange={(e) => setSearchWsQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearchWorkspace();
                          }
                        }}
                        placeholder="Contoh: ws-173829 atau acme-studio"
                        className="h-8 pl-8 text-xs bg-muted/20 font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSearchWorkspace}
                      disabled={!searchWsQuery.trim() || isSearchingWs}
                      className="h-8 px-3 text-xs gap-1 border-border/80"
                    >
                      {isSearchingWs ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3" />
                      )}
                      <span>{isSearchingWs ? "Mencari..." : "Cari"}</span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Minta ID atau Slug workspace dari Admin tim Anda untuk bergabung.
                  </p>
                </div>

                {searchError && (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 flex items-center gap-2 text-xs text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {foundWorkspace && (
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: foundWorkspace.color || "#6366f1" }}
                        >
                          {foundWorkspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {foundWorkspace.name}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            ID: {foundWorkspace.id} • /{foundWorkspace.slug}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                        Ditemukan
                      </span>
                    </div>

                    {foundWorkspace.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {foundWorkspace.description}
                      </p>
                    )}

                    {/* Jika user adalah pemilik atau bisa beralih langsung */}
                    {foundWorkspace.createdBy === currentUser?.id ? (
                      <Button
                        type="button"
                        variant="asana"
                        onClick={() => {
                          if (onJoinedWorkspace) {
                            onJoinedWorkspace(foundWorkspace);
                          }
                          onClose();
                        }}
                        className="w-full h-8 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Beralih ke Workspace Ini</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="asana"
                        onClick={handleSendJoinRequest}
                        disabled={isSendingJoinRequest}
                        className="w-full h-8 text-xs font-medium gap-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                      >
                        {isSendingJoinRequest ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Mengirim Permintaan...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Kirim Permintaan Bergabung ke Admin</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            <DialogFooter className="mt-4 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8 px-3"
              >
                Tutup
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
