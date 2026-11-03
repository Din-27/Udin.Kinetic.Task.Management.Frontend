"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TaskComment, CommentAttachment, User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AtSign,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { toastAlert } from "@/components/ui/alert-toast";
import { MentionSuggestions } from "@/components/common/MentionSuggestions";
import { extractMentions, renderTextWithMentions } from "@/lib/mention-utils";
import { useUploadMutation } from "@/lib/hooks/useUploadMutation";

// Maximum upload limit: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface TaskChatFeedProps {
  comments: TaskComment[];
  currentUser: User;
  isViewer: boolean;
  onAddComment: (
    content: string,
    attachments?: CommentAttachment[],
    commentId?: string,
  ) => void;
  users?: User[]; // Anggota workspace tertentu untuk filter tag @mention
  taskId?: string;
  taskTitle?: string;
  workspaceId?: string;
  projectId?: string;
}

function deduplicateComments(
  existing: TaskComment[],
  incoming: TaskComment[],
): TaskComment[] {
  // 1. Bersihkan existing terlebih dahulu dari ID duplikat jika ada
  const idMap = new Map<string, number>();
  const cleanedExisting: TaskComment[] = [];

  for (const item of existing) {
    if (!item?.id) continue;
    if (idMap.has(item.id)) {
      // Jika sudah ada ID yang sama, timpa dengan entri terbaru
      const idx = idMap.get(item.id)!;
      cleanedExisting[idx] = item;
    } else {
      idMap.set(item.id, cleanedExisting.length);
      cleanedExisting.push(item);
    }
  }

  const result: TaskComment[] = [...cleanedExisting];

  // 2. Rekonsiliasi dengan incoming
  for (const item of incoming) {
    if (!item?.id) continue;

    const existingIndex = result.findIndex((c) => {
      // Match langsung via ID
      if (c.id === item.id) return true;

      // Match via kriteria optimistik (fallback ID sementara diganti ID permanen dari DB)
      const isSameTask = c.taskId === item.taskId;
      const isSameContent = c.content === item.content;
      const isSameUser =
        Boolean(c.userId && item.userId && c.userId === item.userId) ||
        Boolean(
          c.user?.email && item.user?.email && c.user.email === item.user.email,
        );

      const timeC = new Date(c.createdAt).getTime() || 0;
      const timeItem = new Date(item.createdAt).getTime() || 0;
      const isTimeClose = Math.abs(timeC - timeItem) < 10000;

      return isSameTask && isSameContent && isSameUser && isTimeClose;
    });

    if (existingIndex >= 0) {
      // Timpa item optimistik dengan data server (atau update data lama)
      result[existingIndex] = item;
    } else {
      result.push(item);
    }
  }

  // 3. Jamin keunikan ID mutlak sebelum diurutkan (mencegah React key collision)
  const finalUnique = Array.from(
    new Map(result.map((comment) => [comment.id, comment])).values(),
  );

  return finalUnique.sort(
    (a, b) =>
      (new Date(a.createdAt).getTime() || 0) -
      (new Date(b.createdAt).getTime() || 0),
  );
}

