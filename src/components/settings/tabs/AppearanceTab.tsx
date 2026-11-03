"use client";

import React, { useState, useEffect } from "react";
import { User, Workspace, WORKSPACE_ACCENT_COLORS } from "@/types";
import { Button } from "@/components/ui/button";
import { toastAlert } from "@/components/ui/alert-toast";
import { useTranslation } from "@/lib/i18n";
import {
  subscribeToPushNotifications,
  triggerWindowsPushNotification,
  getNotificationPermissionState,
} from "@/lib/web-push";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Moon,
  Sun,
  Check,
  Palette,
  Globe,
  Bell,
  Sparkles,
  Loader2,
} from "lucide-react";

interface AppearanceTabProps {
  workspace: Workspace;
  currentUser: User;
  onUpdateWorkspace: (updates: Partial<Workspace>) => void;
  isLoading?: boolean;
}

export function AppearanceTab({
  workspace,
  currentUser,
  onUpdateWorkspace,
  isLoading = false,
}: AppearanceTabProps) {
  const { locale, setLocale, t } = useTranslation();

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "dark";
  });

  const [workspaceColor, setWorkspaceColor] = useState(workspace.color || "#6366f1");

  useEffect(() => {
    setWorkspaceColor(workspace.color || "#6366f1");
  }, [workspace.color]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
  }, []);

  const handleToggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("kinetic_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("kinetic_theme", "light");
    }
  };

  // Windows Push Notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  useEffect(() => {
    setPushPermission(getNotificationPermissionState());
  }, []);

  const handleEnablePush = async () => {
    setIsPushSubscribing(true);
    try {
      const ok = await subscribeToPushNotifications({
        userId: currentUser?.id,
        workspaceId: workspace?.id,
      });
      const state = getNotificationPermissionState();
      setPushPermission(state);
      if (ok) {
        toastAlert({
          title: "Notifikasi Windows Aktif",
          description: "Notifikasi akan muncul di Action Center Windows meskipun tab/browser ditutup.",
        });
      } else {
        toastAlert({
          title: "Izin Notifikasi",
          description: "Izin notifikasi belum diizinkan atau diblokir di browser Anda.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toastAlert({
        title: "Gagal Mengaktifkan",
        description: e?.message || "Terjadi kesalahan saat mengaktifkan push notification.",
        variant: "destructive",
      });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  const handleTestPushNotification = async () => {
    setIsTestingPush(true);
    try {
      toastAlert({
        title: "Mengirim Notifikasi ke Windows...",
        description: "Notifikasi background akan muncul di desktop Windows Anda.",
      });
      const ok = await triggerWindowsPushNotification({
        title: "Kinetic Task Management",
        body: "Halo! Ini adalah notifikasi pengujian Windows yang dikirim melalui Background Web Push.",
      });
      if (!ok) {
        toastAlert({
          title: "Belum Ada Subscriber",
          description: "Klik 'Aktifkan Notifikasi Windows' terlebih dahulu.",
          variant: "destructive",
        });
      }
    } finally {
      setIsTestingPush(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-lg animate-fade-in">
        {/* Theme Mode Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-2.5 w-64 rounded" />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>

        {/* Accent Color Palette Skeleton */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-3.5 w-36 rounded" />
          <Skeleton className="h-2.5 w-56 rounded" />
          <div className="flex gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full" />
            ))}
          </div>
        </div>

        {/* Language Options Skeleton */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-2.5 w-60 rounded" />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        </div>

        {/* Push Notification Skeleton */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-2.5 w-52 rounded" />
            </div>
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-1">
          Theme Mode
        </h4>
        <p className="text-[11px] text-muted-foreground mb-3">
          Pilih gaya visual tampilan aplikasi (Linear dark mode atau light mode).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleToggleTheme("dark")}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-all ${
              theme === "dark"
                ? "border-foreground bg-muted/40 shadow-xs"
                : "border-border/70 hover:border-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Moon className="h-3.5 w-3.5" />
                <span>Dark (Linear Obsidian)</span>
              </div>
              {theme === "dark" && (
                <Check className="h-3.5 w-3.5 text-foreground stroke-[3]" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Monochrome obsidian, zinc text, signal bars, and deep contrast.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleTheme("light")}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-all ${
              theme === "light"
                ? "border-foreground bg-muted/40 shadow-xs"
                : "border-border/70 hover:border-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sun className="h-3.5 w-3.5" />
                <span>Light (Zinc Studio)</span>
              </div>
              {theme === "light" && (
                <Check className="h-3.5 w-3.5 text-foreground stroke-[3]" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Clean hairline borders, crisp typography, and high legibility.
            </p>
          </button>
        </div>
      </div>

      {/* Workspace Accent Color in Appearance */}
      <div className="pt-2 border-t border-border/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Signature Color: {workspace.name}</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Warna tema visual khusus untuk workspace ini.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {workspaceColor}
            </span>
            <div
              className="w-4 h-4 rounded-full border border-border shadow-xs shrink-0"
              style={{ backgroundColor: workspaceColor }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {WORKSPACE_ACCENT_COLORS.map((c) => {
            const isSelected = workspaceColor.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setWorkspaceColor(c.value);
                  onUpdateWorkspace({ color: c.value });
                }}
                title={c.name}
                className={`group relative h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 shadow-sm"
                    : "hover:scale-105 opacity-85 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.value }}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3] drop-shadow-sm" />}
              </button>
            );
          })}

          <div className="relative flex items-center ml-1">
            <label
              className="h-7 px-2.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground flex items-center gap-1.5 cursor-pointer transition-all"
              title="Pilih warna custom"
            >
              <span>Custom</span>
              <input
                type="color"
                value={workspaceColor}
                onChange={(e) => {
                  setWorkspaceColor(e.target.value);
                  onUpdateWorkspace({ color: e.target.value });
                }}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="pt-2 border-t border-border/70 space-y-2.5">
        <div>
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("settings.languageTitle", "Bahasa Antarmuka")}</span>
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {t("settings.languageDesc", "Pilih bahasa tampilan yang Anda inginkan (Indonesia / English).")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setLocale("id")}
            className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
              locale === "id"
                ? "border-foreground bg-muted/40 shadow-xs"
                : "border-border/70 hover:border-foreground/30"
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-foreground">Bahasa Indonesia</div>
              <div className="text-[10px] text-muted-foreground">Default sistem lokal</div>
            </div>
            {locale === "id" && <Check className="h-4 w-4 text-foreground stroke-[3]" />}
          </button>

          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
              locale === "en"
                ? "border-foreground bg-muted/40 shadow-xs"
                : "border-border/70 hover:border-foreground/30"
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-foreground">English (US)</div>
              <div className="text-[10px] text-muted-foreground">International locale</div>
            </div>
            {locale === "en" && <Check className="h-4 w-4 text-foreground stroke-[3]" />}
          </button>
        </div>
      </div>

      {/* Windows Web Push Notifications */}
      <div className="pt-2 border-t border-border/70 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Notifikasi Desktop Windows</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Terima notifikasi task, sebutan (@mention), dan reminder langsung ke OS Windows.
            </p>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              pushPermission === "granted"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                : pushPermission === "denied"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "bg-muted border-border/80 text-muted-foreground"
            }`}
          >
            {pushPermission === "granted"
              ? "Diizinkan (Aktif)"
              : pushPermission === "denied"
              ? "Diblokir Browser"
              : "Belum Diaktifkan"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={pushPermission === "granted" ? "outline" : "asana"}
            onClick={handleEnablePush}
            disabled={isPushSubscribing || isTestingPush}
            className="text-xs h-8 gap-1.5"
          >
            {isPushSubscribing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Bell className="h-3 w-3" />
            )}
            <span>
              {isPushSubscribing
                ? "Memproses..."
                : pushPermission === "granted"
                ? "Perbarui Izin Windows"
                : "Aktifkan Notifikasi Windows"}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isTestingPush || isPushSubscribing}
            onClick={handleTestPushNotification}
            className="text-xs h-8 gap-1.5"
          >
            {isTestingPush ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="h-3 w-3 text-amber-400" />
            )}
            <span>{isTestingPush ? "Mengirim..." : "Kirim Notifikasi Uji Coba"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
