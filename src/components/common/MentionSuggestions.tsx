"use client";

import React, { useEffect, useRef } from "react";
import { User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Users, Shield, AtSign } from "lucide-react";

interface MentionSuggestionsProps {
  users: User[];
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  onSelectUser: (user: User) => void;
  onClose: () => void;
  workspaceName?: string;
}

export function MentionSuggestions({
  users,
  isOpen,
  query,
  selectedIndex,
  onSelectUser,
  onClose,
  workspaceName,
}: MentionSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter hanya anggota workspace yang namanya atau emailnya cocok dengan query
  const filteredUsers = React.useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q))
    );
  }, [users, query]);

  // Pastikan item yang terseleksi terlihat saat navigasi keyboard
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const items = containerRef.current.querySelectorAll("[data-mention-item]");
    const active = items[selectedIndex] as HTMLElement | undefined;
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-32px)] max-h-56 overflow-y-auto rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl p-1.5 z-50 animate-fade-in select-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
        <span className="flex items-center gap-1.5 truncate">
          <AtSign className="h-3 w-3 text-[var(--workspace-accent,#6366f1)]" />
          <span>Tag Anggota Workspace</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted font-mono">
          {filteredUsers.length} anggota
        </span>
      </div>

      {/* User list */}
      {filteredUsers.length === 0 ? (
        <div className="px-3 py-3 text-center text-[11px] text-muted-foreground/70 italic">
          Tidak ada anggota workspace yang cocok &quot;{query}&quot;
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredUsers.map((user, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={user.id}
                type="button"
                data-mention-item
                onMouseDown={(e) => {
                  e.preventDefault(); // Mencegah input kehilangan fokus
                  onSelectUser(user);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-[var(--workspace-accent,#6366f1)] text-white shadow-2xs"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Avatar
                  src={user.avatar}
                  fallback={user.name}
                  size="sm"
                  className={`h-6 w-6 text-[10px] shrink-0 ring-1 ${
                    isSelected ? "ring-white/40" : "ring-border"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium truncate">{user.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono shrink-0 uppercase tracking-wider ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : user.role === "ADMIN"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border/50"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  {user.email && (
                    <p
                      className={`text-[10px] truncate ${
                        isSelected ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {user.email}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tip footer */}
      <div className="px-2 pt-1.5 mt-1 border-t border-border/40 text-[9px] text-muted-foreground/60 flex items-center justify-between">
        <span>Tekan Enter atau Tab untuk memilih</span>
        <span>Esc untuk tutup</span>
      </div>
    </div>
  );
}
