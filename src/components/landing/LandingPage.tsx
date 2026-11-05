"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  GitBranch,
  Presentation,
  Kanban,
  Mail,
  ShieldCheck,
  Zap,
  Star,
  ChevronRight,
  Layers,
  Lock,
  Globe,
  Compass,
  Sun,
  Moon,
  Menu,
  X,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingCarousel } from "@/components/marketing/MarketingCarousel";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [selectedFeatureTab, setSelectedFeatureTab] = useState<string>("whiteboard");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("kinetic_theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const scrollToFeatures = () => {
    const el = document.getElementById("features-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-indigo-500/30 selection:text-indigo-400 overflow-x-hidden transition-colors duration-200">
      {/* Clean Ambient Background Glow Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[650px] -left-48 w-[650px] h-[550px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[1400px] -right-48 w-[700px] h-[600px] bg-sky-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 blur opacity-70" />
              <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-foreground text-background flex items-center justify-center shadow-md">
                <Command className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight font-mono text-foreground flex items-center gap-1.5">
                Kinetic
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-sans font-medium">
                  v2.5
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium hidden xl:inline truncate">
                Modern Task & Intelligence Workspace
              </span>
            </div>
          </div>

          {/* Quick Anchor Links (Desktop: hanya muncul di lg ke atas untuk mencegah tumpang tindih di tablet/mobile) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
            <button
              onClick={scrollToFeatures}
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Fitur Unggulan
            </button>
            <a
              href="#whiteboard"
              onClick={(e) => {
                e.preventDefault();
                scrollToFeatures();
                setSelectedFeatureTab("whiteboard");
              }}
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Papan Tulis
            </a>
            <a
              href="#flowchart"
              onClick={(e) => {
                e.preventDefault();
                scrollToFeatures();
                setSelectedFeatureTab("flowchart");
              }}
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              AI Flowchart
            </a>
            <a
              href="#kanban"
              onClick={(e) => {
                e.preventDefault();
                scrollToFeatures();
                setSelectedFeatureTab("kanban");
              }}
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Kanban Board
            </a>
            <a
              href="#outlook"
              onClick={(e) => {
                e.preventDefault();
                scrollToFeatures();
                setSelectedFeatureTab("outlook");
              }}
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Outlook Sync
            </a>
          </nav>

          {/* Action CTA Buttons & Theme Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle Button (Terang / Gelap) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/80 shrink-0"
              title={theme === "dark" ? "Ganti ke Tema Terang (Light Mode)" : "Ganti ke Tema Gelap (Dark Mode)"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500 hover:-rotate-12 transition-transform" />
              )}
            </button>

            <Button
              variant="ghost"
              onClick={onLogin}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-semibold rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/60 shrink-0"
            >
              Masuk
            </Button>
            <Button
              onClick={onGetStarted}
              className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 sm:gap-1.5 shrink-0"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>

            {/* Mobile Menu Toggle Button (Layar Tablet & Mobile: < lg) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/80 shrink-0"
              aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              title="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-2xl px-4 py-3 space-y-2 shadow-2xl transition-all">
            <div className="flex flex-col space-y-0.5 text-xs font-medium text-muted-foreground">
              <button
                onClick={() => {
                  scrollToFeatures();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 text-left transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Fitur Unggulan</span>
              </button>
              <a
                href="#whiteboard"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToFeatures();
                  setSelectedFeatureTab("whiteboard");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 text-left transition-colors"
              >
                <Presentation className="h-3.5 w-3.5 text-emerald-400" />
                <span>Papan Tulis Kolaboratif</span>
              </a>
              <a
                href="#flowchart"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToFeatures();
                  setSelectedFeatureTab("flowchart");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 text-left transition-colors"
              >
                <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI Flowchart Architect</span>
              </a>
              <a
                href="#kanban"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToFeatures();
                  setSelectedFeatureTab("kanban");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 text-left transition-colors"
              >
                <Kanban className="h-3.5 w-3.5 text-amber-400" />
                <span>Agile Kanban Board</span>
              </a>
              <a
                href="#outlook"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToFeatures();
                  setSelectedFeatureTab("outlook");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 text-left transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-sky-400" />
                <span>Outlook Smart Sync</span>
              </a>
            </div>

            <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogin();
                }}
                className="w-full h-8 text-xs font-semibold rounded-xl"
              >
                Masuk ke Akun
              </Button>
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="w-full h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
              >
                <span>Mulai Sekarang (Get Started)</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Landing Page Content */}
      <main className="relative z-10 flex flex-col items-center">
        {/* HERO SECTION */}
        <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 flex flex-col items-center text-center">
          <div className="flex flex-col items-center">
            {/* Release Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium backdrop-blur-md mb-6 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Platform Kolaborasi & Manajemen Tugas Generasi Baru</span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span className="text-foreground/90 font-semibold">AI Powered</span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground max-w-4xl leading-[1.15]">
              Satu Ruang Kerja untuk{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Semua Ide, Diagram AI,
              </span>{" "}
              dan Eksekusi Tim Anda.
            </h1>

            {/* Hero Subtitle */}
            <p className="mt-5 text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Kinetic menggabungkan <strong>Papan Tulis Real-time</strong>, <strong>AI Flowchart Architect</strong>,{" "}
              <strong>Agile Kanban Board</strong>, dan <strong>Outlook Smart Sync</strong> dalam satu platform kerja
              super cepat tanpa batasan.
            </p>

            {/* Hero CTA Group */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="w-full sm:w-auto h-12 px-7 text-sm font-bold rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={scrollToFeatures}
                className="w-full sm:w-auto h-12 px-6 text-sm font-semibold rounded-2xl border-border/80 bg-background/50 hover:bg-muted/40 backdrop-blur-sm flex items-center justify-center gap-2"
              >
                <Compass className="h-4 w-4 text-indigo-400" />
                <span>Jelajahi Semua Fitur</span>
              </Button>
            </div>

            {/* Trust badges & Highlights */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Gratis Digunakan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Multiplayer Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Integrasi Google Gemini AI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Dukungan Mobile & Desktop</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CAROUSEL MARKETING SECTION */}
        <section id="features-section" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              Live Showcase
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Jelajahi Fitur Unggulan Kinetic
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
              Geser slide atau gunakan tombol navigasi untuk melihat kemampuan setiap fitur secara langsung.
            </p>
          </div>

          {/* Core Interactive Carousel with rich animations */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-emerald-500/20 blur-xl opacity-60 pointer-events-none" />
            <MarketingCarousel
              onSelectTab={(tab) => {
                // If user clicks CTA on carousel, guide to Get Started
                onGetStarted();
              }}
            />
          </div>
        </section>

        {/* COMPREHENSIVE FEATURE GRID (DEEP DIVE) */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Ecosystem
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Semua yang Dibutuhkan Tim Modern
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tidak perlu berpindah-pindah aplikasi. Dari brainstorming awal hingga eksekusi tugas akhir berada dalam satu tempat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Whiteboard */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Presentation className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Papan Tulis Streaming Realtime
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gambar bebas dengan live streaming Socket.IO. Kursor rekan satu tim bergerak langsung di layar dengan label nama dan warna berbeda, lengkap dengan kolom komentar diskusi.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span>Multiplayer Canvas</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 2: AI Flowchart */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GitBranch className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                AI Flowchart Architect
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tulis deskripsi alur kerja atau prompt proses bisnis Anda, dan Google Gemini AI secara otomatis merancang struktur nodes, layout hierarkis Sugiyama, dan label panah cerdas.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                <span>Sugiyama Auto-Layout</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 3: Kanban Board */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Kanban className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Agile Kanban & Sprint Board
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kelola tiket isu dengan kolom status yang fleksibel, estimasi waktu, prioritas otomatis, checklist subtasks, filter assignee, dan tampilan List maupun Board.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                <span>Drag & Drop Tracking</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 4: Outlook Sync */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Outlook & AI Mail Backlog
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sinkronisasikan email Outlook Microsoft 365 secara aman. AI secara cerdas menyaring pesan penting dan mengubah instruksi email menjadi tiket tugas tim secara otomatis.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span>Microsoft 365 Bridge</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 5: Security & Multi-Workspace */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Enterprise RBAC & Multi-Tenant
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pisahkan proyek antar divisi dengan workspace terisolasi. Atur hak akses Admin, Member, atau Viewer (read-only) dengan sistem token undangan yang aman.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                <span>Data Isolation</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Feature 6: State & Realtime Power */}
            <div className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/10 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Zustand & TanStack Performance
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Arsitektur frontend modern didukung Zustand state management dan TanStack React Query untuk kecepatan response instan, caching cerdas, dan offline fallback.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <span>High Performance</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CALL TO ACTION */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-card to-violet-950/40 p-8 sm:p-12 text-center overflow-hidden shadow-2xl">
            {/* Ambient light inside banner */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Siap Mentransformasi Produktivitas Tim Anda?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Bergabunglah sekarang dan rasakan pengalaman kerja kolaboratif yang terpadu dengan kecerdasan buatan.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={onGetStarted}
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 text-sm font-bold rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>Mulai Sekarang Gratis</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={onLogin}
                  className="w-full sm:w-auto h-12 px-6 text-sm font-semibold rounded-2xl hover:bg-muted/40"
                >
                  Sudah punya akun? Masuk
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-border/60 bg-card/40 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-mono">
            <span className="flex items-center gap-1.5"><Command className="h-3.5 w-3.5" /> Kinetic Task Management Monolith</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Sistem Aktif 100% Uptime
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={scrollToFeatures} className="hover:text-foreground transition-colors">
              Fitur
            </button>
            <button onClick={onLogin} className="hover:text-foreground transition-colors">
              Masuk
            </button>
            <button onClick={onGetStarted} className="hover:text-foreground transition-colors">
              Daftar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
