"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { User, WORKSPACE_ACCENT_COLORS, Workspace } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  FolderKanban,
  Users,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Sparkles,
  Check,
  Plus,
  X,
  Mail,
  Search,
  Clock,
  ShieldCheck,
  AlertCircle,
  Rocket,
  Code,
  Palette,
  Smartphone,
  LayoutGrid,
  Cpu,
  Loader2,
  Command,
} from "lucide-react";
import {
  createJoinRequest,
  JoinRequest,
} from "@/lib/invitation-service";
import { getDefaultAvatar } from "@/lib/utils";
import {
  fetchWorkspaces,
  fetchUserJoinRequests,
  useUpdateJoinRequestMutation,
} from "@/lib/hooks/useWorkspaceQueries";

export interface OnboardingData {
  name: string;
  slug?: string;
  description?: string;
  color: string;
  projectName?: string;
  projectDescription?: string;
  projectIcon?: string;
  projectColor?: string;
  inviteEmails?: string[];
}

interface WorkspaceOnboardingProps {
  currentUser: User;
  onCreateWorkspace: (data: OnboardingData) => void | Promise<void>;
  onLogout: () => void;
  onJoinedWorkspace?: (workspace: Workspace) => void;
}

const PROJECT_ICONS = [
  { name: "FolderKanban", icon: FolderKanban },
  { name: "Rocket", icon: Rocket },
  { name: "Code", icon: Code },
  { name: "Palette", icon: Palette },
  { name: "Smartphone", icon: Smartphone },
  { name: "LayoutGrid", icon: LayoutGrid },
  { name: "Cpu", icon: Cpu },
  { name: "Sparkles", icon: Sparkles },
];

