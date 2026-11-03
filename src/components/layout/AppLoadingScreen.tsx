"use client";

import React from "react";

export function AppLoadingScreen() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background select-none relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/15 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center space-y-6 animate-fade-in">
        {/* Animated logo mark with pulse */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl bg-indigo-500/25 blur-xl animate-pulse" />
          <div className="relative h-14 w-14 rounded-2xl bg-foreground text-background font-mono font-bold text-2xl flex items-center justify-center shadow-2xl border border-border/40">
            ⌘
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-foreground">
            Kinetic
          </h2>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Menyiapkan ruang kerja & memuat data...</span>
          </p>
        </div>

        {/* Animated progressive bar */}
        <div className="w-48 h-1 rounded-full bg-muted/50 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
