"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MousePointer,
  Square,
  Circle,
  Diamond,
  StickyNote,
  Type,
  PenTool,
  ArrowRight,
  Trash2,
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  MessageSquare,
  Send,
  X,
  Plus,
  FolderOpen,
  Check,
  Pin,
  ChevronDown,
  Eraser,
  Pencil,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toastAlert } from "@/components/ui/alert-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getSocket } from "@/lib/socket-client";
import { useQueryClient } from "@tanstack/react-query";
import { Workspace, User } from "@/types";
import {
  useWhiteboardsQuery,
  useSaveWhiteboardMutation,
  useDeleteWhiteboardMutation,
  useSendWhiteboardCommentMutation,
  fetchWhiteboardById,
} from "@/lib/hooks/useWhiteboardQueries";

export interface WhiteboardElement {
  id: string;
  type: "sticky" | "rect" | "circle" | "diamond" | "text" | "arrow" | "freehand";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
  textColor?: string;
  points?: Array<{ x: number; y: number }>;
  fontSize?: number;
  strokeWidth?: number;
  createdBy?: string;
  creatorName?: string;
  updatedAt?: string;
}

export interface WhiteboardComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor?: string;
  text: string;
  createdAt: string;
  elementId?: string;
  elementLabel?: string;
}

export interface WhiteboardData {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  elements: WhiteboardElement[];
  comments: WhiteboardComment[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
  creatorName?: string;
}

interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  lastActive: number;
}

interface RemoteTyping {
  userId: string;
  userName: string;
  userColor: string;
  elementId?: string;
  text: string;
  x?: number;
  y?: number;
  updatedAt: number;
}

interface WhiteboardViewProps {
  workspace: Workspace;
  currentUser: User;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const PALETTE_COLORS = [
  { name: "Kuning Pastel", bg: "#fef08a", border: "#facc15", text: "#713f12" },
  { name: "Biru Pastel", bg: "#bae6fd", border: "#38bdf8", text: "#0c4a6e" },
  { name: "Hijau Pastel", bg: "#bbf7d0", border: "#4ade80", text: "#14532d" },
  { name: "Pink Pastel", bg: "#fbcfe8", border: "#f472b6", text: "#831843" },
  { name: "Ungu Pastel", bg: "#ddd6fe", border: "#a78bfa", text: "#4c1d95" },
  { name: "Oranye Pastel", bg: "#fed7aa", border: "#fb923c", text: "#7c2d12" },
  { name: "Dark Modern", bg: "#1e293b", border: "#475569", text: "#f8fafc" },
  { name: "Putih Bersih", bg: "#ffffff", border: "#cbd5e1", text: "#0f172a" },
];

const USER_COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#f43f5e", // Rose
  "#14b8a6", // Teal
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}

const DEFAULT_ELEMENTS: WhiteboardElement[] = [
  {
    id: "el-welcome",
    type: "sticky",
    x: 100,
    y: 80,
    width: 240,
    height: 180,
    content: "👋 Selamat datang di Papan Tulis Streaming!\n\nSemua perubahan tersinkronkan seketika. Gerakkan kursor atau ketik catatan untuk melihat kolaborasi langsung ala Figma.",
    color: "#fef08a",
    textColor: "#713f12",
  },
  {
    id: "el-feature-1",
    type: "rect",
    x: 400,
    y: 80,
    width: 220,
    height: 140,
    content: "🎯 Multiplayer Cursor\nSetiap kursor pengguna bergerak secara real-time dengan label nama dan warna unik.",
    color: "#bae6fd",
    textColor: "#0c4a6e",
  },
  {
    id: "el-feature-2",
    type: "diamond",
    x: 420,
    y: 280,
    width: 180,
    height: 140,
    content: "💬 Kolom Komentar\nAda pertanyaan? Tulis di sidebar komentar!",
    color: "#bbf7d0",
    textColor: "#14532d",
  },
  {
    id: "el-arrow-1",
    type: "arrow",
    x: 340,
    y: 150,
    width: 60,
    height: 2,
    color: "#6366f1",
  },
];

