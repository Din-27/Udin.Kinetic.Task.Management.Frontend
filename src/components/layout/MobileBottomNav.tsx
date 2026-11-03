"use client";

import React from "react";
import {
  FolderKanban,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Workflow,
  Presentation,
  Plus,
} from "lucide-react";

interface MobileBottomNavProps {
  currentNav: "all-issues" | "project" | "my-tasks" | "chat" | "ai-assistant" | "flowchart" | "whiteboard";
  onSelectNav: (nav: "all-issues" | "project" | "my-tasks" | "chat" | "ai-assistant" | "flowchart" | "whiteboard") => void;
  myTasksCount?: number;
  teamChatUnreadCount?: number;
  onOpenCreateTask?: () => void;
  isReadOnly?: boolean;
}

export function MobileBottomNav({
  currentNav,
  onSelectNav,
  myTasksCount = 0,
  teamChatUnreadCount = 0,
  onOpenCreateTask,
  isReadOnly = false,
}: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom select-none">
      {/* 1. Project / Board */}
      <button
        type="button"
        onClick={() => onSelectNav("project")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
          currentNav === "project" || currentNav === "all-issues"
            ? "text-primary font-semibold scale-105"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <FolderKanban className="h-4.5 w-4.5" />
        <span className="text-[10px] mt-0.5 tracking-tight">Project</span>
      </button>

      {/* 2. My Tasks */}
      <button
        type="button"
        onClick={() => onSelectNav("my-tasks")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 relative cursor-pointer ${
          currentNav === "my-tasks"
            ? "text-primary font-semibold scale-105"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <CheckCircle2 className="h-4.5 w-4.5" />
          {myTasksCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {myTasksCount > 99 ? "99+" : myTasksCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Tugas Saya</span>
      </button>

      {/* 3. Center Quick Add Button (If not read-only) */}
      {!isReadOnly && onOpenCreateTask && (
        <button
          type="button"
          onClick={onOpenCreateTask}
          className="h-10 w-10 -mt-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-background active:scale-95 transition-transform cursor-pointer"
          title="Tambah Task Baru"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {/* 4. Team Chat */}
      <button
        type="button"
        onClick={() => onSelectNav("chat")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 relative cursor-pointer ${
          currentNav === "chat"
            ? "text-primary font-semibold scale-105"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <MessageSquare className="h-4.5 w-4.5" />
          {teamChatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {teamChatUnreadCount > 99 ? "99+" : teamChatUnreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Chat</span>
      </button>

      {/* 5. Tanya AI Assistant */}
      <button
        type="button"
        onClick={() => onSelectNav("ai-assistant")}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
          currentNav === "ai-assistant"
            ? "text-primary font-semibold scale-105"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="h-4.5 w-4.5" />
        <span className="text-[10px] mt-0.5 tracking-tight">Tanya AI</span>
      </button>
    </nav>
  );
}
