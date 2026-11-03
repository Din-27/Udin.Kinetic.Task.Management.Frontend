"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Presentation,
  GitBranch,
  Kanban,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  Pause,
  X,
  Users,
  Layers,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MarketingSlide {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  highlights: string[];
  ctaText: string;
  targetTab: string;
  previewType: "whiteboard" | "flowchart" | "kanban" | "outlook" | "enterprise";
  gradient: string;
  accentColor: string;
}

const MARKETING_SLIDES: MarketingSlide[] = [
  {
    id: "whiteboard",
    badge: "Fitur Baru • Live Multiplayer",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    title: "Papan Tulis Kolaboratif Streaming",
    subtitle: "Kolaborasi visual real-time secepat kilat dengan kursor multiplayer layaknya Figma",
    description:
      "Curahkan ide, brainstorming sprint, dan gambar arsitektur bersama tim. Dilengkapi fitur live typing indicator, sticky notes warna-warni, serta kolom tanya-jawab komentar langsung di kanvas.",
    icon: Presentation,
    highlights: [
      "Live cursor multiplayer berkecepatan tinggi via Socket.IO",
      "Pen, Eraser, Shapes (Rect, Circle, Diamond) & Sticky Notes",
      "Kolom komentar terintegrasi untuk diskusi dan review tim",
      "Penyimpanan Cloud mandiri dengan ID unik anti-tumpuk",
    ],
    ctaText: "Buka Papan Tulis",
    targetTab: "whiteboard",
    previewType: "whiteboard",
    gradient: "from-emerald-950/40 via-background to-teal-950/20",
    accentColor: "#10b981",
  },
  {
    id: "flowchart",
    badge: "AI Powered • Gemini 3.8 Flash",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    title: "AI Flowchart & Auto-Layout Engine",
    subtitle: "Ubah instruksi teks dan lampiran dokumen menjadi diagram alur profesional secara instan",
    description:
      "Hasilkan diagram alur kerja berstandar ISO 5807 / BPMN dalam hitungan detik. Menggunakan algoritma Sugiyama Hierarchical Auto-Layout agar setiap node tersusun rapi, simetris, dan siap diekspor ke PDF berkualitas tinggi.",
    icon: GitBranch,
    highlights: [
      "Generate diagram otomatis dari prompt dan dokumen via AI",
      "Auto-layout hierarkis pintar: Top-to-Bottom & Left-to-Right",
      "Dukungan Decision, Database ERD, Subproses, & Smart Handles",
      "Shortcut keyboard lengkap: Del untuk hapus, Ctrl+Z, dan export PDF",
    ],
    ctaText: "Coba Flowchart AI",
    targetTab: "flowchart",
    previewType: "flowchart",
    gradient: "from-blue-950/40 via-background to-indigo-950/20",
    accentColor: "#3b82f6",
  },
  {
    id: "kanban",
    badge: "Agile Task Tracker",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    title: "Papan Kanban & Manajemen Sprint",
    subtitle: "Kelola tiket pekerjaan, prioritas tugas, dan deadline proyek dengan responsif",
    description:
      "Pantau progres kerja harian dalam papan Kanban drag-and-drop yang mulus. Sesuaikan kolom tahapan, pantau subtask checklist, dan assign anggota tim dengan transisi responsif di mobile maupun desktop.",
    icon: Kanban,
    highlights: [
      "Drag-and-drop interaktif untuk memindahkan tiket seketika",
      "Kustomisasi kolom board sesuai alur kerja sprint tim",
      "Detail drawer komprehensif: subtasks, lampiran, & prioritas",
      "Desain adaptif: touch-friendly di smartphone & tablet",
    ],
    ctaText: "Jelajahi Papan Kanban",
    targetTab: "board",
    previewType: "kanban",
    gradient: "from-amber-950/40 via-background to-orange-950/20",
    accentColor: "#f59e0b",
  },
  {
    id: "outlook",
    badge: "Smart Automation",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    title: "Integrasi AI Outlook & RAG Document",
    subtitle: "Otomatisasi email masuk menjadi actionable task dan tanya jawab dokumen",
    description:
      "Tautkan akun email kantor dan biarkan kecerdasan buatan menyaring email penting, mengekstrak deadline, dan menyusun task secara otomatis. Didukung fitur RAG untuk riset dokumen proyek.",
    icon: Mail,
    highlights: [
      "Sinkronisasi email Outlook terjadwal otomatis di latar belakang",
      "AI ekstraksi tugas cerdas langsung masuk ke backlog proyek",
      "Tanya AI berbasis RAG dengan referensi dokumen proyek tim",
      "Notifikasi instan Web Push saat task baru dihasilkan",
    ],
    ctaText: "Cek Integrasi",
    targetTab: "integrations",
    previewType: "outlook",
    gradient: "from-purple-950/40 via-background to-violet-950/20",
    accentColor: "#8b5cf6",
  },
  {
    id: "enterprise",
    badge: "Enterprise Ready",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    title: "Ruang Kerja Multi-Tenant & Aman",
    subtitle: "Arsitektur database terisolasi untuk keamanan data dan privasi tim",
    description:
      "Data setiap fitur dipartisi dalam tabel terdedikasi Neon PostgreSQL serverless. Hak akses bertingkat memastikan anggota hanya melihat informasi sesuai perannya, dengan latensi sinkronisasi di bawah 20ms.",
    icon: ShieldCheck,
    highlights: [
      "Multi-workspace dengan isolasi data lengkap per tim",
      "Hak akses granular: Owner, Admin, Member, dan Viewer",
      "Penyimpanan database terdedikasi tanpa risiko data tertukar",
      "Performa kilat dengan state management Zustand & TanStack Query",
    ],
    ctaText: "Mulai Sekarang",
    targetTab: "overview",
    previewType: "enterprise",
    gradient: "from-cyan-950/40 via-background to-sky-950/20",
    accentColor: "#06b6d4",
  },
];