export const generateUniqueWhiteboardId = () =>
  `wb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export function WhiteboardView({
  workspace,
  currentUser,
}: WhiteboardViewProps) {
  // Papan tulis identitas
  const [whiteboardId, setWhiteboardId] = useState<string>(() => generateUniqueWhiteboardId());
  const [title, setTitle] = useState<string>("Papan Tulis Kolaboratif Tim");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("Papan Tulis Kolaboratif Tim");
  const [savedWhiteboards, setSavedWhiteboards] = useState<WhiteboardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // TanStack Query: Ambil daftar papan tulis & Mutasi
  const { data: whiteboardsData, refetch: refetchSavedWhiteboards } = useWhiteboardsQuery(
    workspace?.id,
    currentUser?.id
  );
  const saveWhiteboardMutation = useSaveWhiteboardMutation();
  const deleteWhiteboardMutation = useDeleteWhiteboardMutation();
  const sendWhiteboardCommentMutation = useSendWhiteboardCommentMutation();

  useEffect(() => {
    if (whiteboardsData && Array.isArray(whiteboardsData)) {
      setSavedWhiteboards(whiteboardsData);
    }
  }, [whiteboardsData]);

  useEffect(() => {
    setTitleInput(title);
  }, [title]);

  // Canvas Viewport (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Listener tombol spasi untuk panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Elemen Kanvas
  const [elements, setElements] = useState<WhiteboardElement[]>(DEFAULT_ELEMENTS);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<
    "select" | "sticky" | "rect" | "circle" | "diamond" | "text" | "arrow" | "pen" | "eraser"
  >("select");
  const [selectedColor, setSelectedColor] = useState<string>("#fef08a");

  // Hapus elemen dengan sinkronisasi ke Socket.IO
  const handleDeleteElement = useCallback(
    (elemId: string) => {
      setElements((prev) => {
        const updated = prev.filter((el) => el.id !== elemId);
        const socket = getSocket();
        if (socket) {
          socket.emit("whiteboard-change", {
            whiteboardId,
            elements: updated,
            senderId: currentUser.id,
          });
        }
        return updated;
      });
      if (selectedElementId === elemId) setSelectedElementId(null);
      toastAlert({ title: "Elemen terhapus", variant: "info" });
    },
    [whiteboardId, currentUser.id, selectedElementId]
  );

  // Dragging Element
  const [isDraggingElement, setIsDraggingElement] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
    mouseX: 0,
    mouseY: 0,
    elemX: 0,
    elemY: 0,
  });

  // Freehand Pen Drawing
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentDrawingRef = useRef<Array<{ x: number; y: number }>>([]);

  // Multiplayer Cursors & Typing
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [remoteTyping, setRemoteTyping] = useState<Record<string, RemoteTyping>>({});
  const myColor = useMemo(() => getUserColor(currentUser.id), [currentUser.id]);
  const lastCursorSentRef = useRef<number>(0);

  // Komentar & Pertanyaan
  const [comments, setComments] = useState<WhiteboardComment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(true);
  const [commentInput, setCommentInput] = useState<string>("");
  const [attachToElement, setAttachToElement] = useState<boolean>(false);
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);

  // State konfirmasi modal hapus whiteboard
  const [wbToDelete, setWbToDelete] = useState<{ id: string; title: string } | null>(null);

  // Container canvas reference
  const canvasRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // 1. Load Whiteboard Data dari Backend via TanStack Query
  const loadWhiteboard = useCallback(async (wbId: string) => {
    setIsLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["whiteboard", wbId],
        queryFn: () => fetchWhiteboardById(wbId, workspace.id),
      });
      if (data) {
        setTitle(data.title || "Papan Tulis Kolaboratif");
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          setElements(data.elements);
        }
        if (Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      }
    } catch (err) {
      console.error("Gagal memuat whiteboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, queryClient]);

  // Load daftar whiteboard tersimpan di workspace via TanStack Query
  const loadSavedList = useCallback(async () => {
    refetchSavedWhiteboards();
  }, [refetchSavedWhiteboards]);

  useEffect(() => {
    loadWhiteboard(whiteboardId);
    loadSavedList();
  }, [whiteboardId, loadWhiteboard, loadSavedList]);

  // 2. Setup Socket.IO untuk Multiplayer Real-time
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join room papan tulis
    socket.emit("join-whiteboard", {
      whiteboardId,
      userId: currentUser.id,
      userName: currentUser.name || "User",
      userAvatar: currentUser.avatar,
      userColor: myColor,
    });

    // Listener cursor update
    const handleCursorUpdated = (payload: {
      whiteboardId: string;
      userId: string;
      userName: string;
      userColor: string;
      x: number;
      y: number;
    }) => {
      if (payload.whiteboardId !== whiteboardId || payload.userId === currentUser.id) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          userName: payload.userName,
          userColor: payload.userColor,
          x: payload.x,
          y: payload.y,
          lastActive: Date.now(),
        },
      }));
    };

    // Listener canvas sync (perubahan bentuk/posisi dari user lain)
    const handleWhiteboardSynced = (payload: {
      whiteboardId: string;
      elements: WhiteboardElement[];
      senderId: string;
    }) => {
      if (payload.whiteboardId !== whiteboardId || payload.senderId === currentUser.id) return;
      if (Array.isArray(payload.elements)) {
        setElements(payload.elements);
      }
    };

    // Listener live typing
    const handleTypingUpdated = (payload: RemoteTyping & { whiteboardId: string }) => {
      if (payload.whiteboardId !== whiteboardId || payload.userId === currentUser.id) return;
      setRemoteTyping((prev) => ({
        ...prev,
        [payload.userId]: {
          ...payload,
          updatedAt: Date.now(),
        },
      }));

      // Update content element seketika jika ada elementId terkait
      if (payload.elementId) {
        setElements((prev) =>
          prev.map((el) => (el.id === payload.elementId ? { ...el, content: payload.text } : el))
        );
      }
    };

    const handleTypingStopped = (payload: { whiteboardId: string; userId: string }) => {
      if (payload.whiteboardId !== whiteboardId) return;
      setRemoteTyping((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    };

    // Listener komentar baru
    const handleCommentReceived = (payload: {
      whiteboardId: string;
      comment: WhiteboardComment;
    }) => {
      if (payload.whiteboardId !== whiteboardId) return;
      setComments((prev) => {
        // Jangan duplikat jika sudah ada id
        if (prev.some((c) => c.id === payload.comment.id)) return prev;
        return [...prev, payload.comment];
      });
    };

    // User left
    const handleUserLeft = (payload: { whiteboardId: string; userId: string }) => {
      if (payload.whiteboardId !== whiteboardId) return;
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    };

    socket.on("whiteboard-cursor-updated", handleCursorUpdated);
    socket.on("whiteboard-synced", handleWhiteboardSynced);
    socket.on("whiteboard-typing-updated", handleTypingUpdated);
    socket.on("whiteboard-typing-stopped", handleTypingStopped);
    socket.on("whiteboard-comment-received", handleCommentReceived);
    socket.on("whiteboard-user-left", handleUserLeft);

    // Pembersihan cursor lama (inaktif > 10s)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.lastActive < 8000) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 4000);

    return () => {
      clearInterval(cleanupInterval);
      socket.emit("leave-whiteboard", { whiteboardId, userId: currentUser.id });
      socket.off("whiteboard-cursor-updated", handleCursorUpdated);
      socket.off("whiteboard-synced", handleWhiteboardSynced);
      socket.off("whiteboard-typing-updated", handleTypingUpdated);
      socket.off("whiteboard-typing-stopped", handleTypingStopped);
      socket.off("whiteboard-comment-received", handleCommentReceived);
      socket.off("whiteboard-user-left", handleUserLeft);
    };
  }, [whiteboardId, currentUser.id, currentUser.name, currentUser.avatar, myColor]);

  // Broadcast pergerakan kursor mouse (throttled)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Konversi ke koordinat canvas sesungguhnya berdasarkan pan dan zoom
      const canvasX = (rawX - pan.x) / zoom;
      const canvasY = (rawY - pan.y) / zoom;

      // Handle pan kanvas jika sedang aktif
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      // Handle drag element jika sedang aktif
      if (isDraggingElement && selectedElementId) {
        const deltaX = (e.clientX - dragStartRef.current.mouseX) / zoom;
        const deltaY = (e.clientY - dragStartRef.current.mouseY) / zoom;

        setElements((prev) => {
          const updated = prev.map((el) =>
            el.id === selectedElementId
              ? {
                ...el,
                x: Math.round(dragStartRef.current.elemX + deltaX),
                y: Math.round(dragStartRef.current.elemY + deltaY),
              }
              : el
          );

          // Emit canvas changes seketika agar user lain melihat gerakan shape secara streaming!
          const socket = getSocket();
          if (socket) {
            socket.emit("whiteboard-change", {
              whiteboardId,
              elements: updated,
              senderId: currentUser.id,
            });
          }

          return updated;
        });
      }

      // Handle freehand pen drawing
      if (isDrawing && activeTool === "pen") {
        currentDrawingRef.current.push({ x: canvasX, y: canvasY });
        setElements((prev) => {
          const lastIdx = prev.findIndex((el) => el.id === "temp-drawing");
          if (lastIdx >= 0) {
            const next = [...prev];
            next[lastIdx] = {
              ...next[lastIdx],
              points: [...currentDrawingRef.current],
            };
            return next;
          }
          return prev;
        });
      }

      // Throttling pengiriman kursor multiplayer ~30ms
      const now = Date.now();
      if (now - lastCursorSentRef.current > 30) {
        lastCursorSentRef.current = now;
        const socket = getSocket();
        if (socket) {
          socket.emit("whiteboard-cursor-move", {
            whiteboardId,
            userId: currentUser.id,
            userName: currentUser.name || "User",
            userColor: myColor,
            x: canvasX,
            y: canvasY,
          });
        }
      }
    },
    [
      pan,
      zoom,
      isPanning,
      isDraggingElement,
      selectedElementId,
      isDrawing,
      activeTool,
      whiteboardId,
      currentUser.id,
      currentUser.name,
      myColor,
    ]
  );

  // Mouse Down di Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Jika tombol tengah mouse atau tombol Space ditekan, aktifkan Pan
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    // Jika sedang dalam tool pembuatan shape baru
    if (activeTool !== "select" && activeTool !== "pen") {
      const newId = `el-${Date.now()}`;
      let newElem: WhiteboardElement;

      if (activeTool === "sticky") {
        newElem = {
          id: newId,
          type: "sticky",
          x: Math.round(canvasX - 100),
          y: Math.round(canvasY - 75),
          width: 200,
          height: 150,
          content: "Catatan baru...",
          color: selectedColor,
          textColor: selectedColor === "#1e293b" ? "#f8fafc" : "#1e293b",
        };
      } else if (activeTool === "rect") {
        newElem = {
          id: newId,
          type: "rect",
          x: Math.round(canvasX - 90),
          y: Math.round(canvasY - 60),
          width: 180,
          height: 120,
          content: "Kotak Proses",
          color: selectedColor,
          textColor: selectedColor === "#1e293b" ? "#f8fafc" : "#1e293b",
        };
      } else if (activeTool === "circle") {
        newElem = {
          id: newId,
          type: "circle",
          x: Math.round(canvasX - 70),
          y: Math.round(canvasY - 70),
          width: 140,
          height: 140,
          content: "Lingkaran",
          color: selectedColor,
          textColor: selectedColor === "#1e293b" ? "#f8fafc" : "#1e293b",
        };
      } else if (activeTool === "diamond") {
        newElem = {
          id: newId,
          type: "diamond",
          x: Math.round(canvasX - 80),
          y: Math.round(canvasY - 60),
          width: 160,
          height: 120,
          content: "Keputusan?",
          color: selectedColor,
          textColor: selectedColor === "#1e293b" ? "#f8fafc" : "#1e293b",
        };
      } else if (activeTool === "text") {
        newElem = {
          id: newId,
          type: "text",
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          width: 220,
          height: 60,
          content: "Ketik teks di sini...",
          color: "transparent",
          textColor: "#0f172a",
        };
      } else {
        // Arrow
        newElem = {
          id: newId,
          type: "arrow",
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          width: 120,
          height: 2,
          color: "#6366f1",
        };
      }

      const updated = [...elements, newElem];
      setElements(updated);
      setSelectedElementId(newId);
      setActiveTool("select");

      // Broadcast new element
      const socket = getSocket();
      if (socket) {
        socket.emit("whiteboard-change", {
          whiteboardId,
          elements: updated,
          senderId: currentUser.id,
        });
      }
      return;
    }

    // Jika tool pen (drawing)
    if (activeTool === "pen") {
      setIsDrawing(true);
      currentDrawingRef.current = [{ x: canvasX, y: canvasY }];
      const tempId = "temp-drawing";
      setElements((prev) => [
        ...prev,
        {
          id: tempId,
          type: "freehand",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color: myColor,
          strokeWidth: 3,
          points: [{ x: canvasX, y: canvasY }],
        },
      ]);
      return;
    }

    // Klik pada area kosong canvas -> deselect
    setSelectedElementId(null);
  };

  // Mouse Up di Canvas
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingElement) {
      setIsDraggingElement(false);
      // Simpan perubahan final ke socket
      const socket = getSocket();
      if (socket) {
        socket.emit("whiteboard-change", {
          whiteboardId,
          elements,
          senderId: currentUser.id,
        });
      }
    }
    if (isDrawing && activeTool === "pen") {
      setIsDrawing(false);
      const permId = `pen-${Date.now()}`;
      setElements((prev) => {
        const updated = prev.map((el) =>
          el.id === "temp-drawing" ? { ...el, id: permId } : el
        );
        const socket = getSocket();
        if (socket) {
          socket.emit("whiteboard-change", {
            whiteboardId,
            elements: updated,
            senderId: currentUser.id,
          });
        }
        return updated;
      });
      currentDrawingRef.current = [];
    }
  };

  // Keyboard shortcut (Delete / Backspace untuk hapus element)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        // Abaikan jika sedang mengetik di textarea / input komentar
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        e.preventDefault();
        handleDeleteElement(selectedElementId);
        return;
      }

      // Shortcut E untuk Penghapus dan V untuk Select
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E") {
        setActiveTool("eraser");
        toastAlert({ title: "Tool Penghapus Aktif", variant: "info" });
      } else if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, handleDeleteElement]);

  // Live Ketikan saat mengedit teks elemen
  const handleElementContentChange = (elemId: string, newContent: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elemId ? { ...el, content: newContent } : el))
    );

    // Emit live typing indicator ke socket
    const socket = getSocket();
    if (socket) {
      const elem = elements.find((e) => e.id === elemId);
      socket.emit("whiteboard-typing", {
        whiteboardId,
        userId: currentUser.id,
        userName: currentUser.name || "User",
        userColor: myColor,
        elementId: elemId,
        text: newContent,
        x: elem?.x,
        y: elem?.y,
      });
    }
  };

  const handleElementBlur = (elemId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("whiteboard-stop-typing", {
        whiteboardId,
        userId: currentUser.id,
        elementId: elemId,
      });

      socket.emit("whiteboard-change", {
        whiteboardId,
        elements,
        senderId: currentUser.id,
      });
    }
  };

  // Buat Papan Tulis Baru dengan ID Unik
  const handleCreateNewWhiteboard = () => {
    const newId = generateUniqueWhiteboardId();
    setWhiteboardId(newId);
    setTitle("Papan Tulis Kolaboratif Tim");
    setElements(DEFAULT_ELEMENTS);
    setComments([]);
    setSelectedElementId(null);
    toastAlert({ title: "Papan tulis baru dibuat", variant: "info" });
  };

  // Hapus Papan Tulis Saat Ini atau Tertentu via TanStack Query
  const handleDeleteWhiteboard = async (wbIdToDelete?: string) => {
    const targetWbId = wbIdToDelete || whiteboardId;
    try {
      await deleteWhiteboardMutation.mutateAsync({ id: targetWbId, userId: currentUser?.id });
      toastAlert({ title: "Papan tulis berhasil dihapus", variant: "success" });
      const remaining = savedWhiteboards.filter((w) => w.id !== targetWbId);
      setSavedWhiteboards(remaining);
      if (targetWbId === whiteboardId) {
        if (remaining.length > 0) {
          setWhiteboardId(remaining[0].id);
        } else {
          handleCreateNewWhiteboard();
        }
      }
    } catch (e: any) {
      toastAlert({ title: "Gagal menghapus", description: e?.message || "Gagal menghapus papan tulis", variant: "destructive" });
    }
  };

  // Simpan Papan Tulis ke Database
  const handleSaveWhiteboard = async () => {
    setIsSaving(true);
    try {
      const rawId = whiteboardId ? String(whiteboardId).trim() : "";
      const isForbidden =
        !rawId ||
        rawId === "default" ||
        rawId === "wb-main" ||
        rawId === "wb-default" ||
        rawId.endsWith("-default");
      const targetId = !isForbidden ? rawId : generateUniqueWhiteboardId();
      if (targetId !== whiteboardId) {
        setWhiteboardId(targetId);
      }

      const payload: WhiteboardData = {
        id: targetId,
        workspaceId: workspace.id,
        title,
        elements,
        comments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: currentUser.id,
        creatorName: currentUser.name,
      };

      const saved = await saveWhiteboardMutation.mutateAsync(payload);

      if (saved && saved.id && saved.id !== whiteboardId) {
        setWhiteboardId(saved.id);
      }
      toastAlert({ title: "Papan tulis berhasil disimpan ke cloud!", variant: "success" });
      loadSavedList();
    } catch (err: any) {
      toastAlert({ title: "Gagal menyimpan papan tulis", description: err?.message || "Terjadi kesalahan saat menyimpan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Kirim Komentar / Pertanyaan
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSendingComment) return;

    setIsSendingComment(true);
    const selectedElem = elements.find((el) => el.id === selectedElementId);
    const commentPayload: WhiteboardComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name || "User",
      userAvatar: currentUser.avatar,
      userColor: myColor,
      text: commentInput.trim(),
      createdAt: new Date().toISOString(),
      elementId: attachToElement && selectedElem ? selectedElem.id : undefined,
      elementLabel:
        attachToElement && selectedElem
          ? selectedElem.content?.slice(0, 30) || selectedElem.type
          : undefined,
    };

    try {
      // 1. Emit via socket agar langsung streaming di semua layar
      const socket = getSocket();
      if (socket) {
        socket.emit("whiteboard-new-comment", {
          whiteboardId,
          comment: commentPayload,
        });
      }

      // 2. Simpan persisten ke API via TanStack Query
      await sendWhiteboardCommentMutation.mutateAsync({
        whiteboardId,
        workspaceId: workspace.id,
        comment: commentPayload,
      });

      // Update state lokal
      setComments((prev) => [...prev, commentPayload]);
      setCommentInput("");
      setAttachToElement(false);
      toastAlert({ title: "Pertanyaan / komentar terkirim!", variant: "success" });
    } catch (err) {
      console.error("Gagal mengirim komentar:", err);
      toastAlert({ title: "Gagal mengirim komentar", variant: "destructive" });
    } finally {
      setIsSendingComment(false);
    }
  };

  // Ekspor gambar SVG / JSON
  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ title, elements, comments }, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    toastAlert({ title: "Data papan tulis berhasil diekspor", variant: "success" });
  };

  // Daftar partisipan aktif
  const activeParticipants = useMemo(() => {
    const list = [
      {
        id: currentUser.id,
        name: currentUser.name || "Saya",
        color: myColor,
        isSelf: true,
      },
    ];
    for (const c of Object.values(remoteCursors)) {
      if (c.userId !== currentUser.id) {
        list.push({
          id: c.userId,
          name: c.userName,
          color: c.userColor,
          isSelf: false,
        });
      }
    }
    return list;
  }, [currentUser, myColor, remoteCursors]);

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId),
    [elements, selectedElementId]
  );

  return (
    <div className="flex h-full w-full flex-col bg-background select-none overflow-hidden relative">
      {/* Top Bar: Bersih, Ramping & Aksi Papan Tulis (Seragam dengan AI Flowchart) */}
      <div className="border-b border-border/80 bg-card/70 backdrop-blur-md px-3 sm:px-4 py-2 z-20 shrink-0 select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const trimmed = titleInput.trim();
                      if (trimmed) {
                        setTitle(trimmed);
                      }
                      setIsEditingTitle(false);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={() => {
                        const trimmed = titleInput.trim();
                        if (trimmed) {
                          setTitle(trimmed);
                        }
                        setIsEditingTitle(false);
                      }}
                      autoFocus
                      className="h-7 text-xs font-semibold px-2 py-0 w-44 sm:w-64"
                      placeholder="Judul papan tulis..."
                    />
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-md bg-emerald-500 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors"
                      title="Simpan Judul (Enter)"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <h1
                      onClick={() => {
                        setTitleInput(title);
                        setIsEditingTitle(true);
                      }}
                      className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-[320px] cursor-pointer hover:text-emerald-500 transition-colors"
                      title="Klik untuk mengubah judul papan tulis"
                    >
                      {title}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setTitleInput(title);
                        setIsEditingTitle(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-muted"
                      title="Edit Judul Papan Tulis"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                  {elements.length} Objek
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeParticipants.length} Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dropdown Menu Papan Tulis Tersimpan (ShadCN UI) Lengkap dengan Tombol Hapus per Item */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer max-w-[210px] bg-card hover:bg-muted text-foreground border-border/80"
                  title="Pilih dan kelola papan tulis tersimpan"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-[130px] font-medium">Papan Tersimpan</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-1.5 space-y-1 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Papan Tulis Tersimpan ({savedWhiteboards.length})</span>
                  <span className="font-mono text-[9px] text-emerald-500">Workspace</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {savedWhiteboards.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-muted-foreground">
                      Belum ada papan tulis tersimpan.
                    </div>
                  ) : (
                    savedWhiteboards.map((w) => (
                      <div
                        key={w.id}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors group ${
                          w.id === whiteboardId
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div
                          onClick={() => setWhiteboardId(w.id)}
                          className="flex-1 min-w-0"
                          title={`Buka ${w.title}`}
                        >
                          <div className="truncate font-medium">{w.title}</div>
                          <div className="text-[9px] text-muted-foreground font-normal">
                            {new Date(w.updatedAt || w.createdAt).toLocaleDateString("id-ID")}
                          </div>
                        </div>
                        {/* Tombol Hapus Papan Langsung dari Dropdown */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWbToDelete({ id: w.id, title: w.title });
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-70 group-hover:opacity-100"
                          title="Hapus papan tulis ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={handleCreateNewWhiteboard}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Buat Papan Tulis Baru</span>
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatars Online */}
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-1">
              {activeParticipants.map((p) => (
                <div
                  key={p.id}
                  style={{ backgroundColor: p.color }}
                  className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-xs cursor-default transition-transform hover:scale-110 hover:z-10"
                  title={`${p.name} ${p.isSelf ? "(Anda)" : "(Sedang Melihat)"}`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-muted/40 rounded-md border border-border/70 p-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="text-[10px] font-mono font-medium px-1.5 min-w-[38px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
                className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>

            {/* Tombol Simpan */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveWhiteboard}
              disabled={isSaving}
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              title="Simpan papan tulis ke server"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isSaving ? "Menyimpan..." : "Simpan"}</span>
            </Button>

            {/* Tombol Komentar */}
            <Button
              variant={isCommentsOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCommentsOpen((prev) => !prev)}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                isCommentsOpen ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-border/80"
              }`}
              title="Tampilkan diskusi & komentar"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Komentar</span>
              {comments.length > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white">
                  {comments.length}
                </span>
              )}
            </Button>

            {/* Menu Titik Tiga (MoreVertical) Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer text-foreground hover:bg-muted"
                  title="Menu Lainnya (Buat Baru, Export, & Hapus)"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1.5 space-y-1 z-50">
                <DropdownMenuItem
                  onClick={handleCreateNewWhiteboard}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer font-medium"
                >
                  <Plus className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">+ Buat Papan Baru</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Mulai kanvas baru dengan ID unik</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted cursor-pointer font-medium"
                >
                  <Download className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">Export File JSON</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Unduh data papan tulis sebagai file</div>
                  </div>
                </DropdownMenuItem>
                {savedWhiteboards.some((w) => w.id === whiteboardId) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setWbToDelete({ id: whiteboardId, title: title || "Papan Tulis" });
                      }}
                      variant="destructive"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer font-medium"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">Hapus Papan Tulis</div>
                        <div className="text-[10px] text-muted-foreground font-normal">Hapus permanen dari workspace</div>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: CANVAS + FLOATING TOOLBAR + COMMENTS SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* CANVAS CONTAINER */}
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleMouseUp}
          className={`flex-1 h-full w-full relative overflow-hidden bg-dot-pattern ${isPanning
              ? "cursor-grabbing"
              : activeTool === "select"
                ? "cursor-default"
                : activeTool === "pen"
                  ? "cursor-crosshair"
                  : "cursor-copy"
            }`}
          style={{
            backgroundColor: "var(--background)",
            backgroundImage:
              "radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* CANVAS CONTENT LAYER (Transformed by Pan & Zoom) */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
              width: "5000px",
              height: "5000px",
            }}
          >
            {/* SVG Connecting Arrows / Lines & Freehand Drawings */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
                <marker
                  id="wb-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
                </marker>
              </defs>

              {elements.map((el) => {
                if (el.type === "arrow") {
                  return (
                    <line
                      key={el.id}
                      x1={el.x}
                      y1={el.y}
                      x2={el.x + el.width}
                      y2={el.y + el.height}
                      stroke={el.color || "#6366f1"}
                      strokeWidth={activeTool === "eraser" ? 8 : 3}
                      strokeDasharray={el.strokeWidth === 1 ? "4,4" : undefined}
                      markerEnd="url(#wb-arrow)"
                      style={{ pointerEvents: activeTool === "eraser" ? "auto" : "none" }}
                      className={activeTool === "eraser" ? "cursor-pointer hover:stroke-rose-500 hover:opacity-75 transition-colors" : ""}
                      onMouseDown={(e) => {
                        if (activeTool === "eraser") {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }
                      }}
                    />
                  );
                }

                if (el.type === "freehand" && el.points && el.points.length > 1) {
                  const pathData = el.points.reduce(
                    (acc, pt, idx) =>
                      idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`,
                    ""
                  );
                  return (
                    <path
                      key={el.id}
                      d={pathData}
                      fill="none"
                      stroke={el.color || "#6366f1"}
                      strokeWidth={activeTool === "eraser" ? (el.strokeWidth || 3) + 6 : el.strokeWidth || 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ pointerEvents: activeTool === "eraser" ? "auto" : "none" }}
                      className={activeTool === "eraser" ? "cursor-pointer hover:stroke-rose-500 hover:opacity-75 transition-colors" : ""}
                      onMouseDown={(e) => {
                        if (activeTool === "eraser") {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }
                      }}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* SHAPES & STICKY NOTES */}
            {elements.map((elem) => {
              if (elem.type === "arrow" || elem.type === "freehand") return null;

              const isSelected = selectedElementId === elem.id;

              return (
                <div
                  key={elem.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (activeTool === "eraser") {
                      handleDeleteElement(elem.id);
                      return;
                    }
                    setSelectedElementId(elem.id);
                    if (activeTool === "select") {
                      setIsDraggingElement(true);
                      dragStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        elemX: elem.x,
                        elemY: elem.y,
                      };
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${elem.x}px`,
                    top: `${elem.y}px`,
                    width: `${elem.width}px`,
                    height: `${elem.height}px`,
                    backgroundColor: elem.color,
                    color: elem.textColor || "#0f172a",
                    zIndex: isSelected ? 10 : 2,
                  }}
                  className={`group rounded-xl p-3 shadow-md transition-all select-text ${activeTool === "eraser"
                      ? "cursor-pointer hover:ring-2 hover:ring-rose-500 hover:opacity-75"
                      : isSelected
                        ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-xl"
                        : "hover:shadow-lg"
                    } ${elem.type === "diamond"
                      ? "rotate-45 flex items-center justify-center"
                      : elem.type === "circle"
                        ? "rounded-full flex items-center justify-center text-center"
                        : "flex flex-col"
                    }`}
                >
                  {/* Inner text area / editor */}
                  <div
                    className={`w-full h-full ${elem.type === "diamond" ? "-rotate-45 text-center flex items-center justify-center" : ""
                      }`}
                  >
                    <textarea
                      value={elem.content || ""}
                      onChange={(e) => handleElementContentChange(elem.id, e.target.value)}
                      onBlur={() => handleElementBlur(elem.id)}
                      placeholder="Tulis sesuatu..."
                      style={{ color: elem.textColor }}
                      className="w-full h-full bg-transparent resize-none border-none focus:outline-none text-xs sm:text-sm font-medium leading-relaxed"
                    />
                  </div>

                  {/* Pin badge if commented */}
                  {comments.some((c) => c.elementId === elem.id) && (
                    <div
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer"
                      title="Ada pertanyaan pada elemen ini"
                    >
                      <Pin className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* MULTIPLAYER FIGMA-STYLE CURSORS */}
            {Object.values(remoteCursors).map((cursor) => (
              <div
                key={cursor.userId}
                style={{
                  position: "absolute",
                  left: `${cursor.x}px`,
                  top: `${cursor.y}px`,
                  zIndex: 50,
                  transform: "translate(-2px, -2px)",
                  transition: "left 0.06s linear, top 0.06s linear",
                  pointerEvents: "none",
                }}
                className="flex items-start gap-1"
              >
                {/* Custom SVG Pointer */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="drop-shadow-md"
                >
                  <path
                    d="M3 3l7 18 3-7 7-3L3 3z"
                    fill={cursor.userColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Name Tag Pill */}
                <div
                  style={{ backgroundColor: cursor.userColor }}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-md flex items-center gap-1 whitespace-nowrap"
                >
                  <span>{cursor.userName}</span>
                </div>

                {/* Live Typing Bubble next to cursor */}
                {remoteTyping[cursor.userId] && (
                  <div className="absolute top-6 left-5 bg-background/95 border border-border shadow-xl rounded-lg px-2.5 py-1 text-[11px] text-foreground font-medium max-w-[200px] truncate animate-in fade-in zoom-in-95">
                    <span className="text-muted-foreground mr-1">sedang mengetik:</span>
                    <span className="italic font-semibold">"{remoteTyping[cursor.userId].text}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* FLOATING TOOLS DOCK (Figma / Miro Style) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border/80 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveTool("select")}
              className={`p-2 rounded-xl transition-all ${activeTool === "select"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Select & Move (V)"
            >
              <MousePointer className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("sticky")}
              className={`p-2 rounded-xl transition-all ${activeTool === "sticky"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Sticky Note (S)"
            >
              <StickyNote className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("rect")}
              className={`p-2 rounded-xl transition-all ${activeTool === "rect"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Kotak (R)"
            >
              <Square className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("circle")}
              className={`p-2 rounded-xl transition-all ${activeTool === "circle"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Lingkaran (O)"
            >
              <Circle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("diamond")}
              className={`p-2 rounded-xl transition-all ${activeTool === "diamond"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Diamond Keputusan (D)"
            >
              <Diamond className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("text")}
              className={`p-2 rounded-xl transition-all ${activeTool === "text"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Teks Bebas (T)"
            >
              <Type className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("arrow")}
              className={`p-2 rounded-xl transition-all ${activeTool === "arrow"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Panah Penghubung (A)"
            >
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("pen")}
              className={`p-2 rounded-xl transition-all ${activeTool === "pen"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Gambar Bebas / Pen (P)"
            >
              <PenTool className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTool("eraser")}
              className={`p-2 rounded-xl transition-all ${activeTool === "eraser"
                  ? "bg-rose-500 text-white shadow-md scale-105"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              title="Penghapus / Eraser (E) - Klik pada elemen atau garis untuk menghapus"
            >
              <Eraser className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-border/80 mx-1" />

            {/* Color Swatches */}
            <div className="flex items-center gap-1 px-1">
              {PALETTE_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c.bg}
                  type="button"
                  onClick={() => {
                    setSelectedColor(c.bg);
                    if (selectedElementId) {
                      setElements((prev) => {
                        const updated = prev.map((el) =>
                          el.id === selectedElementId ? { ...el, color: c.bg, textColor: c.text } : el
                        );
                        const socket = getSocket();
                        if (socket) {
                          socket.emit("whiteboard-change", {
                            whiteboardId,
                            elements: updated,
                            senderId: currentUser.id,
                          });
                        }
                        return updated;
                      });
                    }
                  }}
                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                  className={`h-5 w-5 rounded-full border transition-transform ${selectedColor === c.bg ? "scale-125 ring-2 ring-emerald-500" : "hover:scale-110"
                    }`}
                  title={c.name}
                />
              ))}
            </div>

            {selectedElementId && (
              <>
                <div className="h-5 w-px bg-border/80 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    setElements((prev) => {
                      const updated = prev.filter((el) => el.id !== selectedElementId);
                      const socket = getSocket();
                      if (socket) {
                        socket.emit("whiteboard-change", {
                          whiteboardId,
                          elements: updated,
                          senderId: currentUser.id,
                        });
                      }
                      return updated;
                    });
                    setSelectedElementId(null);
                  }}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Hapus Elemen (Del)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3. SIDEBAR KOLOM KOMENTAR & PERTANYAAN REAL-TIME */}
        {isCommentsOpen && (
          <aside className="w-80 sm:w-88 border-l border-border/80 bg-background/95 backdrop-blur-md flex flex-col z-20 shrink-0 shadow-xl transition-all">
            {/* Sidebar Header */}
            <div className="h-12 border-b border-border/80 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Pertanyaan &amp; Diskusi
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  {comments.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCommentsOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Tutup Panel Komentar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List of Comments / Questions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground p-4">
                  <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Belum ada pertanyaan</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ajukan pertanyaan di bawah untuk berdiskusi langsung dengan tim.
                  </p>
                </div>
              ) : (
                comments.map((c) => {
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs space-y-1.5 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            style={{ backgroundColor: c.userColor || "#6366f1" }}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          >
                            {c.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {c.userName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Tautan ke shape jika disematkan */}
                      {c.elementId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedElementId(c.elementId || null);
                            const elem = elements.find((e) => e.id === c.elementId);
                            if (elem) {
                              setPan({
                                x: -elem.x * zoom + 200,
                                y: -elem.y * zoom + 200,
                              });
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 text-left truncate w-full"
                          title="Klik untuk sorot elemen di kanvas"
                        >
                          <Pin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">
                            Disematkan di: {c.elementLabel || "Elemen Shape"}
                          </span>
                        </button>
                      )}

                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {c.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input Form */}
            <form onSubmit={handleSendComment} className="p-3 border-t border-border/80 bg-background/50">
              {/* Attach to Selected Element Tag */}
              {selectedElement && (
                <div className="mb-2 flex items-center justify-between bg-muted/60 px-2 py-1 rounded-md text-[11px]">
                  <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                    <Pin className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      Sematkan ke: <span className="font-semibold text-foreground">{selectedElement.content?.slice(0, 20) || selectedElement.type}</span>
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={attachToElement}
                    onChange={(e) => setAttachToElement(e.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-500 rounded"
                    title="Centang untuk menyematkan ke elemen terpilih"
                  />
                </div>
              )}

              <div className="relative">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Ajukan pertanyaan atau komentar..."
                  rows={2}
                  className="w-full rounded-lg border border-border/80 bg-muted/30 p-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/60 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSendingComment}
                  className="absolute right-2 bottom-2.5 h-6 w-6 rounded-md bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-xs"
                  title="Kirim Pertanyaan (Enter)"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Tekan <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> untuk mengirim seketika ke tim
              </p>
            </form>
          </aside>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Papan Tulis */}
      <ConfirmationDialog
        open={!!wbToDelete}
        onOpenChange={(open) => !open && setWbToDelete(null)}
        title="Hapus Papan Tulis?"
        description={`Apakah Anda yakin ingin menghapus papan tulis "${wbToDelete?.title}"? Data yang sudah dihapus tidak dapat dipulihkan.`}
        confirmText="Ya, Hapus Papan Tulis"
        cancelText="Batal"
        variant="destructive"
        onConfirm={async () => {
          if (wbToDelete) {
            await handleDeleteWhiteboard(wbToDelete.id);
            setWbToDelete(null);
          }
        }}
      />
    </div>
  );
}
