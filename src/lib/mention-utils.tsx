import React from "react";
import { User } from "@/types";

/**
 * Mencari semua user dari workspace tertentu yang di-mention (@NamaUser) di dalam teks.
 * Hanya mencocokkan user yang benar-benar ada di daftar workspaceUsers.
 */
export function extractMentions(text: string, workspaceUsers: User[]): User[] {
  if (!text || !Array.isArray(workspaceUsers) || workspaceUsers.length === 0) return [];

  const found: User[] = [];
  for (const user of workspaceUsers) {
    if (!user.name) continue;
    // Cari pola @NamaUser (case-insensitive)
    const regex = new RegExp(`@${escapeRegex(user.name)}(\\b|$)`, "i");
    if (regex.test(text)) {
      if (!found.some((u) => u.id === user.id)) {
        found.push(user);
      }
    }
  }
  return found;
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Merender teks komentar atau pesan diskusi dengan highlight khusus untuk @mention.
 * Hanya anggota yang terdaftar di workspace terkait yang akan di-highlight sebagai tag.
 */
export function renderTextWithMentions(
  text: string,
  workspaceUsers: User[] = [],
  currentUserId?: string
): React.ReactNode {
  if (!text) return null;
  if (!Array.isArray(workspaceUsers) || workspaceUsers.length === 0) {
    return text;
  }

  // Bangun regex dari nama-nama user di workspace
  const userNames = workspaceUsers
    .filter((u) => u.name && u.name.trim().length > 0)
    .map((u) => escapeRegex(u.name.trim()));

  if (userNames.length === 0) return text;

  // Pola pencarian: @(NamaUser1|NamaUser2|...)
  const pattern = new RegExp(`(@(${userNames.join("|")}))(?=[\\s.,!?;:]|$)`, "gi");

  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  // Cari match secara sekuensial
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    matches.push(m);
  }

  if (matches.length === 0) return text;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, idx) => {
    const matchIndex = match.index ?? 0;
    // Teks sebelum match
    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    const matchedText = match[0]; // e.g. "@John Doe"
    const matchedName = match[2]; // e.g. "John Doe"

    const foundUser = workspaceUsers.find(
      (u) => u.name.toLowerCase() === matchedName.toLowerCase()
    );

    const isMe =
      Boolean(foundUser && currentUserId && foundUser.id === currentUserId);

    elements.push(
      <span
        key={`mention-${idx}-${matchIndex}`}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium text-[11px] align-baseline transition-colors select-none ${
          isMe
            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-semibold shadow-2xs"
            : "bg-[var(--workspace-accent,#6366f1)]/15 text-[var(--workspace-accent,#6366f1)] border border-[var(--workspace-accent,#6366f1)]/25"
        }`}
        title={
          foundUser
            ? `${foundUser.name} (${foundUser.role || "Member"} di workspace ini)`
            : matchedText
        }
      >
        <span className="opacity-70">@</span>
        <span>{matchedName}</span>
      </span>
    );

    lastIndex = matchIndex + matchedText.length;
  });

  // Sisa teks setelah match terakhir
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return <>{elements}</>;
}
