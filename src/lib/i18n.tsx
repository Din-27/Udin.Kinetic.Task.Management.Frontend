"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Locale = "id" | "en";

export const translations = {
  id: {
    // Navigation
    "nav.allIssues": "Semua Task",
    "nav.myIssues": "Task Saya",
    "nav.teamDiscussions": "Diskusi Tim",
    "nav.projects": "Project",
    "nav.addProject": "Tambah Project",
    "nav.settings": "Pengaturan",
    "nav.logout": "Keluar",
    "nav.signedInAs": "Masuk sebagai",

    // Tabs
    "tabs.board": "Board",
    "tabs.list": "List",
    "tabs.chat": "Chat Tim",
    "tabs.overview": "Overview",

    // Status
    "status.backlog": "Backlog",
    "status.todo": "Perlu Dikerjakan",
    "status.inProgress": "Sedang Dikerjakan",
    "status.inReview": "Sedang Ditinjau",
    "status.done": "Selesai",

    // Priority
    "priority.urgent": "Mendesak",
    "priority.high": "Tinggi",
    "priority.medium": "Sedang",
    "priority.low": "Rendah",

    // Common Actions
    "common.save": "Simpan",
    "common.saved": "Tersimpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.create": "Buat",
    "common.search": "Cari task...",
    "common.newTask": "Task Baru",
    "common.language": "Bahasa",
    "common.indonesian": "Bahasa Indonesia",
    "common.english": "English",
    "common.selectLanguage": "Pilih Bahasa",

    // Settings
    "settings.title": "Pengaturan",
    "settings.myProfile": "Profil Saya",
    "settings.members": "Anggota & Hak Akses",
    "settings.workspace": "Workspace",
    "settings.appearance": "Tampilan & Bahasa",
    "settings.outlookSync": "Outlook & AI Sync",
    "settings.database": "Database Neon",
    "settings.shortcuts": "Pintasan Keyboard",
    "settings.themeMode": "Mode Tema",
    "settings.themeDark": "Mode Gelap (Dark)",
    "settings.themeLight": "Mode Terang (Light)",
    "settings.languageTitle": "Bahasa Antarmuka",
    "settings.languageDesc": "Pilih bahasa tampilan yang Anda inginkan (Indonesia / English).",
    "settings.accountSession": "Akun & Sesi",
    "settings.logoutDescription": "Keluar dari sesi saat ini pada perangkat ini.",
    "settings.logout": "Keluar dari Akun (Logout)",
    "settings.fullName": "Nama Lengkap",
    "settings.email": "Email",
    "settings.jobTitle": "Jabatan / Title",
    "settings.avatarUrl": "URL Avatar",
    "settings.saveProfile": "Simpan Profil",
    "settings.savedSuccess": "Berhasil Disimpan",

    // Task Details
    "task.markComplete": "Tandai Selesai",
    "task.completed": "Selesai",
    "task.active": "Aktif",
    "task.readOnly": "Read Only",
    "task.titleLabel": "Judul Issue",
    "task.titlePlaceholder": "Tuliskan judul issue...",
    "task.properties": "Properti & Atribut",
    "task.status": "Status",
    "task.priority": "Prioritas",
    "task.assignee": "Penanggung Jawab",
    "task.unassigned": "Belum Ditugaskan",
    "task.dueDate": "Tenggat Waktu",
    "task.selectDate": "Pilih tanggal",
    "task.visibility": "Visibilitas Akses",
    "task.visibilityPublic": "Publik (Semua tim workspace)",
    "task.visibilityPrivate": "Privat (Kolaborator & Admin)",
    "task.tags": "Tags & Label",
    "task.addTag": "Tambah Tag",
    "task.noTags": "Belum ada tag yang disematkan",
    "task.tagPlaceholder": "Ketik nama tag lalu Enter...",
    "task.suggestions": "Saran",
    "task.collaborators": "Kolaborator",
    "task.addCollaborator": "Tambah Kolaborator",
    "task.noCollaborators": "Belum ada kolaborator tambahan",
    "task.selectMember": "Pilih Anggota Tim Workspace:",
    "task.description": "Deskripsi & Konteks",
    "task.descriptionPlaceholder": "Tambahkan detail konteks, spesifikasi teknis, atau catatan penting...",
    "task.noDescription": "Belum ada deskripsi yang ditambahkan untuk issue ini.",
    "task.autoSaveNotice": "Auto-save saat selesai mengetik",
    "task.subtasks": "Checklist Sub-issues",
    "task.addSubtaskPlaceholder": "Tambah item checklist baru...",
    "task.noSubtasks": "Belum ada sub-issue. Buat daftar checklist pekerjaan di bawah.",
    "task.comments": "Komentar & Diskusi",
    "task.activity": "Riwayat Log",
    "task.noActivity": "Belum ada riwayat aktivitas tercatat.",
    "task.deleteTitle": "Hapus Issue",
    "task.deleteConfirm": "Tindakan ini tidak dapat dibatalkan. Issue ini beserta seluruh checklist sub-issue dan riwayat diskusi akan dihapus secara permanen dari workspace.",
  },
  en: {
    // Navigation
    "nav.allIssues": "All Issues",
    "nav.myIssues": "My Issues",
    "nav.teamDiscussions": "Team Discussions",
    "nav.projects": "Projects",
    "nav.addProject": "Add Project",
    "nav.settings": "Settings",
    "nav.logout": "Sign Out",
    "nav.signedInAs": "Signed in as",

    // Tabs
    "tabs.board": "Board",
    "tabs.list": "List",
    "tabs.chat": "Team Chat",
    "tabs.overview": "Overview",

    // Status
    "status.backlog": "Backlog",
    "status.todo": "To Do",
    "status.inProgress": "In Progress",
    "status.inReview": "In Review",
    "status.done": "Done",

    // Priority
    "priority.urgent": "Urgent",
    "priority.high": "High",
    "priority.medium": "Medium",
    "priority.low": "Low",

    // Common Actions
    "common.save": "Save",
    "common.saved": "Saved",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search tasks...",
    "common.newTask": "New Issue",
    "common.language": "Language",
    "common.indonesian": "Bahasa Indonesia",
    "common.english": "English",
    "common.selectLanguage": "Select Language",

    // Settings
    "settings.title": "Settings",
    "settings.myProfile": "My Profile",
    "settings.members": "Members & Roles",
    "settings.workspace": "Workspace",
    "settings.appearance": "Appearance & Language",
    "settings.outlookSync": "Outlook & AI Sync",
    "settings.database": "Neon Database",
    "settings.shortcuts": "Shortcuts",
    "settings.themeMode": "Theme Mode",
    "settings.themeDark": "Dark Mode",
    "settings.themeLight": "Light Mode",
    "settings.languageTitle": "Interface Language",
    "settings.languageDesc": "Choose your preferred display language (English / Indonesian).",
    "settings.accountSession": "Account & Session",
    "settings.logoutDescription": "Sign out of your active session on this device.",
    "settings.logout": "Sign Out of Account",
    "settings.fullName": "Full Name",
    "settings.email": "Email",
    "settings.jobTitle": "Job Title",
    "settings.avatarUrl": "Avatar URL",
    "settings.saveProfile": "Save Profile",
    "settings.savedSuccess": "Saved Successfully",

    // Task Details
    "task.markComplete": "Mark Complete",
    "task.completed": "Completed",
    "task.active": "Active",
    "task.readOnly": "Read Only",
    "task.titleLabel": "Issue Title",
    "task.titlePlaceholder": "Write issue title...",
    "task.properties": "Properties & Attributes",
    "task.status": "Status",
    "task.priority": "Priority",
    "task.assignee": "Assignee",
    "task.unassigned": "Unassigned",
    "task.dueDate": "Due Date",
    "task.selectDate": "Select date",
    "task.visibility": "Access Visibility",
    "task.visibilityPublic": "Public (All workspace team)",
    "task.visibilityPrivate": "Private (Collaborators & Admin)",
    "task.tags": "Tags & Labels",
    "task.addTag": "Add Tag",
    "task.noTags": "No tags assigned yet",
    "task.tagPlaceholder": "Type tag name and press Enter...",
    "task.suggestions": "Suggestions",
    "task.collaborators": "Collaborators",
    "task.addCollaborator": "Add Collaborator",
    "task.noCollaborators": "No additional collaborators",
    "task.selectMember": "Select Workspace Team Member:",
    "task.description": "Description & Context",
    "task.descriptionPlaceholder": "Add context details, technical specs, or important notes...",
    "task.noDescription": "No description added for this issue yet.",
    "task.autoSaveNotice": "Auto-saves when typing completes",
    "task.subtasks": "Sub-issues Checklist",
    "task.addSubtaskPlaceholder": "Add new checklist item...",
    "task.noSubtasks": "No sub-issues yet. Create a checklist below.",
    "task.comments": "Comments & Discussions",
    "task.activity": "Activity Log",
    "task.noActivity": "No activity history recorded yet.",
    "task.deleteTitle": "Delete Issue",
    "task.deleteConfirm": "This action cannot be undone. This issue, along with all sub-issues and discussion history, will be permanently removed from the workspace.",
  },
} as const;

export type TranslationKey = keyof typeof translations.id;

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
  locale: "id",
  setLocale: () => { },
  t: (key: string, fallback?: string) => fallback || key,
});

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kinetic_locale") as Locale | null;
      if (saved === "id" || saved === "en") {
        setLocaleState(saved);
      }
    } catch { }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("kinetic_locale", newLocale);
    } catch { }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = translations[locale] as Record<string, string>;
      if (dict && dict[key]) {
        return dict[key];
      }
      const defaultDict = translations.id as Record<string, string>;
      if (defaultDict && defaultDict[key]) {
        return defaultDict[key];
      }
      return fallback || key;
    },
    [locale]
  );

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