export interface MarketingCarouselProps {
  onSelectTab?: (tab: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  isOpen?: boolean;
}

export function MarketingCarousel({ onSelectTab, onClose, isModal = false, isOpen }: MarketingCarouselProps) {
  // If isOpen is provided explicitly and is false, don't render anything
  if (isOpen !== undefined && !isOpen) {
    return null;
  }

  const isModalMode = isModal || isOpen !== undefined;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = MARKETING_SLIDES[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % MARKETING_SLIDES.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + MARKETING_SLIDES.length) % MARKETING_SLIDES.length);
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, 5500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, handleNext]);

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const handleActionClick = (targetTab: string) => {
    if (onSelectTab) {
      onSelectTab(targetTab);
    }
    if (onClose) {
      onClose();
    }
  };

  const content = (
    <div
      className={`relative w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xl transition-all duration-300 ${
        isModalMode ? "max-w-5xl mx-auto" : "my-4"
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Animated Progress Timer Bar */}
      {isPlaying && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-border/40 z-30 overflow-hidden">
          <div
            key={currentIndex}
            className="h-full transition-all ease-linear"
            style={{
              backgroundColor: currentSlide.accentColor,
              animation: "carousel-progress 5.5s linear infinite",
            }}
          />
        </div>
      )}

      {/* Background ambient gradient glow with pulsating flare */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentSlide.gradient} opacity-90 transition-all duration-700 pointer-events-none`}
      />
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700 animate-pulse"
        style={{ backgroundColor: currentSlide.accentColor }}
      />

      {/* Header controls (Close button if modal + play/pause) */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${currentSlide.badgeColor} backdrop-blur-md`}
          >
            <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
            {currentSlide.badge}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="p-1.5 rounded-lg bg-background/60 hover:bg-background/90 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 border border-border/60 backdrop-blur-md transition-colors"
            title={isPlaying ? "Jeda Otomatis" : "Putar Otomatis"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline text-[11px]">{isPlaying ? "Auto" : "Paused"}</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-background/60 hover:bg-background/90 text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Content: Responsive Grid */}
      <div className="relative z-10 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center min-h-[420px]">
        {/* Left Column: Text & Features (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {currentSlide.title}
            </h2>
            <p className="text-sm sm:text-base font-medium text-emerald-400 dark:text-emerald-300">
              {currentSlide.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
              {currentSlide.description}
            </p>
          </div>

          {/* Highlights checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {currentSlide.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 mt-0.5"
                  style={{ color: currentSlide.accentColor }}
                />
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* Action button */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleActionClick(currentSlide.targetTab)}
              className="h-10 px-5 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              style={{ backgroundColor: currentSlide.accentColor }}
            >
              <span>{currentSlide.ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Slide {currentIndex + 1} dari {MARKETING_SLIDES.length}
            </span>
          </div>
        </div>

        {/* Right Column: Visual Interactive Graphic Mockup (5 cols) */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-[400px] h-[260px] sm:h-[300px] rounded-2xl bg-background/80 backdrop-blur-xl border border-border/80 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
            {/* Mockup Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {currentSlide.previewType}
              </span>
            </div>

            {/* Mockup Dynamic Content */}
            <div className="flex-1 flex items-center justify-center relative p-2">
              {currentSlide.previewType === "whiteboard" && (
                <div className="w-full h-full relative flex flex-col items-center justify-center">
                  {/* Sticky note 1 */}
                  <div className="absolute top-2 left-3 bg-yellow-200/90 text-yellow-950 text-[10px] font-bold p-2.5 rounded-lg shadow-md rotate-[-4deg] max-w-[130px] border border-yellow-300">
                    💡 Sprint Brainstorm: Auto-layout V2
                  </div>
                  {/* Sticky note 2 */}
                  <div className="absolute bottom-4 right-4 bg-emerald-200/90 text-emerald-950 text-[10px] font-bold p-2.5 rounded-lg shadow-md rotate-[3deg] max-w-[140px] border border-emerald-300">
                    ✅ Review Design UI Figma Selesai
                  </div>
                  {/* Simulated multiplayer cursor 1 */}
                  <div className="absolute top-12 right-10 flex items-center gap-1 animate-bounce">
                    <div className="h-3 w-3 bg-indigo-500 rotate-[-45deg] shadow-xs" />
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white shadow-xs">
                      Budi (Lead)
                    </span>
                  </div>
                  {/* Simulated multiplayer cursor 2 */}
                  <div className="absolute bottom-12 left-10 flex items-center gap-1 animate-pulse">
                    <div className="h-3 w-3 bg-rose-500 rotate-[-45deg] shadow-xs" />
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                      Sarah (Design)
                    </span>
                  </div>
                </div>
              )}

              {currentSlide.previewType === "flowchart" && (
                <div className="w-full h-full flex flex-col items-center justify-around py-1">
                  <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-semibold text-emerald-400">
                    START: Input User
                  </div>
                  <div className="h-4 w-0.5 bg-border" />
                  <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-[10px] font-semibold text-blue-400">
                    Proses: AI Gemini Synthesis
                  </div>
                  <div className="h-4 w-0.5 bg-border" />
                  <div className="px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-semibold text-amber-400 rotate-[-1deg]">
                    Validasi & Sugiyama Layout
                  </div>
                </div>
              )}

              {currentSlide.previewType === "kanban" && (
                <div className="w-full h-full grid grid-cols-2 gap-2 py-1">
                  <div className="bg-muted/40 rounded-xl p-2 border border-border/60 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">In Progress (2)</span>
                    <div className="p-1.5 bg-background rounded-lg border border-border text-[9px] font-medium shadow-xs">
                      Redesign Mobile Drawer
                    </div>
                    <div className="p-1.5 bg-background rounded-lg border border-border text-[9px] font-medium shadow-xs">
                      Zustand Global Store
                    </div>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-2 border border-emerald-500/20 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-400">Done (3)</span>
                    <div className="p-1.5 bg-background rounded-lg border border-emerald-500/30 text-[9px] font-medium text-emerald-400 shadow-xs flex items-center justify-between">
                      <span>Prisma Split DB</span>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div className="p-1.5 bg-background rounded-lg border border-emerald-500/30 text-[9px] font-medium text-emerald-400 shadow-xs flex items-center justify-between">
                      <span>Unique ID Refactor</span>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              )}

              {currentSlide.previewType === "outlook" && (
                <div className="w-full h-full flex flex-col justify-center space-y-2">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] font-semibold text-foreground truncate">
                        Re: Final Scope Project Delivery
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        AI mendeteksi 2 to-do baru dari klien
                      </p>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/80 text-[10px] font-medium flex items-center justify-between">
                    <span>⚡ Konversi ke Task Kanban</span>
                    <span className="text-purple-400 font-bold text-[9px]">Otomatis</span>
                  </div>
                </div>
              )}

              {currentSlide.previewType === "enterprise" && (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">Neon Serverless DB</p>
                    <p className="text-[10px] text-cyan-400 font-mono">Isolated Tables &lt;15ms Latency</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mockup Footer metrics pill */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
              <span>v2.4 Production</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation: Slide Indicators and Arrows */}
      <div className="relative z-10 px-4 sm:px-8 py-3.5 border-t border-border/60 bg-background/50 backdrop-blur-md flex items-center justify-between">
        {/* Previous & Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="h-8 w-8 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title="Slide Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="h-8 w-8 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            title="Slide Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dots Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {MARKETING_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2 transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-7 sm:w-8 bg-emerald-500"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              title={slide.title}
            />
          ))}
        </div>

        {/* Feature quick selector */}
        <div className="hidden md:flex items-center gap-2">
          {MARKETING_SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            const isSelected = index === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                  isSelected
                    ? "bg-foreground/10 border-foreground/30 text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title={slide.title}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isModalMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-5xl my-auto animate-in zoom-in-95 duration-200">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
