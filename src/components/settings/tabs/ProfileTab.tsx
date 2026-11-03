"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastAlert } from "@/components/ui/alert-toast";
import { RoleBadge } from "../RoleBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { Mail, RefreshCw, Check, Loader2 } from "lucide-react";

interface ProfileTabProps {
  currentUser: User;
  onUpdateCurrentUser: (updates: Partial<User>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ProfileTab({
  currentUser,
  onUpdateCurrentUser,
  onClose,
  isLoading = false,
}: ProfileTabProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const getInitialAvatarUrl = (rawAvatar?: string | null) => {
    if (!rawAvatar) return "";
    if (rawAvatar.startsWith("data:image/svg+xml")) return "";
    return rawAvatar;
  };

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [title, setTitle] = useState(currentUser.title || "");
  const [avatar, setAvatar] = useState(getInitialAvatarUrl(currentUser.avatar));
  const [profileSaved, setProfileSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingOAuth, setIsSyncingOAuth] = useState(false);

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setTitle(currentUser.title || "");
    setAvatar(getInitialAvatarUrl(currentUser.avatar));
  }, [currentUser]);

  const userImage = session?.user?.image || currentUser?.avatar || "";
  const isGoogleImage = typeof userImage === "string" && userImage.includes("googleusercontent.com");

  const authProvider = (
    (session?.user as any)?.provider ||
    (session as any)?.provider ||
    (isGoogleImage ? "google" : "")
  ).toLowerCase();

  const isGoogle =
    authProvider === "google" ||
    authProvider === "google-mock" ||
    isGoogleImage;

  const isOutlook =
    authProvider === "azure-ad" ||
    authProvider === "azure-ad-mock";

  const isOAuth = isGoogle || isOutlook;

  const handleSyncFromOAuth = async () => {
    if (!session?.user || !isOAuth) {
      toastAlert({
        title: "Bukan Akun OAuth",
        description: "Fitur ini hanya untuk akun yang terhubung via Google atau Microsoft / Outlook.",
        variant: "warning",
      });
      return;
    }

    setIsSyncingOAuth(true);
    try {
      const oauthName = session.user.name || name;
      const oauthEmail = session.user.email || email;
      const rawOauthAvatar = session.user.image || "";
      const oauthAvatar = rawOauthAvatar.startsWith("data:image/svg+xml") ? "" : rawOauthAvatar;

      setName(oauthName);
      setEmail(oauthEmail);
      setAvatar(oauthAvatar);

      await Promise.resolve(
        onUpdateCurrentUser({
          name: oauthName,
          email: oauthEmail,
          avatar: oauthAvatar,
        })
      );

      toastAlert({
        title: "Profil Disinkronkan",
        description: `Data profil (nama & foto avatar) berhasil diperbarui dari ${isOutlook ? "Outlook" : "Google"}.`,
        variant: "success",
      });
    } finally {
      setIsSyncingOAuth(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanAvatar = avatar.trim();
      await Promise.resolve(
        onUpdateCurrentUser({
          name: name.trim() || currentUser.name,
          email: email.trim() || currentUser.email,
          title: title.trim() || currentUser.title,
          avatar: cleanAvatar,
        })
      );
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-lg animate-fade-in">
        {/* Avatar & Info Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>

        {/* OAuth / Account Card Skeleton */}
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-2.5 w-44 rounded" />
            </div>
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>

        {/* Input Fields Skeleton */}
        <div className="space-y-3.5 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
      <div className="flex items-center gap-4">
        <Avatar
          src={avatar.trim() ? avatar.trim() : null}
          fallback={name.trim() || currentUser.name}
          size="lg"
          className="h-16 w-16 text-lg ring-2 ring-border font-bold shadow-xs"
        />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            {name || currentUser.name}
          </h4>
          <div className="flex items-center gap-2">
            <RoleBadge role={currentUser.role} />
            <span className="text-xs text-muted-foreground">
              {currentUser.title || "Team Member"}
            </span>
          </div>
        </div>
      </div>

      {session?.user && (
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-md bg-background border border-border/80 flex items-center justify-center shrink-0">
              {isOutlook ? (
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 21 21">
                  <path d="M1 1h9v9H1z" fill="#f25022" />
                  <path d="M11 1h9v9h-9z" fill="#7fba00" />
                  <path d="M1 11h9v9H1z" fill="#00a4ef" />
                  <path d="M11 11h9v9h-9z" fill="#ffb900" />
                </svg>
              ) : isGoogle ? (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              ) : (
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
            <div className="truncate">
              <div className="font-medium text-foreground">
                {isOutlook
                  ? "Akun Microsoft / Outlook Terhubung"
                  : isGoogle
                  ? "Akun Google Terhubung"
                  : "Akun Email & Password"}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground truncate">
                {session.user.email}
              </div>
            </div>
          </div>
          {isOAuth ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSyncingOAuth || isSaving}
              onClick={handleSyncFromOAuth}
              className="h-7 text-[11px] gap-1.5 shrink-0"
            >
              {isSyncingOAuth ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-foreground" />
                  <span>Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>Sinkronkan Profil</span>
                </>
              )}
            </Button>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/60 shrink-0">
              Login Kredensial
            </span>
          )}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Full Name
          </label>
          <Input
            value={name}
            disabled={isSaving}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-8 text-xs bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Email Address
          </label>
          <Input
            type="email"
            value={email}
            disabled={isSaving}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="h-8 text-xs bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Job Title / Role Display
          </label>
          <Input
            value={title}
            disabled={isSaving}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lead Frontend Engineer"
            className="h-8 text-xs bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">
              Avatar URL
            </label>
            {avatar.trim() && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setAvatar("")}
                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer disabled:opacity-50"
              >
                Gunakan Inisial Nama
              </button>
            )}
          </div>
          <Input
            value={avatar}
            disabled={isSaving}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://images.unsplash.com/... (Kosongkan untuk inisial nama)"
            className="h-8 text-xs bg-transparent font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            {avatar.trim()
              ? "Foto profil menampilkan gambar dari URL di atas."
              : "Avatar URL kosong: foto profil otomatis menampilkan inisial nama."}
          </p>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSaving || isSyncingOAuth}
          variant="asana"
          size="sm"
          className="h-8 text-xs px-4"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Menyimpan...
            </>
          ) : profileSaved ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
              {t("settings.savedSuccess", "Saved Successfully")}
            </>
          ) : (
            t("settings.saveProfile", "Save Profile")
          )}
        </Button>
      </div>
    </form>
  );
}