export function WorkspaceOnboarding({
  currentUser,
  onCreateWorkspace,
  onLogout,
  onJoinedWorkspace,
}: WorkspaceOnboardingProps) {
  // Page 1: Workspace Setup (WAJIB)
  // Page 2: Create First Project (BISA DI-SKIP)
  // Page 3: Invite Team (BISA DI-SKIP)
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1);

  // Mode di Halaman 1: "create" (buat baru) atau "join" (gabung yang ada)
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "join">("create");

  // === Form Page 1: Create Workspace ===
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isCustomSlug, setIsCustomSlug] = useState(false);

  // === Form Page 1: Join Workspace by ID / Slug ===
  const [searchWsQuery, setSearchWsQuery] = useState("");
  const [isSearchingWs, setIsSearchingWs] = useState(false);
  const [foundWorkspace, setFoundWorkspace] = useState<Workspace | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [joinRequestSent, setJoinRequestSent] = useState<JoinRequest | null>(null);
  const [isSendingJoinRequest, setIsSendingJoinRequest] = useState(false);

  // === Form Page 2: First Project (Optional) ===
  const [skipProject, setSkipProject] = useState(false);
  const [projectName, setProjectName] = useState("General");
  const [projectDesc, setProjectDesc] = useState("Project utama untuk tracking sprint dan pekerjaan tim");
  const [projectIcon, setProjectIcon] = useState("FolderKanban");
  const [projectColor, setProjectColor] = useState("#6366f1");

  // === Form Page 3: Invite Team (Optional) ===
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasJoinedRef = useRef(false);
  const userExplicitModeRef = useRef<"create" | "join" | null>(null);
  const updateJoinRequestMutation = useUpdateJoinRequestMutation();

  // Helper untuk navigasi saat join request disetujui
  const handleApprovedJoin = useCallback(async (approved: JoinRequest) => {
    if (hasJoinedRef.current || !onJoinedWorkspace) return;
    hasJoinedRef.current = true;

    let targetWs: Workspace | null = null;
    try {
      const wsList = await fetchWorkspaces();
      targetWs = wsList.find((w) => w.id === approved.workspaceId) || null;
    } catch { }

    if (!targetWs) {
      targetWs = {
        id: approved.workspaceId,
        name: approved.workspaceName || "Workspace",
        slug: approved.workspaceId,
        description: "Joined workspace",
        color: "#6366f1",
      };
    }

    onJoinedWorkspace(targetWs);
  }, [onJoinedWorkspace]);

  // 1. Initial check: berjalan HANYA 1 kali saat component dimount
  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email) return;

    let isMounted = true;

    const initialCheck = async () => {
      if (hasJoinedRef.current) return;

      try {
        const requests = await fetchUserJoinRequests(currentUser.id, currentUser.email);

        if (!isMounted || hasJoinedRef.current) return;

        const approved = requests.find((r) => r.status === "APPROVED");
        if (approved) {
          updateJoinRequestMutation.mutate({ requestId: approved.id, status: "CONSUMED" });
          await handleApprovedJoin(approved);
          return;
        }

        const pending = requests.find((r) => r.status === "PENDING");
        if (pending) {
          setJoinRequestSent(pending);
        }
      } catch (err) {
        console.warn("Initial check approval status failed:", err);
      }
    };

    initialCheck();

    return () => {
      isMounted = false;
    };
  }, [currentUser, onJoinedWorkspace, handleApprovedJoin, updateJoinRequestMutation]);

  // 2. Polling: HANYA berjalan jika user sedang menunggu approval (joinRequestSent != null)
  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email) return;
    if (!joinRequestSent) return; // Jangan pernah poll jika tidak ada request pending!

    let isMounted = true;
    let isFetching = false;

    const pollApproval = async () => {
      if (hasJoinedRef.current || isFetching) return;
      if (typeof document !== "undefined" && document.hidden) return; // Hemat saat tab di background

      isFetching = true;
      try {
        const requests = await fetchUserJoinRequests(currentUser.id, currentUser.email);

        if (!isMounted || hasJoinedRef.current) return;

        const approved = requests.find((r) => r.status === "APPROVED");
        if (approved) {
          updateJoinRequestMutation.mutate({ requestId: approved.id, status: "CONSUMED" });
          await handleApprovedJoin(approved);
          return;
        }

        const pending = requests.find((r) => r.status === "PENDING");
        if (pending) {
          setJoinRequestSent(pending);
        } else {
          // Hanya reset jika secara eksplisit ditolak atau dibatalkan dari server
          const isExplicitlyClosed = requests.some(
            (r) =>
              (r.id === joinRequestSent.id || r.workspaceId === joinRequestSent.workspaceId) &&
              (r.status === "REJECTED" || r.status === "CANCELLED")
          );
          if (isExplicitlyClosed) {
            setJoinRequestSent(null);
          }
        }
      } catch (err) {
        console.warn("Polling approval status failed:", err);
      } finally {
        isFetching = false;
      }
    };

    // Polling setiap 4 detik (jauh lebih hemat dari 1.5 detik)
    const interval = setInterval(pollApproval, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser, onJoinedWorkspace, joinRequestSent, handleApprovedJoin, updateJoinRequestMutation]);

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
    if (!foundWorkspace || isSendingJoinRequest) return;

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
    } finally {
      setIsSendingJoinRequest(false);
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
    setInviteEmails(inviteEmails.filter((e) => e !== emailToRemove));
  };

  const handleFinishAll = async () => {
    if (!name.trim()) {
      setCurrentPage(1);
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        color,
        projectName: skipProject ? undefined : projectName.trim() || "General",
        projectDescription: skipProject ? undefined : projectDesc.trim() || undefined,
        projectIcon: skipProject ? undefined : projectIcon,
        projectColor: skipProject ? undefined : projectColor,
        inviteEmails: inviteEmails.length > 0 ? inviteEmails : undefined,
      });
    } catch (err) {
      console.error("Gagal membuat workspace:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background px-4 py-8 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/10 via-background to-background pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Brand & Welcome Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-foreground text-background shadow-sm">
            <Command className="h-5 w-5 text-background" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Selamat Datang, {currentUser.name || "Rekan Kerja"}!
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Lengkapi alur onboarding awal untuk mulai mengelola task dan berkolaborasi bersama tim.
          </p>
        </div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between px-3">
          {[
            { num: 1, label: "Workspace", badge: "Wajib" },
            { num: 2, label: "Project", badge: "Bisa Skip" },
            { num: 3, label: "Undang Tim", badge: "Bisa Skip" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  userExplicitModeRef.current = "create";
                  setCurrentPage(s.num as 1 | 2 | 3);
                }}
                className="group flex flex-col items-center gap-1 cursor-pointer focus:outline-none transition-transform active:scale-95"
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all ${
                    currentPage === s.num
                      ? "bg-foreground text-background shadow-md scale-105"
                      : currentPage > s.num
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                  }`}
                  style={currentPage === s.num ? { backgroundColor: color, color: "#fff" } : {}}
                >
                  {currentPage > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-medium text-foreground block group-hover:underline">
                    {s.label}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border transition-colors ${
                      s.badge === "Wajib"
                        ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                        : "border-border/60 text-muted-foreground bg-muted/30 group-hover:border-foreground/30"
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>
              </button>
              {idx < 2 && (
                <div
                  className={`flex-1 h-0.5 mx-2 -mt-4 rounded-full transition-colors ${currentPage > s.num ? "bg-emerald-500/50" : "bg-muted/80"
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ======================================================== */}
        {/* PAGE 1: WORKSPACE SETUP (WAJIB)                           */}
        {/* ======================================================== */}
        {currentPage === 1 && (
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-5 animate-fade-in">
            {/* Mode Toggle: Create vs Join */}
            <div className="flex rounded-lg border border-border/80 bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => {
                  userExplicitModeRef.current = "create";
                  setWorkspaceMode("create");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${workspaceMode === "create"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Buat Workspace Baru</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  userExplicitModeRef.current = "join";
                  setWorkspaceMode("join");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${workspaceMode === "join"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Gabung Workspace Tim</span>
              </button>
            </div>

            {/* TAB A: CREATE WORKSPACE */}
            {workspaceMode === "create" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/70">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Langkah 1: Setup Workspace Baru (Wajib)
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Sebagai pembuat workspace, Anda otomatis menjadi Administrator (Owner).
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Nama Workspace *
                  </label>
                  <Input
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="misal: Acme Engineering, Studio Digital, Divisi IT"
                    className="h-9 text-xs bg-muted/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Warna Tema Workspace
                  </label>
                  <div className="flex items-center gap-2">
                    {WORKSPACE_ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        title={c.name}
                        className={`h-7 w-7 rounded-full transition-transform flex items-center justify-center ${color === c.value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                          }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {color === c.value && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Workspace URL Identifier
                  </label>
                  <div className="flex items-center rounded-md border border-border/80 bg-muted/20 px-3 py-1.5 text-xs">
                    <span className="text-muted-foreground font-mono text-[11px]">kinetic.app/</span>
                    <input
                      value={slug}
                      onChange={(e) => {
                        setIsCustomSlug(true);
                        setSlug(e.target.value);
                      }}
                      placeholder="acme-engineering"
                      className="bg-transparent font-mono text-foreground focus:outline-none ml-1 flex-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Deskripsi Workspace (Opsional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat mengenai divisi, tim, atau tujuan workspace ini..."
                    rows={2}
                    className="text-xs resize-none bg-muted/20 min-h-[50px]"
                  />
                </div>

                <Button
                  type="button"
                  variant="asana"
                  disabled={!name.trim()}
                  onClick={() => setCurrentPage(2)}
                  className="w-full h-9 text-xs font-medium gap-2 mt-2"
                  style={{ backgroundColor: color }}
                >
                  <span>Lanjut: Setup Proyek Pertama</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* TAB B: JOIN EXISTING WORKSPACE */}
            {workspaceMode === "join" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/70">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Gabung ke Workspace Berdasarkan ID
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Minta ID Workspace kepada Admin tim Anda untuk mengajukan izin bergabung.
                    </p>
                  </div>
                </div>

                {/* Status jika sudah ada permintaan bergabung aktif */}
                {joinRequestSent ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h3 className="text-xs font-semibold text-foreground">
                          Permintaan Bergabung Sedang Menunggu Persetujuan
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Permintaan Anda untuk bergabung ke workspace{" "}
                          <strong className="text-foreground">&ldquo;{joinRequestSent.workspaceName}&rdquo;</strong> telah
                          dikirim ke Administrator workspace. Anda akan mendapatkan akses setelah disetujui.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Status: PENDING ADMIN APPROVAL
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            userExplicitModeRef.current = "create";
                            setWorkspaceMode("create");
                          }}
                          className="text-xs h-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          Atau Buat Workspace Sendiri
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (joinRequestSent) {
                              updateJoinRequestMutation.mutate({ requestId: joinRequestSent.id, status: "CANCELLED" });
                              setJoinRequestSent(null);
                              userExplicitModeRef.current = "create";
                              setWorkspaceMode("create");
                            }
                          }}
                          className="text-xs h-7 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">
                        Workspace ID atau Slug *
                      </label>
                      <div className="flex items-center gap-2">
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
                            placeholder="Contoh: ws-173829 atau acme-engineering"
                            className="h-9 pl-8 text-xs bg-muted/20 font-mono"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSearchWorkspace}
                          disabled={!searchWsQuery.trim() || isSearchingWs}
                          className="h-9 px-3 text-xs gap-1.5"
                        >
                          <Search className="h-3.5 w-3.5" />
                          <span>{isSearchingWs ? "Mencari..." : "Cari"}</span>
                        </Button>
                      </div>
                    </div>

                    {searchError && (
                      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 flex items-center gap-2 text-xs text-rose-500">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{searchError}</span>
                      </div>
                    )}

                    {foundWorkspace && (
                      <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
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
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        Belum memiliki ID workspace tim?{" "}
                        <button
                          type="button"
                          onClick={() => setWorkspaceMode("create")}
                          className="text-foreground underline font-medium hover:text-blue-500"
                        >
                          Buat workspace baru milik Anda sendiri
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="pt-2 text-center border-t border-border/60">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" />
                <span>Keluar / Gunakan akun lain</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 2: CREATE FIRST PROJECT (BISA DI-SKIP)             */}
        {/* ======================================================== */}
        {currentPage === 2 && (
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Langkah 2: Proyek Pertama Anda
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Project digunakan untuk mengelompokkan issue, sprint, dan Kanban board.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground">
                Opsional
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Nama Project
              </label>
              <Input
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="misal: Core Platform 2.0, Web Redesign, Mobile App"
                className="h-9 text-xs bg-muted/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Deskripsi Project (Opsional)
              </label>
              <Textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Target atau milestone utama yang ingin dikerjakan tim di project ini..."
                rows={2}
                className="text-xs resize-none bg-muted/20 min-h-[50px]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Pilih Icon & Warna Project
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {PROJECT_ICONS.map((it) => {
                  const IconComp = it.icon;
                  const isSelected = projectIcon === it.name;
                  return (
                    <button
                      key={it.name}
                      type="button"
                      onClick={() => setProjectIcon(it.name)}
                      className={`h-8 w-8 rounded-md flex items-center justify-center border transition-all ${isSelected
                          ? "border-foreground bg-foreground text-background font-bold shadow-xs"
                          : "border-border/70 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      title={it.name}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {WORKSPACE_ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setProjectColor(c.value)}
                    title={c.name}
                    className={`h-6 w-6 rounded-full transition-transform flex items-center justify-center ${projectColor === c.value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"
                      }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {projectColor === c.value && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentPage(1)}
                className="h-9 px-3 text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSkipProject(true);
                    setCurrentPage(3);
                  }}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Lewati Langkah Ini (Skip)
                </Button>
                <Button
                  type="button"
                  variant="asana"
                  onClick={() => {
                    setSkipProject(false);
                    setCurrentPage(3);
                  }}
                  className="h-9 px-4 text-xs font-medium gap-1.5"
                  style={{ backgroundColor: color }}
                >
                  <span>Lanjut: Undang Tim</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 3: INVITE TEAM MEMBERS (BISA DI-SKIP)              */}
        {/* ======================================================== */}
        {currentPage === 3 && (
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Langkah 3: Ajak Rekan Tim Anda
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Undang anggota tim via email untuk langsung berkolaborasi di workspace ini.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground">
                Opsional
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Email Anggota Tim
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
                    placeholder="nama.rekan@perusahaan.com"
                    className="h-9 pl-8 text-xs bg-muted/20"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEmail}
                  disabled={!inviteEmailInput.trim()}
                  className="h-9 text-xs px-3 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </Button>
              </div>
            </div>

            {inviteEmails.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {inviteEmails.length} undangan akan didaftarkan:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-md border border-border/60 bg-muted/10">
                  {inviteEmails.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-background border border-border/80 text-foreground"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(em)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/80 italic">
                Belum ada email yang ditambahkan. Anda dapat melewati langkah ini dan mengundang anggota nanti melalui menu Settings.
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentPage(2)}
                className="h-9 px-3 text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleFinishAll}
                  disabled={isSubmitting}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Lewati & Selesai (Skip)
                </Button>
                <Button
                  type="button"
                  variant="asana"
                  disabled={isSubmitting}
                  onClick={handleFinishAll}
                  className="h-9 px-4 text-xs font-medium gap-1.5"
                  style={{ backgroundColor: color }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Menyiapkan..." : "Selesai & Masuk ke Board"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
