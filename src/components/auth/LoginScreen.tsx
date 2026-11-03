"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles, Building } from "lucide-react";
import { WorkspaceInvitation } from "@/lib/invitation-service";
import { getDefaultAvatar } from "@/lib/utils";

interface LoginScreenProps {
  onLogin: (user: User, isNewUser?: boolean) => void;
  availableUsers: User[];
  pendingInvitation?: WorkspaceInvitation | null;
  onBackToHome?: () => void;
}

export function LoginScreen({ onLogin, availableUsers, pendingInvitation, onBackToHome }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(pendingInvitation?.name || "");
  const [email, setEmail] = useState(pendingInvitation?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (pendingInvitation) {
      if (pendingInvitation.email) setEmail(pendingInvitation.email);
      if (pendingInvitation.name) setName(pendingInvitation.name);
    }
  }, [pendingInvitation]);

  const hasAzureAd = Boolean(
    process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ||
    process.env.NEXT_PUBLIC_HAS_AZURE_AD === "true"
  );
  const hasGoogle = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_HAS_GOOGLE === "true"
  );

  const handleOutlookSignIn = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kinetic_logged_out");
    }
    if (hasAzureAd) {
      signIn("azure-ad");
    } else {
      const mockEmail = pendingInvitation?.email || "budi.pratama@outlook.com";
      const mockName = pendingInvitation?.name || "Budi Pratama (Outlook Dev)";
      signIn("azure-ad-mock", {
        email: mockEmail,
        name: mockName,
      });
    }
  };

  const handleGoogleSignIn = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kinetic_logged_out");
    }
    if (hasGoogle) {
      signIn("google");
    } else {
      const mockEmail = pendingInvitation?.email || "budi.pratama@gmail.com";
      const mockName = pendingInvitation?.name || "Budi Pratama (Google Dev)";
      signIn("google-mock", {
        email: mockEmail,
        name: mockName,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kinetic_logged_out");
    }
    setError(null);
    if (!email.trim()) return;

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const resolvedName = name.trim() || cleanEmail.split("@")[0] || "User";

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        name: resolvedName,
        redirect: false,
      });

      if (result?.error) {
        setError("Gagal memverifikasi sesi. Silakan coba kembali.");
        setIsLoading(false);
        return;
      }

      const existing = availableUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      const targetUser: User = existing || {
        id: `usr-${Date.now()}`,
        name: resolvedName,
        email: cleanEmail,
        avatar: getDefaultAvatar(resolvedName, cleanEmail),
        role: "ADMIN",
        title: mode === "register" ? "Workspace Creator" : "Team Member",
      };

      onLogin(targetUser, mode === "register" || !existing);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background px-4 py-8 select-none">
      {/* Background Subtle Gradient & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/10 via-background to-background pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          {onBackToHome && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={onBackToHome}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                ← Kembali ke Beranda
              </button>
            </div>
          )}
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-foreground text-background font-mono font-bold text-base shadow-sm">
            ⌘
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Sign in to Kinetic
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Masuk ke akun workspace tim Anda menggunakan email dan password terdaftar.
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
          {pendingInvitation && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3.5 space-y-2 text-xs animate-fade-in">
              <div className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-500 animate-pulse" />
                <span>Undangan Bergabung Workspace</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Anda diundang oleh <strong className="text-foreground">{pendingInvitation.invitedBy.name}</strong> untuk bergabung ke workspace <strong className="text-foreground">{pendingInvitation.workspaceName}</strong> dengan role <strong className="text-foreground">{pendingInvitation.role}</strong>.
              </p>
              <div className="rounded border border-indigo-500/20 bg-background/60 p-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Email Tujuan: <strong className="text-foreground">{pendingInvitation.email}</strong></span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">{pendingInvitation.role}</span>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                <span>Silakan masuk atau buat akun menggunakan email Anda untuk langsung bergabung ke workspace.</span>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth SSO Buttons: Google (Gmail) & Microsoft (Outlook) */}
          {(hasGoogle || hasAzureAd) && (
            <div className="space-y-2">
              {/* Google / Gmail Login Button */}
              {hasGoogle && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg border border-border/90 bg-background hover:bg-muted/50 active:bg-muted text-foreground font-medium text-xs shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk dengan Google (Gmail)</span>
                </button>
              )}

              {/* Microsoft / Outlook Login Button */}
              {hasAzureAd && (
                <button
                  type="button"
                  onClick={handleOutlookSignIn}
                  className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg bg-[#0078d4] hover:bg-[#006abc] active:bg-[#005a9e] text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 21 21">
                    <path d="M1 1h9v9H1z" fill="#f25022" />
                    <path d="M11 1h9v9h-9z" fill="#7fba00" />
                    <path d="M1 11h9v9H1z" fill="#00a4ef" />
                    <path d="M11 11h9v9h-9z" fill="#ffb900" />
                  </svg>
                  <span>Masuk dengan Outlook / Microsoft</span>
                </button>
              )}
            </div>
          )}

          {(hasGoogle || hasAzureAd) && (
            <div className="relative flex items-center justify-center py-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                atau dengan email manual
              </span>
            </div>
          )}

          <div className="flex rounded-lg bg-muted/30 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${mode === "login"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Masuk (User Terdaftar)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${mode === "register"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Daftar (User Baru)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Nama Lengkap
                </label>
                <Input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="h-9 text-xs bg-muted/20"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Email Kantor
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="nama@perusahaan.com"
                  className="h-9 pl-9 text-xs bg-muted/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="h-9 pl-9 text-xs bg-muted/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="asana"
              disabled={isLoading}
              className="w-full h-9 text-xs font-medium gap-1.5 mt-2"
            >
              <span>
                {isLoading
                  ? "Memproses..."
                  : mode === "register"
                    ? "Daftar & Buat Workspace"
                    : "Masuk ke Workspace"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center font-mono text-[10px] text-muted-foreground/60">
          Kinetic Engineering Workspaces
        </p>
      </div>
    </div>
  );
}