export function TaskChatFeed({
  comments,
  currentUser,
  isViewer,
  onAddComment,
  users = [],
  taskId,
  taskTitle,
  workspaceId,
  projectId,
}: TaskChatFeedProps) {
  const [content, setContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    CommentAttachment[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [localComments, setLocalComments] = useState<TaskComment[]>(comments);

  // State untuk Mention Popup (@Tag Anggota)
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionMatchStart, setMentionMatchStart] = useState(-1);

  // File Inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new comments and ref to container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    if (chatScrollRef.current) {
      if (smooth) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  // Sinkronkan prop comments ke localComments dengan deduplikasi ketat
  useEffect(() => {
    if (!comments || comments.length === 0) return;
    setLocalComments((prev) => deduplicateComments(prev, comments));
  }, [comments]);

  useEffect(() => {
    // Selalu posisikan ke pesan terakhir secara instan tanpa animasi bergulir
    scrollToBottom(false);
  }, [localComments.length, pendingAttachments.length, scrollToBottom]);

  const uploadMutation = useUploadMutation();

  // Upload file helper to AWS S3 storage API with 10MB limit via TanStack Mutation
  const uploadFileToS3 = async (
    file: File,
  ): Promise<CommentAttachment | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toastAlert({
        title: "Ukuran File Terlalu Besar",
        description: `Batas maksimal ukuran file adalah 10 MB (file Anda: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);
    try {
      const data = await uploadMutation.mutateAsync(file);
      const isImage = file.type.startsWith("image/");

      const newAtt: CommentAttachment = {
        id: `att-${Date.now()}`,
        type: isImage ? "image" : "file",
        name: file.name,
        url: data.url,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      };

      toastAlert({
        title: "File Berhasil Diunggah",
        description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) berhasil diupload ke S3.`,
      });

      return newAtt;
    } catch (err: any) {
      toastAlert({
        title: "Gagal Mengunggah ke Storage S3",
        description:
          err?.message || "Terjadi kesalahan saat mengunggah berkas.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const att = await uploadFileToS3(file);
    if (att) {
      setPendingAttachments((prev) => [...prev, att]);
    }
  };

  const handleGeneralFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const att = await uploadFileToS3(file);
    if (att) {
      setPendingAttachments((prev) => [...prev, att]);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Logika Input & Tag Mention (@)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    // Mencocokkan @query sebelum kursor (hanya karakter alfanumerik / spasi nama pendek)
    const mentionMatch = /(?:^|\s)@([a-zA-Z0-9_\s]{0,25})$/.exec(
      textBeforeCursor,
    );

    if (mentionMatch && users.length > 0) {
      const q = mentionMatch[1];
      setMentionQuery(q);
      setMentionMatchStart(cursorPos - q.length - 1);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionOpen) return;

    const filteredUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(mentionQuery.toLowerCase())),
    );

    if (filteredUsers.length === 0) {
      if (e.key === "Escape") setMentionOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex(
        (prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length,
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filteredUsers[mentionIndex];
      if (selected) {
        selectMentionUser(selected);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const selectMentionUser = (user: User) => {
    const cursorPos = textInputRef.current?.selectionStart || content.length;
    const beforeMention = content.slice(0, Math.max(0, mentionMatchStart));
    const afterMention = content.slice(cursorPos);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    setContent(newContent);
    setMentionOpen(false);

    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        const nextPos = beforeMention.length + user.name.length + 2;
        textInputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  // Submit comment
  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer || isUploading) return;
    if (!content.trim() && pendingAttachments.length === 0) return;

    const trimmed = content.trim();
    const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCommentObj: TaskComment = {
      id: commentId,
      content: trimmed,
      taskId: taskId || "",
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
      user: currentUser,
      attachments: pendingAttachments,
    };

    // Tambah secara optimis ke state lokal
    setLocalComments((prev) => deduplicateComments(prev, [newCommentObj]));

    // Simpan ke database melalui callback parent dengan ID yang sama
    onAddComment(trimmed, pendingAttachments, commentId);

    setContent("");
    setPendingAttachments([]);
    setMentionOpen(false);
  };

  return (
    <div className="flex flex-col h-[420px] rounded-lg border border-border bg-card shadow-2xs overflow-hidden relative">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleGeneralFileChange}
        className="hidden"
      />

      {/* Chat Messages Stream */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/10 relative">
        {localComments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/80 space-y-2">
            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Paperclip className="h-5 w-5 opacity-70" />
            </div>
            <p className="text-xs font-medium text-foreground">
              Belum ada percakapan atau diskusi.
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
              Gunakan <span className="font-semibold text-foreground">@</span>{" "}
              untuk men-tag anggota workspace ini, atau lampirkan foto dan
              dokumen (maksimal 10 MB) untuk koordinasi tim.
            </p>
          </div>
        ) : (
          localComments.map((comment) => {
            const isMe =
              comment.userId === currentUser.id ||
              comment.user?.email === currentUser.email;

            return (
              <div
                key={comment.id}
                className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* User Avatar */}
                <Avatar
                  src={
                    comment.user?.avatar ||
                    (isMe ? currentUser.avatar : undefined)
                  }
                  fallback={comment.user?.name || "U"}
                  size="sm"
                  className="h-7 w-7 text-[10px] shrink-0 mt-0.5 ring-1 ring-border"
                />

                {/* Message Bubble Body */}
                <div
                  className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender Name & Timestamp */}
                  <div className="flex items-center gap-1.5 px-1 mb-1 text-[10px] text-muted-foreground/80">
                    <span className="font-semibold text-foreground/90">
                      {isMe ? "Anda" : comment.user?.name || "Member"}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeDate(comment.createdAt)}</span>
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs space-y-2 ${
                      isMe
                        ? "bg-foreground text-background rounded-tr-xs"
                        : "bg-background border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    {/* Text Message with @Mention Highlights */}
                    {comment.content && (
                      <p className="whitespace-pre-wrap break-words">
                        {renderTextWithMentions(
                          comment.content,
                          users,
                          currentUser.id,
                        )}
                      </p>
                    )}

                    {/* Attachments Section */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {comment.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="rounded-lg overflow-hidden"
                          >
                            {/* 1. Image Attachment */}
                            {att.type === "image" && (
                              <div className="relative group rounded-md overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="max-h-56 w-auto max-w-full object-contain rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => window.open(att.url, "_blank")}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-2 text-white">
                                  <span className="text-[10px] truncate max-w-[160px] font-medium">
                                    {att.name}
                                  </span>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={att.name}
                                    className="p-1 rounded bg-black/60 hover:bg-black/90 transition-colors"
                                    title="Unduh / Buka foto"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* 2. File / Document Attachment */}
                            {att.type !== "image" && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download={att.name}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                                  isMe
                                    ? "bg-background/10 border-white/20 text-background hover:bg-background/20"
                                    : "bg-muted/40 border-border hover:bg-muted/70 text-foreground"
                                }`}
                              >
                                <div className="h-7 w-7 rounded bg-background/20 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium truncate">
                                    {att.name}
                                  </p>
                                  <p className="text-[10px] opacity-70">
                                    {att.size || "Berkas S3"}
                                  </p>
                                </div>
                                <Download className="h-3.5 w-3.5 opacity-60 hover:opacity-100 shrink-0" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Attachments Chip Preview */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 py-2 bg-muted/30 border-t border-border flex items-center gap-2 overflow-x-auto">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-[11px] shadow-2xs shrink-0"
            >
              {att.type === "image" ? (
                <ImageIcon className="h-3 w-3 text-emerald-500" />
              ) : (
                <FileText className="h-3 w-3 text-blue-500" />
              )}
              <span className="truncate max-w-[110px] font-medium">
                {att.name}
              </span>
              <button
                type="button"
                onClick={() => removePendingAttachment(att.id)}
                className="text-muted-foreground hover:text-foreground ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--workspace-accent,#6366f1)]" />
          <span>Mengunggah file ke AWS S3 Storage (maks 10 MB)...</span>
        </div>
      )}

      {/* Input Form Bar */}
      {isViewer ? (
        <div className="p-3 bg-muted/30 border-t border-border text-center text-[11px] text-muted-foreground">
          Akun Viewer berada dalam mode baca saja (read-only).
        </div>
      ) : (
        <div className="relative">
          {/* Mention Suggestions Popup Scoped to Workspace Users */}
          <MentionSuggestions
            users={users}
            isOpen={mentionOpen}
            query={mentionQuery}
            selectedIndex={mentionIndex}
            onSelectUser={selectMentionUser}
            onClose={() => setMentionOpen(false)}
          />

          <form
            onSubmit={handleSubmit}
            className="p-2.5 bg-background border-t border-border flex items-center gap-2"
          >
            {/* Action buttons: Photo & Document & Quick @ Tag */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => imageInputRef.current?.click()}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors"
                title="Kirim Foto / Gambar (Maks 10 MB)"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors"
                title="Lampirkan Dokumen / Berkas (Maks 10 MB)"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={isUploading || users.length === 0}
                onClick={() => {
                  if (textInputRef.current) {
                    textInputRef.current.focus();
                    setContent((prev) => `${prev}@`);
                    setMentionQuery("");
                    setMentionMatchStart(content.length);
                    setMentionOpen(true);
                    setMentionIndex(0);
                  }
                }}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[var(--workspace-accent,#6366f1)] hover:bg-muted/70 disabled:opacity-40 transition-colors"
                title="Tag Anggota Workspace (@)"
              >
                <AtSign className="h-4 w-4" />
              </button>
            </div>

            {/* Text Input with @ Tag detection */}
            <Input
              ref={textInputRef}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              disabled={isUploading}
              placeholder={
                pendingAttachments.length > 0
                  ? "Tambahkan catatan keterangan..."
                  : "Ketik pesan atau ketik @ untuk tag anggota tim..."
              }
              className="h-8 text-xs flex-1 bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-foreground/20"
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={
                (!content.trim() && pendingAttachments.length === 0) ||
                isUploading
              }
              className="h-8 px-3 text-xs disabled:opacity-40 transition-all gap-1.5"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Kirim</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
