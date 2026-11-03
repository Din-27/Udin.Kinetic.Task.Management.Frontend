"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  updateEdge,
  Node,
  Edge,
  Connection,
  NodeProps,
  EdgeProps,
  getSmoothStepPath,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Workflow,
  Sparkles,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileDown,
  Save,
  RotateCcw,
  Move,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  FileCode,
  FileImage,
  Database,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  Minus,
  HelpCircle,
  Play,
  Square,
  GitBranch,
  StickyNote,
  StopCircle,
  Key,
  Sliders,
  Table,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
  FolderOpen,
  MoreVertical,
  SlidersHorizontal,
  Shapes,
  Palette,
  Link2,
  X,
  Type,
  Maximize,
  LayoutGrid,
  Share2,
  Copy,
  Pencil,
  Upload,
  MessageSquare,
  Send,
  AlertCircle,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastAlert } from "@/components/ui/alert-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFlowchartsQuery,
  useSaveFlowchartMutation,
  useDeleteFlowchartMutation,
  useGenerateFlowchartMutation,
  useShareFlowchartToChatMutation,
  fetchFlowchartById,
} from "@/lib/hooks/useFlowchartQueries";
import { Workspace, User } from "@/types";

export type FlowchartNodeType =
  | "START"
  | "END"
  | "PROCESS"
  | "DECISION"
  | "DATABASE"
  | "INPUT_OUTPUT"
  | "SUBPROCESS"
  | "NOTE"
  | "IMAGE";

export type FlowchartArrowStyle = "directed" | "bidirectional" | "line" | "dashed";
export type FlowchartPathRouting = "orthogonal" | "curved" | "straight";

export interface FlowchartNodeData {
  label: string;
  description?: string;
  nodeType: FlowchartNodeType;
  color?: string;
  borderStyle?: "solid" | "dashed" | "double";
  imageUrl?: string;
  width?: number;
  height?: number;
  erdFields?: string[];
}

export interface FlowchartDiagramNode {
  id: string;
  type: FlowchartNodeType;
  label: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  borderStyle?: "solid" | "dashed" | "double";
  imageUrl?: string;
  erdFields?: string[];
}

export interface FlowchartDiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  color?: string;
  arrowStyle?: FlowchartArrowStyle;
  routing?: FlowchartPathRouting;
  strokeWidth?: number;
}

export interface FlowchartDiagram {
  id: string;
  workspaceId: string;
  userId?: string;
  creatorName?: string;
  title: string;
  description?: string;
  prompt?: string;
  nodes: FlowchartDiagramNode[];
  edges: FlowchartDiagramEdge[];
  createdAt: string;
  updatedAt: string;
}

export const generateUniqueFlowId = () =>
  `flow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const DEFAULT_DIAGRAM: FlowchartDiagram = {
  id: "",
  workspaceId: "default",
  title: "Alur Autentikasi & Verifikasi Akun",
  description: "Contoh diagram alur proses autentikasi dan penanganan akun.",
  prompt: "Alur login pengguna dengan verifikasi OTP dan redirect ke dashboard",
  nodes: [
    { id: "node-start", type: "START", label: "Mulai", x: 380, y: 40, width: 140, height: 50, color: "#10b981" },
    { id: "node-input", type: "INPUT_OUTPUT", label: "Input Email & Password", x: 365, y: 140, width: 170, height: 60, color: "#06b6d4" },
    {
      id: "node-query",
      type: "DATABASE",
      label: "users",
      erdFields: ["id: UUID [PK]", "email: VARCHAR(255)", "password_hash: VARCHAR", "role: ENUM", "created_at: TIMESTAMP"],
      x: 350,
      y: 250,
      width: 200,
      height: 180,
      color: "#8b5cf6",
    },
    { id: "node-check", type: "DECISION", label: "Password Valid?", x: 360, y: 480, width: 180, height: 80, color: "#f59e0b" },
    { id: "node-otp", type: "DECISION", label: "2FA Aktif?", x: 360, y: 620, width: 180, height: 80, color: "#f59e0b" },
    { id: "node-send-otp", type: "PROCESS", label: "Kirim Kode OTP WhatsApp", x: 120, y: 760, width: 180, height: 60, color: "#3b82f6" },
    { id: "node-session", type: "PROCESS", label: "Buat JWT Session Token", x: 365, y: 760, width: 170, height: 60, color: "#3b82f6" },
    { id: "node-success", type: "END", label: "Redirect ke Dashboard", x: 375, y: 880, width: 150, height: 50, color: "#10b981" },
    { id: "node-fail", type: "END", label: "Tolak & Tampilkan Error", x: 640, y: 495, width: 160, height: 50, color: "#f43f5e" },
  ],
  edges: [
    { id: "e1", source: "node-start", target: "node-input", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
    { id: "e2", source: "node-input", target: "node-query", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
    { id: "e3", source: "node-query", target: "node-check", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
    { id: "e4", source: "node-check", target: "node-otp", sourceHandle: "bottom", targetHandle: "top", label: "Ya", arrowStyle: "directed" },
    { id: "e5", source: "node-check", target: "node-fail", sourceHandle: "right", targetHandle: "left", label: "Salah", arrowStyle: "directed", color: "#f43f5e" },
    { id: "e6", source: "node-otp", target: "node-send-otp", sourceHandle: "left", targetHandle: "top", label: "Ya", arrowStyle: "directed" },
    { id: "e7", source: "node-send-otp", target: "node-session", sourceHandle: "right", targetHandle: "left", arrowStyle: "directed" },
    { id: "e8", source: "node-otp", target: "node-session", sourceHandle: "bottom", targetHandle: "top", label: "Tidak", arrowStyle: "directed" },
    { id: "e9", source: "node-session", target: "node-success", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const QUICK_PROMPTS = [
  "Alur Registrasi Pengguna & Verifikasi OTP WhatsApp",
  "SOP Penanganan Bug Kritis & Hotfix Deployment",
  "Alur Checkout E-Commerce & Notifikasi Webhook Pembayaran",
  "Siklus Hidup Tiket Task dari Backlog ke Done",
];

const SHAPE_DEFINITIONS: {
  type: FlowchartNodeType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] = [
    { type: "START", title: "Mulai (Start)", desc: "Awal proses alur", icon: Play },
    { type: "PROCESS", title: "Proses (Process)", desc: "Langkah operasi atau aksi", icon: Square },
    { type: "DECISION", title: "Keputusan (Branch)", desc: "Kondisi Ya / Tidak", icon: GitBranch },
    { type: "DATABASE", title: "Basis Data (DB)", desc: "Operasi query / ERD Tabel", icon: Database },
    { type: "INPUT_OUTPUT", title: "Data I/O", desc: "Masukan atau luaran pengguna", icon: ArrowLeftRight },
    { type: "SUBPROCESS", title: "Sub-Proses", desc: "Modul / fungsi eksternal", icon: Layers },
    { type: "NOTE", title: "Catatan (Note)", desc: "Anotasi & catatan alur", icon: StickyNote },
    { type: "END", title: "Selesai (End)", desc: "Akhir dari proses", icon: StopCircle },
    { type: "IMAGE", title: "Gambar (Image)", desc: "Upload gambar / diagram ke kanvas", icon: FileImage },
  ];

/**
 * Custom React Flow Edge: ShadowStepEdge
 * Menghasilkan garis siku 90° (Draw.io smooth step) dengan efek bayangan
 * yang otomatis berkelok persis mengikuti lekukan panah.
 */
export function ShadowStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  label,
  selected,
}: EdgeProps) {
  // Cek apakah panah mengarah ke shape yang sama (self-loop / loop back)
  const isCloseLoop = Math.hypot(targetX - sourceX, targetY - sourceY) < 180 && sourcePosition && targetPosition;

  let edgePath = "";
  let labelX = 0;
  let labelY = 0;

  if (isCloseLoop && sourcePosition === targetPosition) {
    // Jika source dan target di sisi yang sama persis, buat loop keluar
    const loopOffset = 45;
    const p1x = sourcePosition === Position.Right ? sourceX + loopOffset : sourcePosition === Position.Left ? sourceX - loopOffset : sourceX;
    const p1y = sourcePosition === Position.Bottom ? sourceY + loopOffset : sourcePosition === Position.Top ? sourceY - loopOffset : sourceY;
    const p2x = targetPosition === Position.Right ? targetX + loopOffset : targetPosition === Position.Left ? targetX - loopOffset : targetX;
    const p2y = targetPosition === Position.Bottom ? targetY + loopOffset : targetPosition === Position.Top ? targetY - loopOffset : targetY;

    edgePath = `M ${sourceX} ${sourceY} Q ${p1x} ${p1y} ${(p1x + p2x) / 2} ${(p1y + p2y) / 2} T ${targetX} ${targetY}`;
    labelX = (p1x + p2x) / 2;
    labelY = (p1y + p2y) / 2;
  } else if (isCloseLoop) {
    // Siku orthogonal loop keluar shape (misal dari Kanan ke Atas)
    const loopOffset = 40;
    const p1x = sourcePosition === Position.Right ? sourceX + loopOffset : sourcePosition === Position.Left ? sourceX - loopOffset : sourceX;
    const p1y = sourcePosition === Position.Bottom ? sourceY + loopOffset : sourcePosition === Position.Top ? sourceY - loopOffset : sourceY;

    const p2x = targetPosition === Position.Right ? targetX + loopOffset : targetPosition === Position.Left ? targetX - loopOffset : targetX;
    const p2y = targetPosition === Position.Bottom ? targetY + loopOffset : targetPosition === Position.Top ? targetY - loopOffset : targetY;

    const cornerX = sourcePosition === Position.Right || sourcePosition === Position.Left ? p1x : p2x;
    const cornerY = sourcePosition === Position.Bottom || sourcePosition === Position.Top ? p1y : p2y;

    edgePath = `M ${sourceX} ${sourceY} L ${p1x} ${p1y} L ${cornerX} ${cornerY} L ${p2x} ${p2y} L ${targetX} ${targetY}`;
    labelX = cornerX;
    labelY = cornerY;
  } else {
    // Jalur Siku Orthogonal Presisi (Tanpa Bergelombang, Menyesuaikan Jarak Tarik Shape ke Shape)
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const isSourceVert = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
    const isTargetVert = targetPosition === Position.Top || targetPosition === Position.Bottom;

    if (sourcePosition === Position.Right && targetPosition === Position.Right) {
      // Loop-back sisi kanan: keluar ke kanan agar tidak menembus badan shape
      const rightX = Math.max(sourceX, targetX) + 40;
      edgePath = `M ${sourceX} ${sourceY} L ${rightX} ${sourceY} L ${rightX} ${targetY} L ${targetX} ${targetY}`;
      labelX = rightX;
      labelY = Math.round((sourceY + targetY) / 2);
    } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
      // Loop-back sisi kiri: keluar ke kiri agar tidak menembus badan shape
      const leftX = Math.min(sourceX, targetX) - 40;
      edgePath = `M ${sourceX} ${sourceY} L ${leftX} ${sourceY} L ${leftX} ${targetY} L ${targetX} ${targetY}`;
      labelX = leftX;
      labelY = Math.round((sourceY + targetY) / 2);
    } else if (sourcePosition === Position.Bottom && targetPosition === Position.Bottom) {
      // Loop-back sisi bawah: keluar ke bawah
      const bottomY = Math.max(sourceY, targetY) + 40;
      edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${bottomY} L ${targetX} ${bottomY} L ${targetX} ${targetY}`;
      labelX = Math.round((sourceX + targetX) / 2);
      labelY = bottomY;
    } else if (sourcePosition === Position.Top && targetPosition === Position.Top) {
      // Loop-back sisi atas: keluar ke atas
      const topY = Math.min(sourceY, targetY) - 40;
      edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${topY} L ${targetX} ${topY} L ${targetX} ${targetY}`;
      labelX = Math.round((sourceX + targetX) / 2);
      labelY = topY;
    } else if (Math.abs(dx) <= 6 && isSourceVert && isTargetVert) {
      // 1. Garis vertikal lurus sempurna jika segaris
      edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${targetY}`;
      labelX = sourceX;
      labelY = Math.round((sourceY + targetY) / 2);
    } else if (Math.abs(dy) <= 6 && !isSourceVert && !isTargetVert) {
      // 2. Garis horizontal lurus sempurna jika segaris
      edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${sourceY}`;
      labelX = Math.round((sourceX + targetX) / 2);
      labelY = sourceY;
    } else if (isSourceVert && isTargetVert) {
      // 3. Siku orthogonal atas-bawah (3 segmen bersih)
      const midY = Math.round((sourceY + targetY) / 2);
      edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
      labelX = Math.round((sourceX + targetX) / 2);
      labelY = midY;
    } else if (!isSourceVert && !isTargetVert) {
      // 4. Siku orthogonal kanan-kiri (3 segmen bersih)
      const midX = Math.round((sourceX + targetX) / 2);
      edgePath = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
      labelX = midX;
      labelY = Math.round((sourceY + targetY) / 2);
    } else if (isSourceVert && !isTargetVert) {
      // 5. Belokan siku 90 derajat tunggal (Source Vertikal, Target Horizontal)
      edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${targetY} L ${targetX} ${targetY}`;
      const seg1Len = Math.abs(targetY - sourceY);
      const seg2Len = Math.abs(targetX - sourceX);
      if (seg1Len >= seg2Len) {
        labelX = sourceX;
        labelY = Math.round((sourceY + targetY) / 2);
      } else {
        labelX = Math.round((sourceX + targetX) / 2);
        labelY = targetY;
      }
    } else {
      // 6. Belokan siku 90 derajat tunggal (Source Horizontal, Target Vertikal)
      edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${sourceY} L ${targetX} ${targetY}`;
      const seg1Len = Math.abs(targetX - sourceX);
      const seg2Len = Math.abs(targetY - sourceY);
      if (seg1Len >= seg2Len) {
        labelX = Math.round((sourceX + targetX) / 2);
        labelY = sourceY;
      } else {
        labelX = targetX;
        labelY = Math.round((sourceY + targetY) / 2);
      }
    }
  }

  const strokeWidth = Number(style.strokeWidth || (selected ? 2.5 : 2));
  const strokeColor = selected ? "#3b82f6" : style.stroke || "#475569";

  return (
    <>
      {/* Invisible wider path for easier clicking & selecting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={26}
        className="react-flow__edge-interaction cursor-pointer"
      />

      {/* 1. Bayangan Arrow (Arrow Shadow) - Otomatis Berkelok Persis Mengikuti edgePath */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(15, 23, 42, 0.16)"
        strokeWidth={strokeWidth + 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={style.strokeDasharray}
        transform="translate(1.5, 2)"
        className="pointer-events-none"
      />

      {/* 2. Garis Utama Panah (Default 1 Arah ke target) */}
      <path
        id={id}
        style={{ ...style, stroke: strokeColor, strokeWidth }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Label Panah: Solid Putih, Border Tegas, Teks Hitam Pekat (Tidak Pernah Tertimpa) */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`} className="cursor-pointer">
          <rect
            x={-Math.max(60, String(label).length * 8 + 20) / 2}
            y={-12}
            width={Math.max(60, String(label).length * 8 + 20)}
            height={24}
            rx={6}
            fill="#ffffff"
            stroke={selected ? "#3b82f6" : "#475569"}
            strokeWidth={selected ? 2 : 1.5}
            className="shadow-sm"
          />
          <text
            textAnchor="middle"
            dy={4}
            fontSize={11}
            fontWeight={700}
            fill="#0f172a"
            fontFamily="system-ui, -apple-system, sans-serif"
            className="select-none pointer-events-none"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

export const edgeTypes = {
  shadowStep: ShadowStepEdge,
};

/**
 * Custom React Flow Node: 2D Flat Shape dengan 4 Connection Handles (Top, Right, Bottom, Left)
 */
export function FlowchartCustomNode({ data, selected }: NodeProps<FlowchartNodeData>) {
  const nodeType = data.nodeType || "PROCESS";
  const color = data.color || "#3b82f6";
  const width = data.width || 160;
  const height = data.height || 65;
  const borderStyle = data.borderStyle || "solid";

  const borderClass =
    borderStyle === "dashed"
      ? "border-dashed"
      : borderStyle === "double"
        ? "border-double border-4"
        : "border-solid";

  const baseClass = `relative select-none transition-all shadow-none ${selected
    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
    : "hover:border-primary/80"
    } ${borderClass}`;

  // 4 Connection Handles di 4 Sisi (Top, Right, Bottom, Left) untuk Menarik & Menghubungkan Panah Bebas
  const renderHandles = () => (
    <>
      {/* Atas */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md"
        title="Titik Sambung Atas"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md opacity-0 pointer-events-none"
      />

      {/* Kanan */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md"
        title="Titik Sambung Kanan"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md opacity-0 pointer-events-none"
      />

      {/* Bawah */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md"
        title="Titik Sambung Bawah"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md opacity-0 pointer-events-none"
      />

      {/* Kiri */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md"
        title="Titik Sambung Kiri"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-blue-600 hover:!bg-blue-700 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-150 cursor-crosshair z-30 shadow-md opacity-0 pointer-events-none"
      />
    </>
  );

  let shapeEl = null;

  switch (nodeType) {
    case "START":
    case "END":
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: `${color}15`,
            borderColor: color,
          }}
          className={`rounded-full border-2 flex items-center justify-center px-4 py-2 ${baseClass}`}
        >
          {renderHandles()}
          <div className="flex items-center gap-1.5 text-center">
            {nodeType === "START" ? (
              <Play className="h-3 w-3 shrink-0" style={{ color }} />
            ) : (
              <StopCircle className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            )}
            <span className="text-xs font-semibold text-foreground line-clamp-1">{data.label}</span>
          </div>
        </div>
      );
      break;

    case "DECISION":
      shapeEl = (
        <div
          style={{ width, height }}
          className={`flex items-center justify-center p-2 text-center relative bg-transparent ${baseClass}`}
        >
          {renderHandles()}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={`${color}18`}
              stroke={selected ? "#2563eb" : color}
              strokeWidth={selected ? "3.2" : "2.2"}
              strokeDasharray={borderStyle === "dashed" ? "4,3" : undefined}
            />
          </svg>
          <span className="text-xs font-semibold text-foreground z-10 px-5 line-clamp-2 max-w-[85%] select-none pointer-events-none">
            {data.label}
          </span>
        </div>
      );
      break;

    case "DATABASE": {
      const hasErdFields = Boolean(data.erdFields && data.erdFields.length > 0);
      if (hasErdFields) {
        shapeEl = (
          <div
            style={{
              width,
              minHeight: height,
              borderColor: color,
            }}
            className={`rounded-lg border-2 bg-card text-card-foreground shadow-md overflow-hidden flex flex-col text-left ${baseClass}`}
          >
            {renderHandles()}
            {/* Header ERD Table */}
            <div
              style={{ backgroundColor: color }}
              className="px-2.5 py-1.5 flex items-center justify-between text-white shrink-0 shadow-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-bold truncate leading-none">{data.label}</span>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/30 text-white/95 uppercase tracking-wider font-semibold shrink-0 ml-1">
                TABLE
              </span>
            </div>

            {/* List Field ERD */}
            <div className="p-1 space-y-0.5 divide-y divide-border/40 text-left bg-muted/20 flex-1 overflow-hidden">
              {data.erdFields!.map((field, idx) => {
                const isPk =
                  field.toLowerCase().includes("[pk]") ||
                  field.toLowerCase().includes("(pk)") ||
                  field.toLowerCase().startsWith("id");
                const parts = field.split(":");
                const colName = parts[0]?.replace(/\[.*\]|\(.*\)/g, "").trim();
                const colType = parts[1]?.trim() || (isPk ? "UUID" : "");

                return (
                  <div key={idx} className="flex items-center justify-between gap-1.5 py-1 px-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isPk ? (
                        <Key className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                      )}
                      <span className={`truncate ${isPk ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                        {colName}
                      </span>
                    </div>
                    {colType && (
                      <span className="font-mono text-[9px] text-muted-foreground shrink-0 uppercase tracking-tight">
                        {colType}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      } else {
        shapeEl = (
          <div
            style={{
              width,
              height,
              backgroundColor: `${color}12`,
              borderColor: color,
            }}
            className={`rounded-md border-2 border-t-4 flex flex-col items-center justify-center p-2 text-center ${baseClass}`}
          >
            {renderHandles()}
            <div className="flex items-center gap-1.5 mb-0.5">
              <Database className="h-3 w-3" style={{ color }} />
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider" style={{ color }}>
                DB
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground line-clamp-2">{data.label}</span>
          </div>
        );
      }
      break;
    }

    case "INPUT_OUTPUT":
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: `${color}15`,
            borderColor: color,
            transform: "skewX(-12deg)",
          }}
          className={`rounded-sm border-2 flex items-center justify-center p-2 text-center ${baseClass}`}
        >
          {renderHandles()}
          <span
            style={{ transform: "skewX(12deg)" }}
            className="text-xs font-semibold text-foreground line-clamp-2 px-2"
          >
            {data.label}
          </span>
        </div>
      );
      break;

    case "SUBPROCESS":
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: `${color}15`,
            borderColor: color,
          }}
          className={`rounded-lg border-2 flex items-center justify-between px-2 text-center relative overflow-hidden ${baseClass}`}
        >
          {renderHandles()}
          <div className="w-2.5 h-full border-r border-current shrink-0 opacity-40 mr-1" style={{ borderColor: color }} />
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{data.label}</span>
            {data.description && (
              <span className="text-[10px] text-muted-foreground line-clamp-1 font-mono">{data.description}</span>
            )}
          </div>
          <div className="w-2.5 h-full border-l border-current shrink-0 opacity-40 ml-1" style={{ borderColor: color }} />
        </div>
      );
      break;

    case "NOTE":
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: "#fef08a",
            borderColor: "#eab308",
          }}
          className={`rounded border-2 border-l-4 p-2.5 text-zinc-900 ${baseClass}`}
        >
          {renderHandles()}
          <span className="text-xs font-medium line-clamp-3 italic leading-snug">{data.label}</span>
        </div>
      );
      break;

    case "IMAGE":
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: "#f8fafc",
            borderColor: color,
          }}
          className={`rounded-lg border-2 flex flex-col justify-between overflow-hidden bg-background ${baseClass}`}
        >
          {renderHandles()}
          <div className="flex-1 w-full flex items-center justify-center p-1 bg-muted/40 overflow-hidden relative">
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={data.label}
                className="max-h-full max-w-full object-contain pointer-events-none select-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                <FileImage className="h-6 w-6 opacity-60 text-primary" />
                <span className="text-[10px] font-medium">Klik Edit untuk Gambar</span>
              </div>
            )}
          </div>
          <div className="h-6 px-2 bg-muted/80 border-t border-border flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-foreground truncate">{data.label}</span>
          </div>
        </div>
      );
      break;

    case "PROCESS":
    default:
      shapeEl = (
        <div
          style={{
            width,
            height,
            backgroundColor: `${color}12`,
            borderColor: color,
          }}
          className={`rounded-lg border-2 flex flex-col justify-center px-3 py-2 text-center ${baseClass}`}
        >
          {renderHandles()}
          <span className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{data.label}</span>
          {data.description && (
            <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-mono">
              {data.description}
            </span>
          )}
        </div>
      );
      break;
  }

  return <div className="group">{shapeEl}</div>;
}

export const nodeTypes = {
  flowchartNode: FlowchartCustomNode,
};

interface FlowchartViewProps {
  workspace: Workspace;
  currentUser: User;
  initialDiagramId?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function FlowchartView({
  workspace,
  currentUser,
  initialDiagramId,
  isSidebarCollapsed,
  onToggleSidebar,
}: FlowchartViewProps) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvas
        workspace={workspace}
        currentUser={currentUser}
        initialDiagramId={initialDiagramId}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
      />
    </ReactFlowProvider>
  );
}

function FlowchartCanvas({
  workspace,
  currentUser,
  initialDiagramId,
  isSidebarCollapsed,
  onToggleSidebar,
}: FlowchartViewProps) {
  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  // TanStack Query: Ambil daftar flowchart & mutations
  const { data: serverFlowcharts, refetch: refetchSavedDiagrams } = useFlowchartsQuery(
    workspace?.id || "default",
    currentUser?.id
  );
  const saveFlowchartMutation = useSaveFlowchartMutation();
  const deleteFlowchartMutation = useDeleteFlowchartMutation();
  const generateFlowchartMutation = useGenerateFlowchartMutation();
  const shareFlowchartToChatMutation = useShareFlowchartToChatMutation();

  const [title, setTitle] = useState(DEFAULT_DIAGRAM.title);
  const [description, setDescription] = useState(DEFAULT_DIAGRAM.description);
  const [currentId, setCurrentId] = useState<string>(() => initialDiagramId || generateUniqueFlowId());
  const [savedDiagrams, setSavedDiagrams] = useState<FlowchartDiagram[]>([]);

  useEffect(() => {
    if (serverFlowcharts && Array.isArray(serverFlowcharts)) {
      setSavedDiagrams(serverFlowcharts);
    }
  }, [serverFlowcharts]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; content: string } | null>(null);
  const fileInputPromptRef = useRef<HTMLInputElement>(null);

  // Status Simpan & Hapus Diagram
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [targetDiagramToDelete, setTargetDiagramToDelete] = useState<{ id: string; title: string } | null>(null);

  // Edit Judul Diagram Inline
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(DEFAULT_DIAGRAM.title);

  // Modal Share Diagram
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState<"link" | "chat" | "export">("link");
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [chatNote, setChatNote] = useState("");
  const [isSendingToChat, setIsSendingToChat] = useState(false);

  // Konversi Diagram Node ke format React Flow Node
  const initialNodes: Node<FlowchartNodeData>[] = useMemo(() => {
    return DEFAULT_DIAGRAM.nodes.map((n) => ({
      id: n.id,
      type: "flowchartNode",
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        description: n.description,
        nodeType: n.type,
        color: n.color,
        borderStyle: n.borderStyle,
        imageUrl: n.imageUrl,
        width: n.width,
        height: n.height,
      },
    }));
  }, []);

  // Konversi Diagram Edge ke format React Flow Edge
  const initialEdges: Edge[] = useMemo(() => {
    return DEFAULT_DIAGRAM.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "shadowStep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: e.color || "#475569",
      },
      style: {
        stroke: e.color || "#475569",
        strokeWidth: e.strokeWidth || 2,
      },
    }));
  }, []);

  const [nodes, setNodes] = useState<Node<FlowchartNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Selected State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Connecting State (+ Arrow mode via klik antar shape)
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // State Minimize AI Prompt Bar & Tampilan MiniMap
  const [isAiPromptMinimized, setIsAiPromptMinimized] = useState(false);
  // Otomatis minimize input text AI jika ada sidebar yang hidup/aktif (Properties Shape, Properties Arrow, atau Sidebar Utama)
  useEffect(() => {
    const isSidebarActive = Boolean(selectedNodeId || selectedEdgeId || !isSidebarCollapsed);
    if (isSidebarActive) {
      setIsAiPromptMinimized(true);
    }
  }, [selectedNodeId, selectedEdgeId, isSidebarCollapsed]);

  // Ref Reconnect Edge via Drag and Drop
  const edgeUpdateSuccessful = useRef(true);

  // Upload Gambar File Ref
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Upload Diagram JSON File Ref
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Node & Edge Changes via React Flow built-in handlers
  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Algoritma Pencari Sisi Bebas (Free Handle) agar panah tidak duplikat menumpuk di sisi yang itu-itu saja
  const findAvailableHandles = useCallback(
    (
      sourceId: string,
      targetId: string,
      existingEdges: Edge[],
      suggestedSource?: string | null,
      suggestedTarget?: string | null
    ): { sourceHandle: string; targetHandle: string } => {
      // 1. Jika menghubungkan ke shape yang sama (self-loop / loop back)
      if (sourceId === targetId) {
        const selfEdges = existingEdges.filter((e) => e.source === sourceId && e.target === targetId);
        const usedCombos = new Set(selfEdges.map((e) => `${e.sourceHandle || "right"}->${e.targetHandle || "top"}`));

        const loopCandidates: [string, string][] = [
          ["right", "top"],
          ["bottom", "left"],
          ["left", "bottom"],
          ["top", "right"],
          ["right", "bottom"],
          ["left", "top"],
          ["bottom", "right"],
          ["top", "left"],
        ];

        if (suggestedSource && suggestedTarget && suggestedSource !== suggestedTarget) {
          return { sourceHandle: suggestedSource, targetHandle: suggestedTarget };
        }
        if (suggestedSource) {
          const match = loopCandidates.find(([s]) => s === suggestedSource && !usedCombos.has(`${s}->${suggestedTarget || ""}`));
          if (match) return { sourceHandle: match[0], targetHandle: match[1] };
        }

        for (const [s, t] of loopCandidates) {
          if (!usedCombos.has(`${s}->${t}`)) {
            return { sourceHandle: s, targetHandle: t };
          }
        }
        return { sourceHandle: "right", targetHandle: "top" };
      }

      // 2. Jika menghubungkan dua shape berbeda
      const edgesBetween = existingEdges.filter(
        (e) => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)
      );

      // Jika user sudah spesifik mendrag dari handle tertentu dan mendrop di handle tertentu
      if (suggestedSource && suggestedTarget) {
        return { sourceHandle: suggestedSource, targetHandle: suggestedTarget };
      }

      const usedSourceHandles = new Set(edgesBetween.filter((e) => e.source === sourceId).map((e) => e.sourceHandle || "bottom"));
      const usedTargetHandles = new Set(edgesBetween.filter((e) => e.target === targetId).map((e) => e.targetHandle || "top"));

      if (suggestedSource && !suggestedTarget) {
        const targetOpts = ["top", "left", "right", "bottom"].filter((h) => h !== suggestedSource);
        const freeTarget = targetOpts.find((h) => !usedTargetHandles.has(h)) || targetOpts[0];
        return { sourceHandle: suggestedSource, targetHandle: freeTarget };
      }

      if (!suggestedSource && suggestedTarget) {
        const sourceOpts = ["bottom", "right", "left", "top"].filter((h) => h !== suggestedTarget);
        const freeSource = sourceOpts.find((h) => !usedSourceHandles.has(h)) || sourceOpts[0];
        return { sourceHandle: freeSource, targetHandle: suggestedTarget };
      }

      // Pasangan kandidat orthogonal: DEFAULT UTAMA = Bawah ke Atas (bottom -> top)
      const pairCandidates: [string, string][] = [
        ["bottom", "top"],
        ["right", "left"],
        ["top", "bottom"],
        ["left", "right"],
        ["bottom", "left"],
        ["top", "right"],
        ["right", "top"],
        ["left", "bottom"],
      ];

      const usedPairs = new Set(edgesBetween.map((e) => `${e.sourceHandle || "bottom"}->${e.targetHandle || "top"}`));

      for (const [s, t] of pairCandidates) {
        if (!usedPairs.has(`${s}->${t}`)) {
          return { sourceHandle: s, targetHandle: t };
        }
      }

      return { sourceHandle: "bottom", targetHandle: "top" };
    },
    []
  );

  // Connect handler: membuat panah 1 arah default dengan penentuan sisi bebas otomatis
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const { sourceHandle, targetHandle } = findAvailableHandles(
        connection.source,
        connection.target,
        edges,
        connection.sourceHandle,
        connection.targetHandle
      );

      const newEdge: Edge = {
        ...connection,
        source: connection.source,
        target: connection.target,
        sourceHandle,
        targetHandle,
        id: `e-${Date.now()}`,
        type: "shadowStep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: "#475569",
        },
        style: {
          stroke: "#475569",
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      toastAlert({
        title: "Panah Terhubung!",
        description: `Panah terhubung di sisi [${sourceHandle} → ${targetHandle}].`,
        variant: "success",
      });
    },
    [edges, findAvailableHandles]
  );

  // Reconnect Edge Drag & Drop Handlers (Menyesuaikan sisi dari & ke langsung di point shape)
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeUpdateSuccessful.current = true;
    const finalSourceHandle = newConnection.sourceHandle || oldEdge.sourceHandle || "bottom";
    const finalTargetHandle = newConnection.targetHandle || oldEdge.targetHandle || "top";

    setEdges((els) => {
      const updated = updateEdge(
        oldEdge,
        {
          ...newConnection,
          sourceHandle: finalSourceHandle,
          targetHandle: finalTargetHandle,
        },
        els
      );
      return updated.map((e) => (e.id.startsWith("reactflow__edge-") ? { ...e, id: oldEdge.id } : e));
    });

    setSelectedEdgeId(oldEdge.id);

    toastAlert({
      title: "Panah Dipindahkan!",
      description: `Titik sambung panah dipindahkan ke sisi [${finalSourceHandle} → ${finalTargetHandle}].`,
      variant: "success",
    });
  }, []);

  const onEdgeUpdateEnd = useCallback((_: any, edge: Edge) => {
    edgeUpdateSuccessful.current = true;
  }, []);

  // Live Update Data Node untuk Sidebar Properties Kanan
  const handleUpdateSelectedNodeData = useCallback(
    (updates: Partial<FlowchartNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedNodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              ...updates,
            },
          };
        })
      );
    },
    [selectedNodeId]
  );

  // Selection Change Handler
  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
    if (selNodes.length > 0) {
      setSelectedNodeId(selNodes[0].id);
      setSelectedEdgeId(null);
    } else if (selEdges.length > 0) {
      setSelectedEdgeId(selEdges[0].id);
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  }, []);



  // Fungsi Otomatis Merapihkan Layout Flowchart (Auto-Layout Hierarkis)
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // 1. Bangun adjacency graph & in-degree map
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    edges.forEach((e) => {
      if (e.source !== e.target && adj.has(e.source) && inDegree.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    });

    // 2. Tentukan rank / level setiap node via Topological Leveling
    const ranks = new Map<string, number>();
    const queue: { id: string; rank: number }[] = [];

    // Cari node awal: tipe START atau in-degree 0
    nodes.forEach((n) => {
      if (n.data.nodeType === "START" || inDegree.get(n.id) === 0) {
        ranks.set(n.id, 0);
        queue.push({ id: n.id, rank: 0 });
      }
    });

    // Fallback jika semua node dalam siklus
    if (queue.length === 0 && nodes.length > 0) {
      ranks.set(nodes[0].id, 0);
      queue.push({ id: nodes[0].id, rank: 0 });
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const { id, rank } = queue.shift()!;
      visited.add(id);

      const neighbors = adj.get(id) || [];
      for (const nextId of neighbors) {
        const currentRank = ranks.get(nextId) ?? -1;
        if (rank + 1 > currentRank) {
          ranks.set(nextId, rank + 1);
        }
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, rank: ranks.get(nextId)! });
        }
      }
    }

    // Node pulau yang belum terjangkau
    let maxAssignedRank = Math.max(0, ...Array.from(ranks.values()));
    nodes.forEach((n) => {
      if (!ranks.has(n.id)) {
        maxAssignedRank += 1;
        ranks.set(n.id, maxAssignedRank);
      }
    });

    // 3. Kelompokkan nodes per rank
    const rankGroups = new Map<number, Node<FlowchartNodeData>[]>();
    nodes.forEach((n) => {
      const r = ranks.get(n.id) || 0;
      if (!rankGroups.has(r)) rankGroups.set(r, []);
      rankGroups.get(r)!.push(n);
    });

    // 4. Hitung posisi koordinat X dan Y untuk setiap node (Bebas Tumpang Tindih dengan Label)
    const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);
    const verticalGap = 140; // Memberikan ruang lega vertikal agar label panah tidak menimpa shape
    const horizontalGap = 115; // Memberikan ruang horizontal agar cabang alur tidak bertumpukan
    let currentY = 50;

    const newPositions = new Map<string, { x: number; y: number }>();

    let maxLevelWidth = 0;
    sortedRanks.forEach((r) => {
      const group = rankGroups.get(r)!;
      const totalWidth =
        group.reduce((acc, n) => acc + (n.data.width || 160), 0) +
        (group.length - 1) * horizontalGap;
      if (totalWidth > maxLevelWidth) maxLevelWidth = totalWidth;
    });

    const centerX = maxLevelWidth / 2 + 100;

    sortedRanks.forEach((r) => {
      const group = rankGroups.get(r)!;
      const totalWidth =
        group.reduce((acc, n) => acc + (n.data.width || 160), 0) +
        (group.length - 1) * horizontalGap;

      let currentX = centerX - totalWidth / 2;
      let maxHeightInLevel = 0;

      group.forEach((n) => {
        const w = n.data.width || 160;
        const h = n.data.height || 65;
        if (h > maxHeightInLevel) maxHeightInLevel = h;

        newPositions.set(n.id, { x: Math.round(currentX), y: Math.round(currentY) });
        currentX += w + horizontalGap;
      });

      currentY += maxHeightInLevel + verticalGap;
    });

    // 5. Update posisi nodes
    setNodes((nds) =>
      nds.map((n) => {
        const pos = newPositions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      })
    );

    // 6. Rapikan arah panah: default dari bawah ke atas
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === e.target) return e;
        const sRank = ranks.get(e.source) || 0;
        const tRank = ranks.get(e.target) || 0;

        if (tRank > sRank) {
          return { ...e, sourceHandle: "bottom", targetHandle: "top" };
        } else if (tRank === sRank) {
          const sPos = newPositions.get(e.source);
          const tPos = newPositions.get(e.target);
          if (sPos && tPos && tPos.x > sPos.x) {
            return { ...e, sourceHandle: "right", targetHandle: "left" };
          } else {
            return { ...e, sourceHandle: "left", targetHandle: "right" };
          }
        } else {
          return { ...e, sourceHandle: "right", targetHandle: "right" };
        }
      })
    );

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 80);

    toastAlert({
      title: "Layout Berhasil Dirapikan!",
      description: "Posisi diagram telah ditata rapi secara otomatis (Shortcut: Alt + L).",
      variant: "success",
    });
  }, [nodes, edges, reactFlowInstance]);

  // Hapus Selected Node / Edge (Mendukung tombol keyboard Delete / Backspace serta tombol hapus di sidebar)
  const handleDeleteSelected = useCallback(() => {
    // 1. Jika ada Node yang sedang dipilih di sidebar properties
    if (selectedNodeId) {
      const targetNode = nodes.find((n) => n.id === selectedNodeId);
      const labelText = targetNode?.data?.label ? `Shape "${targetNode.data.label}"` : "Shape";
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
      toastAlert({
        title: "Shape Dihapus",
        description: `${labelText} dan panah alur terkait telah dihapus.`,
        variant: "info",
      });
      return;
    }

    // 2. Jika ada Edge (Arrow) yang sedang dipilih di sidebar properties
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      toastAlert({
        title: "Arrow Dihapus",
        description: "Garis panah alur telah dihapus.",
        variant: "info",
      });
      return;
    }

    // 3. Jika ada elemen yang dipilih via selection box di kanvas React Flow
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      const deletedNodeIds = new Set(selectedNodes.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) =>
        eds.filter((e) => !e.selected && !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target))
      );
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      toastAlert({
        title: "Item Dihapus",
        description: `${selectedNodes.length} shape dan ${selectedEdges.length} panah alur telah dihapus.`,
        variant: "info",
      });
    }
  }, [selectedNodeId, selectedEdgeId, nodes, edges]);

  // Keyboard shortcut listener:
  // - Escape: Batal koneksi panah / tutup properties
  // - Delete / Backspace: Hapus Shape atau Arrow yang sedang aktif
  // - Alt+L / Shift+L: Rapihkan Layout otomatis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = Boolean(
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      );

      // Escape untuk membatalkan mode sambung panah atau menutup selection
      if (e.key === "Escape") {
        if (connectingSourceId) {
          setConnectingSourceId(null);
          toastAlert({
            title: "Sambung Dibatalkan",
            description: "Mode penyambungan panah dibatalkan.",
            variant: "info",
          });
        } else {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }
        return;
      }

      // Shortcut Delete / Backspace: Hapus Shape atau Arrow yang dipilih (hanya aktif jika tidak sedang mengetik di input/textarea)
      if ((e.key === "Delete" || e.key === "Backspace") && !isInputActive) {
        const hasSelection = Boolean(
          selectedNodeId ||
          selectedEdgeId ||
          nodes.some((n) => n.selected) ||
          edges.some((e) => e.selected)
        );

        if (hasSelection) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // Shortcut Rapihkan Layout: Alt + L atau Shift + L (saat tidak sedang fokus di form input)
      if (
        (e.altKey && (e.key === "l" || e.key === "L")) ||
        (e.shiftKey && (e.key === "l" || e.key === "L") && !e.ctrlKey && !e.metaKey)
      ) {
        if (isInputActive) return;
        e.preventDefault();
        handleAutoLayout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectingSourceId, selectedNodeId, selectedEdgeId, nodes, edges, handleDeleteSelected, handleAutoLayout]);

  // Helper load diagram ke state React Flow
  const loadDiagramIntoFlow = useCallback((diag: FlowchartDiagram) => {
    setCurrentId(diag.id);
    const diagTitle = diag.title || "Flowchart Diagram";
    setTitle(diagTitle);
    setTitleInput(diagTitle);
    setDescription(diag.description || "");

    const newNodes: Node<FlowchartNodeData>[] = (diag.nodes || []).map((n) => ({
      id: n.id,
      type: "flowchartNode",
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        description: n.description,
        erdFields: n.erdFields,
        nodeType: n.type,
        color: n.color || "#3b82f6",
        borderStyle: n.borderStyle || "solid",
        imageUrl: n.imageUrl,
        width: n.width || 160,
        height: n.height || 65,
      },
    }));

    const newEdges: Edge[] = (diag.edges || []).map((e) => {
      const hasStart = e.arrowStyle === "bidirectional";
      const hasEnd = e.arrowStyle !== "line";
      const isDashed = e.arrowStyle === "dashed";

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || "bottom",
        targetHandle: e.targetHandle || "top",
        label: e.label,
        type: "shadowStep",
        markerEnd: hasEnd
          ? {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: e.color || "#475569",
          }
          : undefined,
        markerStart: hasStart
          ? {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: e.color || "#475569",
          }
          : undefined,
        style: {
          stroke: e.color || "#475569",
          strokeWidth: e.strokeWidth || 2,
          strokeDasharray: isDashed ? "6 4" : undefined,
        },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance]);

  // Load daftar diagram milik user saat mount (dan buka target diagram jika ada dari URL/prop)
  const loadSavedDiagrams = useCallback(async () => {
    try {
      const { data } = await refetchSavedDiagrams();
      if (data && Array.isArray(data)) {
        setSavedDiagrams(data);

        // Ambil diagramId dari initialDiagramId prop atau query URL
        const targetId =
          initialDiagramId ||
          (typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("diagramId")
            : null);

        if (targetId) {
          const found = data.find((d) => d.id === targetId);
          if (found) {
            loadDiagramIntoFlow(found);
          } else {
            // Jika belum ada di list (misal baru dibuat atau di-share), fetch langsung via queryClient
            const singleData = await queryClient.fetchQuery({
              queryKey: ["flowchart", targetId],
              queryFn: () => fetchFlowchartById(targetId, workspace?.id || "default", currentUser?.id),
            });
            if (singleData) {
              loadDiagramIntoFlow(singleData);
              setSavedDiagrams((prev) => [singleData, ...prev.filter((d) => d.id !== singleData.id)]);
            }
          }
        } else if (data.length > 0) {
          loadDiagramIntoFlow(data[0]);
        }
      }
    } catch (err) {
      console.error("Gagal memuat diagram tersimpan:", err);
    }
  }, [workspace?.id, currentUser?.id, initialDiagramId, loadDiagramIntoFlow, refetchSavedDiagrams, queryClient]);

  useEffect(() => {
    loadSavedDiagrams();
  }, [loadSavedDiagrams]);

  // Hapus Diagram Tertentu dari List Dropdown
  const handleDeleteSpecificDiagram = async (diagramId: string, diagramTitle: string) => {
    try {
      await deleteFlowchartMutation.mutateAsync({
        id: diagramId,
        workspaceId: workspace?.id || "default",
        userId: currentUser?.id,
      });

      setSavedDiagrams((prev) => prev.filter((d) => d.id !== diagramId));
      toastAlert({
        title: "Diagram Dihapus",
        description: `Diagram "${diagramTitle}" berhasil dihapus.`,
        variant: "success",
      });

      if (currentId === diagramId) {
        const remaining = savedDiagrams.filter((d) => d.id !== diagramId);
        if (remaining.length > 0) {
          loadDiagramIntoFlow(remaining[0]);
        } else {
          handleNewDiagram();
        }
      }
    } catch (err: any) {
      toastAlert({
        title: "Gagal Menghapus",
        description: err?.message || "Terjadi kesalahan saat menghapus diagram.",
        variant: "destructive",
      });
    }
  };

  // Handler lampirkan file sebagai data tambahan untuk AI Flowchart
  const handleAttachFileForAI = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: `[Referensi Gambar: ${file.name} (${Math.round(file.size / 1024) || 1} KB)]`,
      });
      toastAlert({
        title: "Gambar Terlampir",
        description: `Gambar "${file.name}" siap dijadikan referensi data AI.`,
        variant: "info",
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setAttachedFile({
          name: file.name,
          size: file.size,
          content: text,
        });
        toastAlert({
          title: "File Terlampir",
          description: `Dokumen "${file.name}" siap digunakan sebagai data tambahan AI.`,
          variant: "success",
        });
      };
      reader.onerror = () => {
        toastAlert({
          title: "Gagal Membaca File",
          description: "Tidak dapat membaca file dokumen ini.",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  // Generate Flowchart via AI
  const handleGenerateAI = async (customPrompt?: string) => {
    const text = (customPrompt || promptInput).trim();
    if (!text && !attachedFile) {
      toastAlert({
        title: "Prompt Kosong",
        description: "Masukkan deskripsi proses alur atau lampirkan file dokumen tambahan.",
        variant: "warning",
      });
      return;
    }

    // Gabungkan teks prompt dengan data isi file terlampir
    let fullPrompt = text;
    if (attachedFile) {
      const docHeader = `\n\n[DATA TAMBAHAN DOKUMEN: "${attachedFile.name}"]:\n`;
      fullPrompt = text
        ? `${text}${docHeader}${attachedFile.content}`
        : `Buatkan diagram flowchart proses alur kerja lengkap berdasarkan isi dokumen berikut:${docHeader}${attachedFile.content}`;
    }

    try {
      setIsGenerating(true);
      const generated: FlowchartDiagram = await generateFlowchartMutation.mutateAsync({
        prompt: fullPrompt,
        workspaceId: workspace?.id || "default",
        userId: currentUser?.id,
        creatorName: currentUser?.name || currentUser?.email,
      });

      loadDiagramIntoFlow(generated);

      // Simpan otomatis via TanStack Mutation
      await saveFlowchartMutation.mutateAsync({
        ...generated,
        userId: currentUser?.id,
        creatorName: currentUser?.name || currentUser?.email,
      }).catch(() => null);

      setSavedDiagrams((prev) => [generated, ...prev.filter((d) => d.id !== generated.id)]);

      toastAlert({
        title: "Flowchart Berhasil Dibuat!",
        description: `Diagram "${generated.title}" dengan ${generated.nodes.length} langkah berhasil dibuat.`,
        variant: "success",
      });
    } catch (err: any) {
      console.error("Gagal generate AI:", err);
      toastAlert({
        title: "Gagal Generate Flowchart",
        description: err?.message || "Terjadi kesalahan saat memproses permintaan AI.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. Simpan Diagram Manual (Create / Update)
  const handleSaveDiagram = async (customTitle?: string) => {
    try {
      setIsSaving(true);
      const diagramTitle = (customTitle || title || "Flowchart Diagram").trim();

      const rawId = currentId ? String(currentId).trim() : "";
      const isForbidden =
        !rawId ||
        rawId === "default" ||
        rawId === "flow-default" ||
        rawId.endsWith("-default");
      const targetId = !isForbidden ? rawId : generateUniqueFlowId();
      if (targetId !== currentId) {
        setCurrentId(targetId);
      }

      const diagramToSave: FlowchartDiagram = {
        id: targetId,
        workspaceId: workspace?.id || "default",
        userId: currentUser?.id,
        creatorName: currentUser?.name || currentUser?.email,
        title: diagramTitle,
        description,
        prompt: promptInput,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType || "PROCESS",
          label: n.data.label,
          description: n.data.description,
          erdFields: n.data.erdFields,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          width: n.data.width || 160,
          height: n.data.height || 65,
          color: n.data.color,
          borderStyle: n.data.borderStyle,
          imageUrl: n.data.imageUrl,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
          label: typeof e.label === "string" ? e.label : undefined,
          color: (e.style?.stroke as string) || "#475569",
          strokeWidth: Number(e.style?.strokeWidth || 2),
          arrowStyle: e.markerStart ? "bidirectional" : e.markerEnd ? "directed" : "line",
          routing: "orthogonal",
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await saveFlowchartMutation.mutateAsync(diagramToSave);

      if (saved && saved.id) {
        if (saved.id !== currentId) {
          setCurrentId(saved.id);
        }
        setSavedDiagrams((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
        toastAlert({
          title: "Diagram Berhasil Disimpan",
          description: `Flowchart "${diagramTitle}" berhasil disimpan di workspace.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toastAlert({
        title: "Gagal Menyimpan",
        description: err.message || "Tidak dapat menyimpan diagram ke server.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Buat Diagram Baru (+ Diagram Baru)
  const handleNewDiagram = () => {
    const newId = generateUniqueFlowId();
    const newTitle = "Diagram Alur Baru";
    const defaultNewNodes: FlowchartDiagramNode[] = [
      { id: "node-start", type: "START", label: "Mulai", x: 380, y: 80, width: 140, height: 50, color: "#10b981" },
      { id: "node-step1", type: "PROCESS", label: "Langkah Pertama", x: 360, y: 190, width: 180, height: 65, color: "#3b82f6" },
      { id: "node-end", type: "END", label: "Selesai", x: 380, y: 320, width: 140, height: 50, color: "#f43f5e" },
    ];
    const defaultNewEdges: FlowchartDiagramEdge[] = [
      { id: "e1", source: "node-start", target: "node-step1", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
      { id: "e2", source: "node-step1", target: "node-end", sourceHandle: "bottom", targetHandle: "top", arrowStyle: "directed" },
    ];

    const newDiag: FlowchartDiagram = {
      id: newId,
      workspaceId: workspace?.id || "default",
      userId: currentUser?.id,
      creatorName: currentUser?.name || currentUser?.email,
      title: newTitle,
      description: "Diagram alur baru siap didesain",
      nodes: defaultNewNodes,
      edges: defaultNewEdges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    loadDiagramIntoFlow(newDiag);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    toastAlert({
      title: "Diagram Baru Dibuat",
      description: "Kanvas di-reset untuk diagram alur baru.",
      variant: "info",
    });
  };

  // 3. Hapus Diagram Tertentu atau Diagram Aktif
  const handleExecuteDeleteDiagram = async () => {
    if (!targetDiagramToDelete) return;
    try {
      setIsDeleting(true);
      await deleteFlowchartMutation.mutateAsync({
        id: targetDiagramToDelete.id,
        workspaceId: workspace?.id || "default",
        userId: currentUser?.id,
      });

      const remaining = savedDiagrams.filter((d) => d.id !== targetDiagramToDelete.id);
      setSavedDiagrams(remaining);

      toastAlert({
        title: "Diagram Berhasil Dihapus",
        description: `Diagram "${targetDiagramToDelete.title}" telah dihapus secara permanen.`,
        variant: "success",
      });

      if (targetDiagramToDelete.id === currentId) {
        if (remaining.length > 0) {
          loadDiagramIntoFlow(remaining[0]);
        } else {
          handleNewDiagram();
        }
      }
      setTargetDiagramToDelete(null);
    } catch (err: any) {
      toastAlert({
        title: "Gagal Menghapus Diagram",
        description: err.message || "Terjadi kesalahan saat menghapus diagram dari server.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  // 4. URL Share Diagram (Public Preview Tanpa Perlu Auth/Login)
  const getShareUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/flowchart/preview?id=${encodeURIComponent(currentId)}`;
  };

  // 5. Salin Tautan Share ke Clipboard
  const handleCopyShareLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2000);
      toastAlert({
        title: "Tautan Berhasil Disalin!",
        description: "Link tautan diagram telah disalin ke clipboard.",
        variant: "success",
      });
    } catch (err) {
      toastAlert({
        title: "Gagal Menyalin",
        description: "Salin URL diagram secara manual dari kotak teks.",
        variant: "warning",
      });
    }
  };

  // 6. Bagikan Diagram ke Obrolan Tim (Team Chat)
  const handleShareToTeamChat = async () => {
    try {
      setIsSendingToChat(true);
      const shareLink = getShareUrl();
      const nodeCount = nodes.length;
      const edgeCount = edges.length;

      let messageContent = `📊 **[Flowchart Shared]** ${title}\n`;
      messageContent += `*Diagram Alur Kerja: ${nodeCount} langkah proses, ${edgeCount} alur panah.*\n`;
      if (chatNote.trim()) {
        messageContent += `💬 *Catatan:* ${chatNote.trim()}\n`;
      }
      messageContent += `🔗 Buka Diagram: ${shareLink}`;

      await shareFlowchartToChatMutation.mutateAsync({
        content: messageContent,
        senderId: currentUser?.id || "usr-1",
        workspaceId: workspace?.id,
        type: "TEAM_DISCUSSION",
      });

      setIsShareModalOpen(false);
      setChatNote("");
      toastAlert({
        title: "Berhasil Dibagikan ke Chat Tim!",
        description: `Diagram "${title}" telah dikirim ke obrolan tim.`,
        variant: "success",
      });
    } catch (err: any) {
      toastAlert({
        title: "Gagal Berbagi ke Chat",
        description: err.message || "Tidak dapat membagikan diagram ke obrolan tim.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToChat(false);
    }
  };

  // 7. Ekspor Diagram ke File JSON
  const handleExportJSON = () => {
    const dataToExport: FlowchartDiagram = {
      id: currentId,
      workspaceId: workspace?.id || "default",
      title,
      description,
      prompt: promptInput,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType || "PROCESS",
        label: n.data.label,
        description: n.data.description,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        width: n.data.width || 160,
        height: n.data.height || 65,
        color: n.data.color,
        borderStyle: n.data.borderStyle,
        imageUrl: n.data.imageUrl,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
        label: typeof e.label === "string" ? e.label : undefined,
        color: (e.style?.stroke as string) || "#475569",
        strokeWidth: Number(e.style?.strokeWidth || 2),
        arrowStyle: e.markerStart ? "bidirectional" : e.markerEnd ? "directed" : "line",
        routing: "orthogonal",
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-flowchart.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toastAlert({
      title: "File JSON Diunduh",
      description: "Diagram berhasil diekspor sebagai file data JSON.",
      variant: "success",
    });
  };

  // 8. Impor Diagram dari File JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.nodes)) {
          loadDiagramIntoFlow(parsed);
          setIsShareModalOpen(false);
          toastAlert({
            title: "Diagram Berhasil Diimpor!",
            description: `Diagram "${parsed.title || "Impor"}" berhasil dimuat ke kanvas.`,
            variant: "success",
          });
        } else {
          throw new Error("Format data JSON tidak valid.");
        }
      } catch (err: any) {
        toastAlert({
          title: "Gagal Mengimpor JSON",
          description: err.message || "File JSON tidak sesuai struktur diagram flowchart.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Tambah Shape Baru ke Kanvas
  const handleAddNode = (type: FlowchartNodeType) => {
    const id = `node-${Date.now()}`;
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    let label = "Langkah Baru";
    let width = 160;
    let height = 65;
    let color = "#3b82f6";

    switch (type) {
      case "START":
        label = "Mulai";
        color = "#10b981";
        width = 140;
        height = 50;
        break;
      case "END":
        label = "Selesai";
        color = "#f43f5e";
        width = 140;
        height = 50;
        break;
      case "DECISION":
        label = "Kondisi?";
        color = "#f59e0b";
        width = 175;
        height = 80;
        break;
      case "DATABASE":
        label = "Data Store / DB";
        color = "#8b5cf6";
        width = 160;
        height = 65;
        break;
      case "INPUT_OUTPUT":
        label = "Input / Output";
        color = "#06b6d4";
        width = 165;
        height = 60;
        break;
      case "SUBPROCESS":
        label = "Sub-Proses Modul";
        color = "#3b82f6";
        width = 170;
        height = 65;
        break;
      case "NOTE":
        label = "Catatan Alur...";
        color = "#eab308";
        width = 150;
        height = 70;
        break;
      default:
        label = "Proses Baru";
        color = "#3b82f6";
        width = 160;
        height = 65;
        break;
    }

    const newNode: Node<FlowchartNodeData> = {
      id,
      type: "flowchartNode",
      position: { x: center.x - width / 2, y: center.y - height / 2 },
      data: {
        label,
        nodeType: type,
        width,
        height,
        color,
        borderStyle: "solid",
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  // Upload Gambar File Komputer
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toastAlert({
        title: "File Tidak Didukung",
        description: "Pilih file gambar seperti PNG, JPG, SVG, atau WebP.",
        variant: "warning",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const id = `node-${Date.now()}`;
        const center = reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });

        const newNode: Node<FlowchartNodeData> = {
          id,
          type: "flowchartNode",
          position: { x: center.x - 90, y: center.y - 70 },
          data: {
            label: file.name.replace(/\.[^/.]+$/, ""),
            nodeType: "IMAGE",
            imageUrl: dataUrl,
            width: 180,
            height: 140,
            color: "#ec4899",
            borderStyle: "solid",
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(id);
        setSelectedEdgeId(null);
        toastAlert({
          title: "Gambar Ditambahkan ke Kanvas",
          description: "Gambar dapat digeser dan dihubungkan ke panah.",
          variant: "success",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Quick Change Node Type
  const handleQuickChangeNodeType = (newType: FlowchartNodeType) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n;
        let w = n.data.width || 160;
        let h = n.data.height || 65;
        if (newType === "DECISION" && (w < 160 || h < 75)) {
          w = Math.max(w, 175);
          h = Math.max(h, 80);
        } else if (newType === "START" || newType === "END") {
          h = Math.min(h, 55);
        }
        return {
          ...n,
          data: {
            ...n.data,
            nodeType: newType,
            width: w,
            height: h,
          },
        };
      })
    );
  };


  // Ganti Style Arrow (1 Arah, 2 Arah, Garis, Dashed)
  const handleUpdateEdgeStyle = (style: FlowchartArrowStyle) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        const color = (e.style?.stroke as string) || "#475569";
        const hasStart = style === "bidirectional";
        const hasEnd = style !== "line";
        const isDashed = style === "dashed";

        return {
          ...e,
          markerEnd: hasEnd
            ? {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color,
            }
            : undefined,
          markerStart: hasStart
            ? {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color,
            }
            : undefined,
          style: {
            ...e.style,
            strokeDasharray: isDashed ? "6 4" : undefined,
          },
        };
      })
    );
  };

  // Ganti Ketebalan Garis Arrow
  const handleUpdateEdgeStrokeWidth = (sw: number) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, style: { ...e.style, strokeWidth: sw } } : e))
    );
  };

  // Ganti Sisi Pangkal Arrow (Source Handle: top, right, bottom, left)
  const handleUpdateEdgeSourceHandle = (handleId: string) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, sourceHandle: handleId } : e))
    );
  };

  // Ganti Sisi Ujung Arrow (Target Handle: top, right, bottom, left)
  const handleUpdateEdgeTargetHandle = (handleId: string) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, targetHandle: handleId } : e))
    );
  };

  // Ganti Warna Edge
  const handleUpdateEdgeColor = (color: string) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        return {
          ...e,
          style: { ...e.style, stroke: color },
          markerEnd: e.markerEnd ? { ...(e.markerEnd as any), color } : undefined,
          markerStart: e.markerStart ? { ...(e.markerStart as any), color } : undefined,
        };
      })
    );
  };

  // Balikkan Arah Edge
  const handleReverseEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, source: e.target, target: e.source } : e))
    );
    toastAlert({
      title: "Arah Panah Dibalik",
      description: "Arah panah berhasil ditukar.",
      variant: "info",
    });
  };

  // Toggle Edge Animation
  const handleToggleEdgeAnimation = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, animated: !e.animated } : e))
    );
  };




  // Helper escape XML
  const escapeXml = (unsafe: string): string => {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const wrapText = (text: string, maxCharsPerLine: number): string[] => {
    if (!text) return [""];
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [text];
  };

  // Bangun SVG Standalone untuk Export PDF & SVG
  const buildExportSVG = () => {
    if (nodes.length === 0) {
      return {
        svgString: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#ffffff"/><text x="300" y="200" text-anchor="middle" font-family="sans-serif" fill="#94a3b8">Diagram Kosong</text></svg>`,
        width: 600,
        height: 400,
      };
    }

    const padding = 60;
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxX = Math.max(...nodes.map((n) => n.position.x + (n.data.width || 160)));
    const maxY = Math.max(...nodes.map((n) => n.position.y + (n.data.height || 65)));

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const totalW = Math.max(800, contentW + padding * 2);
    const totalH = Math.max(550, contentH + padding * 2);

    const offsetX = padding - minX;
    const offsetY = padding - minY;

    // Helper kalkulasi koordinat connection berdasarkan handle spesifik (Atas, Kanan, Bawah, Kiri)
    const getAnchorPoints = (
      sNode: Node<FlowchartNodeData>,
      tNode: Node<FlowchartNodeData>,
      sHandle?: string | null,
      tHandle?: string | null
    ) => {
      const sW = sNode.data.width || 160;
      const sH = sNode.data.height || 65;
      const tW = tNode.data.width || 160;
      const tH = tNode.data.height || 65;

      const sX = sNode.position.x + offsetX;
      const sY = sNode.position.y + offsetY;
      const tX = tNode.position.x + offsetX;
      const tY = tNode.position.y + offsetY;

      const sPoints: Record<string, { x: number; y: number }> = {
        top: { x: sX + sW / 2, y: sY },
        right: { x: sX + sW, y: sY + sH / 2 },
        bottom: { x: sX + sW / 2, y: sY + sH },
        left: { x: sX, y: sY + sH / 2 },
      };

      const tPoints: Record<string, { x: number; y: number }> = {
        top: { x: tX + tW / 2, y: tY },
        right: { x: tX + tW, y: tY + tH / 2 },
        bottom: { x: tX + tW / 2, y: tY + tH },
        left: { x: tX, y: tY + tH / 2 },
      };

      // Jika self-loop (mengarah ke shape yang sama)
      if (sNode.id === tNode.id) {
        const sh = sHandle || "right";
        const th = tHandle || "top";
        const start = sPoints[sh] || sPoints.right;
        const end = tPoints[th] || tPoints.top;

        const offset = 36;
        const p1x = sh === "right" ? start.x + offset : sh === "left" ? start.x - offset : start.x;
        const p1y = sh === "bottom" ? start.y + offset : sh === "top" ? start.y - offset : start.y;

        const p2x = th === "right" ? end.x + offset : th === "left" ? end.x - offset : end.x;
        const p2y = th === "bottom" ? end.y + offset : th === "top" ? end.y - offset : end.y;

        const cornerX = sh === "right" || sh === "left" ? p1x : p2x;
        const cornerY = sh === "bottom" || sh === "top" ? p1y : p2y;

        const pathD = `M ${start.x} ${start.y} L ${p1x} ${p1y} L ${cornerX} ${cornerY} L ${p2x} ${p2y} L ${end.x} ${end.y}`;
        return { pathD, midX: cornerX, midY: cornerY };
      }

      // Jika handle eksplisit telah ditentukan
      if (sHandle && tHandle && sPoints[sHandle] && tPoints[tHandle]) {
        const start = sPoints[sHandle];
        const end = tPoints[tHandle];
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        let pathD = "";
        if (sHandle === "right" || sHandle === "left") {
          pathD = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
        } else {
          pathD = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
        }
        return { pathD, midX, midY };
      }

      const sCenter = { x: sX + sW / 2, y: sY + sH / 2 };
      const tCenter = { x: tX + tW / 2, y: tY + tH / 2 };
      const dx = tCenter.x - sCenter.x;
      const dy = tCenter.y - sCenter.y;

      let startX = sCenter.x;
      let startY = sCenter.y;
      let endX = tCenter.x;
      let endY = tCenter.y;
      let isHorizontal = false;

      if (Math.abs(dx) > Math.abs(dy)) {
        isHorizontal = true;
        if (dx > 0) {
          startX = sX + sW + 1;
          startY = sCenter.y;
          endX = tX - 2;
          endY = tCenter.y;
        } else {
          startX = sX - 1;
          startY = sCenter.y;
          endX = tX + tW + 2;
          endY = tCenter.y;
        }
      } else {
        if (dy > 0) {
          startX = sCenter.x;
          startY = sY + sH + 1;
          endX = tCenter.x;
          endY = tY - 2;
        } else {
          startX = sCenter.x;
          startY = sY - 1;
          endX = tCenter.x;
          endY = tY + tH + 2;
        }
      }

      let pathD = "";
      let midX = (startX + endX) / 2;
      let midY = (startY + endY) / 2;

      if (isHorizontal) {
        pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      } else {
        pathD = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      }

      return { pathD, midX, midY };
    };

    // 1. Shadows Layer
    const shadowsSvg = edges
      .map((e) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return "";
        const { pathD } = getAnchorPoints(s, t, e.sourceHandle || "bottom", e.targetHandle || "top");
        const strokeWidth = Number(e.style?.strokeWidth || 2);
        const dashAttr = e.style?.strokeDasharray ? `stroke-dasharray="${e.style.strokeDasharray}"` : "";
        return `<path d="${pathD}" fill="none" stroke="rgba(15, 23, 42, 0.16)" stroke-width="${strokeWidth + 2.5}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr} transform="translate(1.5, 2)" />`;
      })
      .filter(Boolean)
      .join("\n");

    // 2. Lines Layer (Default 1 Arah)
    const linesSvg = edges
      .map((e) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return "";
        const { pathD } = getAnchorPoints(s, t, e.sourceHandle || "bottom", e.targetHandle || "top");
        const strokeWidth = Number(e.style?.strokeWidth || 2);
        const strokeColor = (e.style?.stroke as string) || "#475569";
        const hasStart = Boolean(e.markerStart);
        const hasEnd = e.markerEnd !== undefined;
        const markerStartAttr = hasStart ? `marker-start="url(#pdf-arrow-start)"` : "";
        const markerEndAttr = hasEnd ? `marker-end="url(#pdf-arrow)"` : "";
        const dashAttr = e.style?.strokeDasharray ? `stroke-dasharray="${e.style.strokeDasharray}"` : "";

        return `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr} ${markerStartAttr} ${markerEndAttr} />`;
      })
      .filter(Boolean)
      .join("\n");

    // 3. Nodes Layer (2D Pure Flat)
    const nodesSvg = nodes
      .map((n) => {
        const x = n.position.x + offsetX;
        const y = n.position.y + offsetY;
        const w = n.data.width || 160;
        const h = n.data.height || 65;
        const c = n.data.color || "#3b82f6";
        const isDashed = n.data.borderStyle === "dashed";
        const strokeDash = isDashed ? `stroke-dasharray="5 4"` : "";

        let shapeSvg = "";
        if (n.data.nodeType === "START" || n.data.nodeType === "END") {
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="25" ry="25" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />`;
        } else if (n.data.nodeType === "DECISION") {
          const cx = x + w / 2;
          const cy = y + h / 2;
          shapeSvg = `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />`;
        } else if (n.data.nodeType === "DATABASE") {
          shapeSvg = `
            <path d="M ${x} ${y + 12} L ${x} ${y + h - 12} A ${w / 2} 12 0 0 0 ${x + w} ${y + h - 12} L ${x + w} ${y + 12} Z" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />
            <ellipse cx="${x + w / 2}" cy="${y + 12}" rx="${w / 2}" ry="12" fill="#f8fafc" stroke="${c}" stroke-width="2.5" />
          `;
        } else if (n.data.nodeType === "INPUT_OUTPUT") {
          shapeSvg = `<polygon points="${x + 16},${y} ${x + w},${y} ${x + w - 16},${y + h} ${x},${y + h}" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />`;
        } else if (n.data.nodeType === "SUBPROCESS") {
          shapeSvg = `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />
            <line x1="${x + 14}" y1="${y}" x2="${x + 14}" y2="${y + h}" stroke="${c}" stroke-width="1.8" />
            <line x1="${x + w - 14}" y1="${y}" x2="${x + w - 14}" y2="${y + h}" stroke="${c}" stroke-width="1.8" />
          `;
        } else if (n.data.nodeType === "NOTE") {
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fffbeb" stroke="${c}" stroke-width="2" stroke-dasharray="4 4" />`;
        } else if (n.data.nodeType === "IMAGE") {
          shapeSvg = `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="${c}" stroke-width="2" ${strokeDash} />
            ${n.data.imageUrl ? `<image href="${escapeXml(n.data.imageUrl)}" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 26}" preserveAspectRatio="xMidYMid meet" />` : ""}
            <rect x="${x}" y="${y + h - 22}" width="${w}" height="22" rx="0" fill="#f1f5f9" />
          `;
        } else {
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="${c}" stroke-width="2.5" ${strokeDash} />`;
        }

        const lines = wrapText(n.data.label, Math.max(8, Math.floor(w / 8.5)));
        const startTextY = y + h / 2 - (lines.length - 1) * 7.5;
        const textSpans = lines
          .map((line, idx) => `<tspan x="${x + w / 2}" y="${startTextY + idx * 15}">${escapeXml(line)}</tspan>`)
          .join("");

        return `
          <g>
            ${shapeSvg}
            <text text-anchor="middle" font-size="11" font-weight="600" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif">
              ${textSpans}
            </text>
          </g>
        `;
      })
      .join("\n");

    // 4. Edge Labels Layer (Paling Atas)
    const labelsSvg = edges
      .map((e) => {
        if (!e.label) return "";
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return "";
        const { midX, midY } = getAnchorPoints(s, t);
        const labelText = escapeXml(String(e.label));
        const labelW = Math.max(70, labelText.length * 8 + 24);
        const labelH = 24;

        return `
          <g transform="translate(${midX}, ${midY})">
            <rect x="${-labelW / 2}" y="${-labelH / 2}" width="${labelW}" height="${labelH}" rx="6" fill="#ffffff" stroke="#475569" stroke-width="1.5" />
            <text text-anchor="middle" dy="4" font-size="11" font-weight="700" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif">${labelText}</text>
          </g>
        `;
      })
      .filter(Boolean)
      .join("\n");

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
        <defs>
          <marker id="pdf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
          </marker>
          <marker id="pdf-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1 L 0 5 L 10 9 z" fill="#475569" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="#ffffff" />
        <g id="export-arrow-shadows">${shadowsSvg}</g>
        <g id="export-arrow-lines">${linesSvg}</g>
        <g id="export-nodes">${nodesSvg}</g>
        <g id="export-arrow-labels">${labelsSvg}</g>
      </svg>
    `;

    return { svgString, width: totalW, height: totalH };
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (nodes.length === 0) {
      toastAlert({
        title: "Diagram Kosong",
        description: "Tidak ada langkah flowchart untuk diekspor ke PDF.",
        variant: "warning",
      });
      return;
    }

    setIsExportingPDF(true);
    try {
      const { svgString, width, height } = buildExportSVG();

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal mengurai gambar SVG diagram."));
        img.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi context canvas.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

      const imgData = canvas.toDataURL("image/png");

      const isLandscape = width >= height;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Header Dokumen PDF
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title || "Flowchart Diagram", 14, 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const wsStr = workspace?.name ? `Workspace: ${workspace.name}` : "";
      const meta = [wsStr, `Tanggal: ${dateStr}`, `Total: ${nodes.length} Langkah`].filter(Boolean).join("  •  ");
      pdf.text(meta, 14, 19.5);

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.4);
      pdf.line(14, 22.5, pageWidth - 14, 22.5);

      const contentX = 14;
      const contentY = 26;
      const availWidth = pageWidth - 28;
      const availHeight = pageHeight - 36;

      const imgRatio = width / height;
      let renderW = availWidth;
      let renderH = renderW / imgRatio;

      if (renderH > availHeight) {
        renderH = availHeight;
        renderW = renderH * imgRatio;
      }

      const renderX = contentX + (availWidth - renderW) / 2;
      const renderY = contentY + (availHeight - renderH) / 2;

      pdf.addImage(imgData, "PNG", renderX, renderY, renderW, renderH, undefined, "FAST");

      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Dibuat dengan Flowchart Generator • Task Management", 14, pageHeight - 5);
      pdf.text("Halaman 1 / 1", pageWidth - 14, pageHeight - 5, { align: "right" });

      const cleanTitle = (title || "flowchart").toLowerCase().replace(/[^a-z0-9]/g, "_");
      pdf.save(`${cleanTitle}.pdf`);

      toastAlert({
        title: "Export PDF Berhasil",
        description: `File "${title}.pdf" telah berhasil diunduh.`,
        variant: "success",
      });
    } catch (err: any) {
      console.error("Gagal export PDF:", err);
      toastAlert({
        title: "Gagal Export PDF",
        description: err?.message || "Terjadi kesalahan saat membuat file PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export SVG Handler
  const handleExportSVG = () => {
    try {
      const { svgString } = buildExportSVG();
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "flowchart").toLowerCase().replace(/[^a-z0-9]/g, "_")}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastAlert({
        title: "Export SVG Berhasil",
        description: "File diagram SVG mandiri telah diunduh.",
        variant: "success",
      });
    } catch (err) {
      toastAlert({
        title: "Gagal Export SVG",
        description: "Tidak dapat mengekspor SVG diagram.",
        variant: "destructive",
      });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const sourceNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.source) : null;
  const targetNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.target) : null;

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden animate-fade-in relative">
      {/* Styling Khusus Titik Kontrol Drag & Drop Ujung & Pangkal Panah (Edge Updaters) */}
      <style>{`
        .react-flow__edgeupdater {
          fill: #2563eb !important;
          stroke: #ffffff !important;
          stroke-width: 2.5px !important;
          cursor: grab !important;
          r: 7 !important;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45)) !important;
          transition: r 0.15s ease, fill 0.15s ease !important;
        }
        .react-flow__edgeupdater:hover {
          fill: #1d4ed8 !important;
          r: 9 !important;
          cursor: grabbing !important;
        }
        .react-flow__edgeupdater-source {
          fill: #3b82f6 !important;
        }
        .react-flow__edgeupdater-target {
          fill: #10b981 !important;
        }
      `}</style>

      {/* Top Bar: Bersih, Ramping & Aksi Diagram */}
      <div className="border-b border-border/80 bg-card/70 backdrop-blur-md px-3 sm:px-4 py-2 z-20">
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
                        handleSaveDiagram(trimmed);
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
                          handleSaveDiagram(trimmed);
                        }
                        setIsEditingTitle(false);
                      }}
                      autoFocus
                      className="h-7 text-xs font-semibold px-2 py-0 w-44 sm:w-64"
                      placeholder="Judul diagram..."
                    />
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
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
                      className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-[320px] cursor-pointer hover:text-primary transition-colors"
                      title="Klik untuk mengubah judul diagram"
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
                      title="Edit Judul Diagram"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                  {nodes.length} Nodes
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                  {edges.length} Arrows
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dropdown Menu Diagram Tersimpan (ShadCN UI) Lengkap dengan Tombol Hapus per Item */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer max-w-[210px] bg-card hover:bg-muted text-foreground border-border/80"
                  title="Pilih dan kelola diagram tersimpan"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate max-w-[130px] font-medium">Diagram Tersimpan</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Diagram Tersimpan ({savedDiagrams.length})</span>
                  <span className="font-mono text-[9px] text-primary">Milik Anda</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {savedDiagrams.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-muted-foreground">
                      Belum ada diagram tersimpan.
                    </div>
                  ) : (
                    savedDiagrams.map((d) => (
                      <div
                        key={d.id}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors group ${d.id === currentId
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "hover:bg-muted text-foreground"
                          }`}
                      >
                        <div
                          onClick={() => loadDiagramIntoFlow(d)}
                          className="flex-1 min-w-0"
                          title={`Buka ${d.title}`}
                        >
                          <div className="truncate font-medium">{d.title}</div>
                          <div className="text-[9px] text-muted-foreground font-normal">
                            {d.nodes?.length || 0} langkah • {new Date(d.updatedAt || d.createdAt).toLocaleDateString("id-ID")}
                          </div>
                        </div>
                        {/* Tombol Hapus Diagram Langsung dari Dropdown */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetDiagramToDelete({ id: d.id, title: d.title });
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-70 group-hover:opacity-100"
                          title="Hapus diagram ini"
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
                  onClick={handleNewDiagram}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Buat Diagram Baru</span>
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tombol Rapihkan Layout Otomatis */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
              title="Rapikan tata letak flowchart secara otomatis (Shortcut: Alt + L)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Rapihkan Layout</span>
              <kbd className="hidden sm:inline-block ml-1 rounded bg-muted px-1 py-0.2 text-[9px] font-mono text-muted-foreground border border-border/60">
                Alt+L
              </kbd>
            </Button>

            {/* Menu Titik Tiga (ShadCN UI Dropdown): Simpan, Bagikan, Buat Baru, Export, & Hapus */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer text-foreground hover:bg-muted"
                  title="Menu Alur (Simpan, Bagikan, Buat Baru, Export, Hapus)"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-1.5 space-y-1">
                {/* 1. Simpan Diagram */}
                <DropdownMenuItem
                  onClick={() => handleSaveDiagram()}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer font-medium"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-500" />
                  ) : (
                    <Save className="h-4 w-4 shrink-0 text-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">{isSaving ? "Menyimpan Perubahan..." : "Simpan Diagram"}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Simpan alur perubahan ke server</div>
                  </div>
                </DropdownMenuItem>

                {/* 2. Bagikan Diagram */}
                <DropdownMenuItem
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 cursor-pointer font-medium"
                >
                  <Share2 className="h-4 w-4 shrink-0 text-purple-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">Bagikan Diagram</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Pratinjau publik atau kirim ke chat tim</div>
                  </div>
                </DropdownMenuItem>

                {/* 3. Buat Diagram Baru */}
                <DropdownMenuItem
                  onClick={handleNewDiagram}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer font-medium"
                >
                  <Plus className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">+ Buat Diagram Baru</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Reset kanvas untuk diagram alur baru</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 4. Export Dokumen PDF */}
                <DropdownMenuItem
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer font-medium"
                >
                  {isExportingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin text-rose-500 shrink-0" />
                  ) : (
                    <FileDown className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">Export Dokumen PDF</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Format cetak A4 berkualitas tinggi</div>
                  </div>
                </DropdownMenuItem>

                {/* 5. Export Format SVG */}
                <DropdownMenuItem
                  onClick={handleExportSVG}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted cursor-pointer font-medium"
                >
                  <Download className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">Export Format SVG</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Format vektor jernih tanpa pecah</div>
                  </div>
                </DropdownMenuItem>

                {/* 6. Export File JSON */}
                <DropdownMenuItem
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted cursor-pointer font-medium"
                >
                  <FileCode className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">Export File JSON</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Data diagram lengkap untuk backup</div>
                  </div>
                </DropdownMenuItem>

                {/* 7. Impor Diagram JSON */}
                <DropdownMenuItem
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted cursor-pointer font-medium"
                >
                  <Upload className="h-4 w-4 text-cyan-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">Impor Diagram JSON</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Buka alur dari file .json</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 8. Hapus Diagram */}
                <DropdownMenuItem
                  onClick={() => setTargetDiagramToDelete({ id: currentId, title: title || "Untitled Diagram" })}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer font-medium"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-rose-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">Hapus Diagram Ini</div>
                    <div className="text-[10px] text-rose-400 font-normal">Hapus alur ini dari workspace</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Canvas Area: Menggunakan React Flow */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-background">
        {/* Left Side Shapes Palette ala Draw.io (Ramping & Compact dengan Icon Lucide) */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md w-28 animate-fade-in">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 px-0.5 font-semibold flex items-center justify-between">
            <span>Shapes</span>
            <Shapes className="h-2.5 w-2.5 text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => handleAddNode("START")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-emerald-500/50 hover:shadow-xs group"
              title="Mulai (Start)"
            >
              <Play className="h-3.5 w-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Start</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("PROCESS")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-blue-500/50 hover:shadow-xs group"
              title="Proses (Process)"
            >
              <Square className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Process</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("DECISION")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-amber-500/50 hover:shadow-xs group"
              title="Keputusan (Decision)"
            >
              <GitBranch className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Decision</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("DATABASE")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-purple-500/50 hover:shadow-xs group"
              title="Basis Data / ERD (Database)"
            >
              <Database className="h-3.5 w-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Database</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("INPUT_OUTPUT")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-cyan-500/50 hover:shadow-xs group"
              title="Input / Output Data"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Data I/O</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("SUBPROCESS")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-indigo-500/50 hover:shadow-xs group"
              title="Sub-Proses"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Sub-Pro</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("END")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-rose-500/50 hover:shadow-xs group"
              title="Selesai (End)"
            >
              <StopCircle className="h-3.5 w-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">End</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddNode("NOTE")}
              className="flex flex-col items-center justify-center gap-1 rounded-md p-1.5 hover:bg-muted text-foreground transition-all cursor-pointer border border-border/40 hover:border-yellow-500/50 hover:shadow-xs group"
              title="Catatan (Note)"
            >
              <StickyNote className="h-3.5 w-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Catatan</span>
            </button>
          </div>

          <div className="pt-1 border-t border-border/60">
            <input
              type="file"
              ref={imageFileInputRef}
              onChange={handleImageFileUpload}
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 py-1 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Upload gambar dari komputer"
            >
              <FileImage className="h-3.5 w-3.5" />
              <span>+ Gambar</span>
            </button>
          </div>

          <div className="text-[9px] text-muted-foreground/70 leading-tight text-center pt-0.5 border-t border-border/40">
            Tarik titik biru atau klik <strong className="text-primary font-medium">+ Arrow</strong>
          </div>
        </div>



        {/* Floating Banner Mode Sambung Panah */}
        {connectingSourceId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-full border border-blue-400 bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xl animate-fade-in backdrop-blur-sm">
            <ArrowRight className="h-4 w-4 animate-pulse" />
            <span>Mode Sambung Panah: Klik shape tujuan di kanvas untuk menyambungkan panah (Tekan ESC untuk batal)</span>
            <button
              type="button"
              onClick={() => setConnectingSourceId(null)}
              className="ml-2 rounded-full bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-normal transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}

        {/* React Flow Canvas Component */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          edgeUpdaterRadius={25}
          deleteKeyCode={["Delete", "Backspace"]}
          onSelectionChange={onSelectionChange}
          onEdgeClick={(_, clickedEdge) => {
            setSelectedEdgeId(clickedEdge.id);
            setSelectedNodeId(null);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          onNodeClick={(_, clickedNode) => {
            if (connectingSourceId) {
              const { sourceHandle, targetHandle } = findAvailableHandles(
                connectingSourceId,
                clickedNode.id,
                edges
              );

              const newEdge: Edge = {
                id: `e-${Date.now()}`,
                source: connectingSourceId,
                target: clickedNode.id,
                sourceHandle,
                targetHandle,
                type: "shadowStep",
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 18,
                  height: 18,
                  color: "#475569",
                },
                style: {
                  stroke: "#475569",
                  strokeWidth: 2,
                },
              };
              setEdges((eds) => addEdge(newEdge, eds));
              setConnectingSourceId(null);
              toastAlert({
                title: "Panah Terhubung!",
                description:
                  connectingSourceId === clickedNode.id
                    ? `Panah loop terhubung di sisi [${sourceHandle} → ${targetHandle}] pada "${clickedNode.data.label}".`
                    : `Panah terhubung di sisi [${sourceHandle} → ${targetHandle}] ke "${clickedNode.data.label}".`,
                variant: "success",
              });
            }
          }}
          connectionMode={ConnectionMode.Loose}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="w-full h-full bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="rgba(148, 163, 184, 0.25)"
          />
          <Controls
            showInteractive={false}
            className="!bg-card/90 !border-border/80 !shadow-md !rounded-lg !bottom-4 !left-4"
          />
          {/* MiniMap di Posisi Semula (Kanan Bawah) */}
          <MiniMap
            zoomable
            pannable
            className="!bg-card/90 !border-border/80 !rounded-lg !shadow-md !bottom-4 !right-4"
            nodeColor={(n: any) => n.data?.color || "#3b82f6"}
          />
        </ReactFlow>

        {/* Floating AI Prompt Bar / Minimized Button di Bawah Kanvas */}
        {!isAiPromptMinimized ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl flex flex-col gap-1.5 rounded-2xl border border-border/90 bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in">
            {/* Header Row: Quick Prompts & Tombol Minimize */}
            <div className="flex items-center justify-between gap-1.5 px-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] flex-1">
                <span className="text-muted-foreground/80 font-mono text-[10px] shrink-0">Contoh:</span>
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromptInput(p);
                      handleGenerateAI(p);
                    }}
                    disabled={isGenerating}
                    className="rounded-full bg-muted/70 hover:bg-muted px-2 py-0.5 text-[10px] text-foreground/80 hover:text-foreground border border-border/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Tombol Minimize AI Prompt Bar */}
              <button
                type="button"
                onClick={() => setIsAiPromptMinimized(true)}
                className="h-6 px-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                title="Minimize Input Text AI"
              >
                <span>Tutup</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Hidden Input File untuk Data Tambahan AI */}
            <input
              ref={fileInputPromptRef}
              type="file"
              onChange={handleAttachFileForAI}
              accept=".txt,.md,.json,.csv,.sql,.js,.ts,.html,.py,.doc,.docx,.pdf,image/*"
              className="hidden"
            />

            {/* Pill File Terlampir (Data Tambahan AI) */}
            {attachedFile && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-xs text-purple-700 dark:text-purple-300 animate-in fade-in-0 duration-150">
                <FileText className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="font-semibold truncate max-w-[220px] sm:max-w-md">{attachedFile.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({Math.round(attachedFile.size / 1024) || 1} KB)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium">
                  Data Tambahan
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="ml-auto p-1 rounded-md hover:bg-purple-500/20 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Hapus file lampiran"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Main Input Row */}
            <div className="flex items-center gap-1.5 bg-background/80 rounded-xl border border-border/70 p-1 pl-2.5 shadow-inner">
              <Sparkles className="h-4 w-4 text-purple-500 shrink-0 animate-pulse" />

              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) {
                    handleGenerateAI();
                  }
                }}
                placeholder={
                  attachedFile
                    ? `Perintahkan AI berdasarkan "${attachedFile.name}" (atau langsung klik Generate)...`
                    : "Ketik alur proses AI (contoh: Alur registrasi user dengan OTP WhatsApp)..."
                }
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/70 outline-none border-none py-1.5 min-w-0"
                disabled={isGenerating}
              />

              {/* Tombol Lampirkan File Data Tambahan */}
              <button
                type="button"
                onClick={() => fileInputPromptRef.current?.click()}
                disabled={isGenerating}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${attachedFile
                  ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                title="Lampirkan file data tambahan untuk AI (.txt, .md, .json, .csv, gambar, dsb)"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px]">Lampirkan</span>
              </button>

              <Button
                size="sm"
                onClick={() => handleGenerateAI()}
                disabled={isGenerating || (!promptInput.trim() && !attachedFile)}
                className="h-8 px-3 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs shrink-0 rounded-lg cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Membuat...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Minimized Pill Button: Membuka kembali input AI dan menyembunyikan MiniMap */
          <button
            type="button"
            onClick={() => setIsAiPromptMinimized(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-purple-500/50 bg-card/95 px-4 py-2 text-xs font-semibold text-foreground shadow-2xl backdrop-blur-xl hover:bg-muted hover:border-purple-500 transition-all cursor-pointer animate-fade-in group"
            title="Buka kembali input AI Prompt"
          >
            <Sparkles className="h-4 w-4 text-purple-500 animate-pulse group-hover:rotate-12 transition-transform" />
            <span>AI Workflow Prompt</span>
          </button>
        )}

        {/* Sidebar Properties Edit Shape di Kanan */}
        {selectedNode && (
          <aside className="absolute top-0 right-0 bottom-0 z-30 w-72 sm:w-80 bg-card/95 border-l border-border/80 shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/70 bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground">Properties Shape</h3>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[190px]">
                    {selectedNode.data.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null);
                  setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                title="Tutup Properties"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Form (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* 1. Tipe Bentuk Shape */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Tipe Bentuk (Shape)</span>
                  <span className="text-[10px] text-muted-foreground font-normal font-mono uppercase">
                    {selectedNode.data.nodeType}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SHAPE_DEFINITIONS.map((def) => {
                    const isCur = selectedNode.data.nodeType === def.type;
                    return (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => {
                          let w = selectedNode.data.width || 160;
                          let h = selectedNode.data.height || 65;
                          if (def.type === "DECISION" && (w < 160 || h < 75)) {
                            w = Math.max(w, 175);
                            h = Math.max(h, 80);
                          } else if (def.type === "START" || def.type === "END") {
                            h = Math.min(h, 55);
                          }
                          handleUpdateSelectedNodeData({ nodeType: def.type, width: w, height: h });
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${isCur
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border/70 hover:bg-muted text-foreground/80"
                          }`}
                        title={def.title}
                      >
                        <span className="text-[10px] truncate w-full">{def.title.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jika tipe IMAGE, tampilkan field Gambar */}
              {selectedNode.data.nodeType === "IMAGE" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">URL / File Gambar</label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedNode.data.imageUrl || ""}
                      onChange={(e) => handleUpdateSelectedNodeData({ imageUrl: e.target.value })}
                      placeholder="https://... atau upload"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => imageFileInputRef.current?.click()}
                      className="h-8 text-xs gap-1 cursor-pointer shrink-0"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      <span>Upload</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* 2. Label Teks Utama & Deskripsi */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-foreground">Teks Label Utama</label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(e) => handleUpdateSelectedNodeData({ label: e.target.value })}
                    placeholder="Nama langkah alur..."
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Keterangan / Sub-teks</label>
                  <Input
                    value={selectedNode.data.description || ""}
                    onChange={(e) => handleUpdateSelectedNodeData({ description: e.target.value })}
                    placeholder="Detail proses, API endpoint, dsb..."
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* 3. ERD Database Fields Editor (Khusus Node Database) */}
              {selectedNode.data.nodeType === "DATABASE" && (
                <div className="space-y-2 p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Table className="h-3.5 w-3.5 text-blue-500" />
                      <span>Kolom / Field ERD (Tabel DB)</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(selectedNode.data.erdFields || []).length} kolom
                    </span>
                  </div>

                  {/* List Kolom */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(selectedNode.data.erdFields || []).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                          {idx === 0 ? <Key className="h-3 w-3" /> : <span className="text-[10px] font-mono font-medium">{idx + 1}</span>}
                        </div>
                        <Input
                          value={field}
                          onChange={(e) => {
                            const newFields = [...(selectedNode.data.erdFields || [])];
                            newFields[idx] = e.target.value;
                            handleUpdateSelectedNodeData({ erdFields: newFields });
                          }}
                          placeholder={idx === 0 ? "id (PK, UUID)" : "nama_kolom (VARCHAR)"}
                          className="h-7 text-xs font-mono flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = (selectedNode.data.erdFields || []).filter((_, i) => i !== idx);
                            handleUpdateSelectedNodeData({ erdFields: newFields });
                          }}
                          className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title="Hapus Kolom"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(!selectedNode.data.erdFields || selectedNode.data.erdFields.length === 0) && (
                      <div className="text-[11px] text-muted-foreground text-center py-2 italic border border-dashed border-border/70 rounded-lg">
                        Belum ada list kolom. Tambahkan kolom untuk render tabel ERD.
                      </div>
                    )}
                  </div>

                  {/* Tombol Tambah Kolom & Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cur = selectedNode.data.erdFields || [];
                        const newFields = [...cur, `field_${cur.length + 1} (VARCHAR)`];
                        handleUpdateSelectedNodeData({
                          erdFields: newFields,
                          height: Math.max(selectedNode.data.height || 65, 75 + newFields.length * 24),
                          width: Math.max(selectedNode.data.width || 160, 200),
                        });
                      }}
                      className="flex-1 h-7 text-xs gap-1 cursor-pointer border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Tambah Kolom</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleUpdateSelectedNodeData({
                          erdFields: ["id (PK, UUID)", "name (VARCHAR)", "status (ENUM)", "created_at (TIMESTAMP)"],
                          height: 175,
                          width: Math.max(selectedNode.data.width || 160, 210),
                        });
                      }}
                      className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Muat preset kolom tabel umum"
                    >
                      Preset
                    </Button>
                  </div>
                </div>
              )}

              {/* 4. Dimensi Ukuran Shape (Slider Lebar & Tinggi) */}
              <div className="space-y-3 p-3 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    <span>Ukuran Shape (Slider)</span>
                  </span>
                </div>

                {/* Slider Lebar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Lebar Shape:</span>
                    <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      {selectedNode.data.width || 160}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={90}
                    max={500}
                    step={5}
                    value={selectedNode.data.width || 160}
                    onChange={(e) => handleUpdateSelectedNodeData({ width: Number(e.target.value) || 160 })}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Slider Tinggi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tinggi Shape:</span>
                    <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      {selectedNode.data.height || 65}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={400}
                    step={5}
                    value={selectedNode.data.height || 65}
                    onChange={(e) => handleUpdateSelectedNodeData({ height: Number(e.target.value) || 65 })}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              {/* 5. Gaya Garis Border */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Gaya Garis (Border)</label>
                <div className="flex gap-2">
                  {[
                    { id: "solid", label: "Solid" },
                    { id: "dashed", label: "Putus-putus" },
                    { id: "double", label: "Ganda" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleUpdateSelectedNodeData({ borderStyle: b.id as any })}
                      className={`flex-1 py-1 px-2 rounded-md border text-xs cursor-pointer transition-colors ${(selectedNode.data.borderStyle || "solid") === b.id
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-xs"
                        : "border-border/70 hover:bg-muted text-foreground/80"
                        }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Warna Shape */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Warna Aksen</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4", "#64748b", "#ec4899"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateSelectedNodeData({ color: c })}
                        style={{ backgroundColor: c }}
                        className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${(selectedNode.data.color || "#3b82f6") === c
                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm"
                          : "hover:scale-110"
                          }`}
                        title={c}
                      />
                    )
                  )}
                </div>
              </div>

              {/* 7. Aksi Cepat Shape */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConnectingSourceId(selectedNode.id);
                    toastAlert({
                      title: "Mode Sambung Panah Aktif",
                      description: `Klik shape tujuan di kanvas untuk menghubungkan panah dari "${selectedNode.data.label}".`,
                      variant: "info",
                    });
                  }}
                  className="w-full h-8 text-xs gap-1.5 text-primary hover:bg-primary/10 border-primary/40 cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>+ Arrow (Hubungkan ke Shape Lain)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="w-full h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-500/10 border-rose-300 dark:border-rose-900 cursor-pointer justify-between"
                  title="Hapus shape terpilih (Shortcut: Tombol Delete / Backspace di keyboard)"
                >
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Shape Ini</span>
                  </div>
                  <kbd className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-mono border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                    Del
                  </kbd>
                </Button>
              </div>

              {/* Petunjuk Reconnect Panah Langsung di Shape */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed flex items-start gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>Arah Panah Fleksibel:</strong> Tarik (drag &amp; drop) titik panah langsung dari/ke point atas, bawah, kiri, atau kanan pada shape di kanvas.</span>
              </div>
            </div>
          </aside>
        )}

        {/* Sidebar Properties Edit Arrow di Kanan */}
        {selectedEdge && (
          <aside className="absolute top-0 right-0 bottom-0 z-30 w-72 sm:w-80 bg-card/95 border-l border-border/80 shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/70 bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <Workflow className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground">Properties Arrow</h3>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[190px]">
                    {sourceNode?.data?.label || selectedEdge.source} → {targetNode?.data?.label || selectedEdge.target}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEdgeId(null);
                  setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                title="Tutup Properties"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Form (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* 1. Info Alur Sambungan & Balik Arah */}
              <div className="space-y-2 p-2.5 rounded-xl border border-border/70 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Alur Sambungan</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReverseEdge}
                    className="h-6 text-[10px] gap-1 px-2 cursor-pointer hover:bg-primary/10 hover:text-primary"
                    title="Tukar Arah Panah (Balikkan Sumber dan Tujuan)"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Balik Arah</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground/90">
                  <span
                    className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium truncate flex-1 text-center border border-blue-500/20"
                    title={sourceNode?.data?.label || selectedEdge.source}
                  >
                    {sourceNode?.data?.label || selectedEdge.source}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium truncate flex-1 text-center border border-emerald-500/20"
                    title={targetNode?.data?.label || selectedEdge.target}
                  >
                    {targetNode?.data?.label || selectedEdge.target}
                  </span>
                </div>
              </div>

              {/* 2. Teks Label Garis Alur */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Label / Keterangan Panah</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Tampil di garis</span>
                </label>
                <Input
                  value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdges((eds) =>
                      eds.map((edge) => (edge.id === selectedEdge.id ? { ...edge, label: val || undefined } : edge))
                    );
                  }}
                  placeholder="Contoh: Ya, Tidak, Approved, Step 2..."
                  className="h-8 text-xs"
                />
              </div>

              {/* 3. Gaya Kepala Panah (Arrowhead Style) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Gaya Kepala Panah</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "directed", label: "1 Arah", icon: ArrowRight, desc: "Panah Standar" },
                    { id: "bidirectional", label: "2 Arah", icon: ArrowLeftRight, desc: "Bolak-balik" },
                    { id: "line", label: "Garis Polos", icon: Minus, desc: "Tanpa Panah" },
                    { id: "dashed", label: "Putus-putus", icon: null, desc: "Dashed Line" },
                  ].map((st) => {
                    const isCur =
                      st.id === "bidirectional"
                        ? !!selectedEdge.markerStart && !!selectedEdge.markerEnd
                        : st.id === "line"
                          ? !selectedEdge.markerStart && !selectedEdge.markerEnd
                          : st.id === "dashed"
                            ? !!selectedEdge.style?.strokeDasharray
                            : !selectedEdge.markerStart && !!selectedEdge.markerEnd && !selectedEdge.style?.strokeDasharray;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleUpdateEdgeStyle(st.id as any)}
                        className={`flex items-center gap-1.5 p-2 rounded-lg border text-left cursor-pointer transition-all ${isCur
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border/70 hover:bg-muted text-foreground/80"
                          }`}
                      >
                        {st.icon && <st.icon className="h-3.5 w-3.5 shrink-0" />}
                        {st.id === "dashed" && <span className="font-mono text-xs font-bold shrink-0">---</span>}
                        <div className="min-w-0">
                          <div className="text-[11px] leading-tight font-medium">{st.label}</div>
                          <div className="text-[9px] text-muted-foreground leading-tight">{st.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Titik Sambung Pangkal ("Dari Sisi") */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Dari Sisi (Shape Asal)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">
                    {selectedEdge.sourceHandle || "bottom"}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "top", label: "Atas", icon: ArrowUp },
                    { id: "right", label: "Kanan", icon: ArrowRight },
                    { id: "bottom", label: "Bawah", icon: ArrowDown },
                    { id: "left", label: "Kiri", icon: ArrowLeft },
                  ].map((h) => {
                    const isCur = (selectedEdge.sourceHandle || "bottom") === h.id;
                    const IconComp = h.icon;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleUpdateEdgeSourceHandle(h.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${isCur
                          ? "border-blue-500 bg-blue-600 text-white font-bold shadow-xs scale-102"
                          : "border-border/70 hover:bg-muted text-foreground"
                          }`}
                        title={`Pindahkan pangkal panah ke sisi ${h.label} shape asal`}
                      >
                        <div className="flex justify-center items-center py-0.5"><IconComp className="h-3.5 w-3.5" /></div>
                        <div className="text-[10px] mt-0.5">{h.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Titik Sambung Ujung ("Ke Sisi") */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Ke Sisi (Shape Tujuan)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">
                    {selectedEdge.targetHandle || "top"}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "top", label: "Atas", icon: ArrowUp },
                    { id: "right", label: "Kanan", icon: ArrowRight },
                    { id: "bottom", label: "Bawah", icon: ArrowDown },
                    { id: "left", label: "Kiri", icon: ArrowLeft },
                  ].map((h) => {
                    const isCur = (selectedEdge.targetHandle || "top") === h.id;
                    const IconComp = h.icon;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleUpdateEdgeTargetHandle(h.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${isCur
                          ? "border-emerald-500 bg-emerald-600 text-white font-bold shadow-xs scale-102"
                          : "border-border/70 hover:bg-muted text-foreground"
                          }`}
                        title={`Pindahkan ujung panah ke sisi ${h.label} shape tujuan`}
                      >
                        <div className="flex justify-center items-center py-0.5"><IconComp className="h-3.5 w-3.5" /></div>
                        <div className="text-[10px] mt-0.5">{h.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Ketebalan Garis (Stroke Width) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Ketebalan Garis</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {Number(selectedEdge.style?.strokeWidth || 2)}px
                  </span>
                </label>
                <div className="flex gap-1.5">
                  {[
                    { label: "1.5px", val: 1.5 },
                    { label: "2.0px", val: 2.0 },
                    { label: "2.5px", val: 2.5 },
                    { label: "3.0px", val: 3.0 },
                    { label: "4.0px", val: 4.0 },
                  ].map((sw) => {
                    const isCur = Number(selectedEdge.style?.strokeWidth || 2) === sw.val;
                    return (
                      <button
                        key={sw.val}
                        type="button"
                        onClick={() => handleUpdateEdgeStrokeWidth(sw.val)}
                        className={`flex-1 py-1 rounded-md border text-[11px] font-mono font-medium transition-all cursor-pointer ${isCur
                          ? "border-primary bg-primary text-white font-bold shadow-xs"
                          : "border-border/70 hover:bg-muted text-foreground"
                          }`}
                        title={`Ketebalan ${sw.label}`}
                      >
                        {sw.val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Warna Garis & Arrow */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Warna Garis</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(selectedEdge.style?.stroke as string) || "#475569"}
                  </span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["#475569", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateEdgeColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${((selectedEdge.style?.stroke as string) || "#475569") === c
                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm"
                          : "hover:scale-110"
                          }`}
                        title={c}
                      />
                    )
                  )}
                </div>
              </div>

              {/* 8. Animasi Aliran Panah */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={`h-4 w-4 ${selectedEdge.animated ? "text-purple-500 animate-pulse" : "text-muted-foreground"}`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Animasi Aliran</div>
                    <div className="text-[10px] text-muted-foreground">Efek pulsa mengalir pada garis</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEdgeAnimation}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${selectedEdge.animated ? "bg-purple-600" : "bg-muted-foreground/30"
                    }`}
                  title={selectedEdge.animated ? "Matikan Animasi" : "Aktifkan Animasi"}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white absolute top-0.5 transition-transform ${selectedEdge.animated ? "right-0.5" : "left-0.5"
                      }`}
                  />
                </button>
              </div>

              {/* 9. Tombol Aksi Hapus */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="w-full h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-500/10 border-rose-300 dark:border-rose-900 cursor-pointer justify-between"
                  title="Hapus garis panah terpilih (Shortcut: Tombol Delete / Backspace di keyboard)"
                >
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Arrow Ini</span>
                  </div>
                  <kbd className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-mono border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                    Del
                  </kbd>
                </Button>
              </div>

              {/* Petunjuk Reconnect di Kanvas */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed flex items-start gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>Tips Geser di Kanvas:</strong> Anda juga bisa men-drag langsung titik bulat biru (pangkal) dan hijau (ujung) pada panah di kanvas ke sisi shape mana pun.</span>
              </div>
            </div>
          </aside>
        )}

        {/* Input Tersembunyi untuk Impor Diagram JSON */}
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportJSON}
          className="hidden"
        />

        {/* Modal Konfirmasi Hapus Diagram */}
        <ConfirmationDialog
          open={Boolean(targetDiagramToDelete)}
          onOpenChange={(open) => !open && setTargetDiagramToDelete(null)}
          title="Hapus Diagram Flowchart?"
          description={`Apakah Anda yakin ingin menghapus diagram "${targetDiagramToDelete?.title}"? Seluruh langkah proses dan koneksi panah akan dihapus secara permanen dari workspace.`}
          confirmText="Ya, Hapus Diagram"
          cancelText="Batal"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleExecuteDeleteDiagram}
        />

        {/* Modal Share / Bagikan Diagram */}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl animate-scale-in space-y-4">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Bagikan Diagram Flowchart</h3>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                      {title} ({nodes.length} langkah, {edges.length} alur)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setShareTab("link")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${shareTab === "link"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Salin Tautan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareTab("chat")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${shareTab === "chat"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Obrolan Tim</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareTab("export")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${shareTab === "export"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>File JSON</span>
                </button>
              </div>

              {/* Tab Content 1: Salin Tautan (Copy Link) */}
              {/* Tab Content 1: Salin Tautan Preview Publik (Bebas Akses Tanpa Auth) */}
              {shareTab === "link" && (
                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Tautan Pratinjau Publik (Tanpa Perlu Login / Auth)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={getShareUrl()}
                        className="text-xs h-9 bg-muted/30 font-mono text-muted-foreground"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        size="sm"
                        onClick={handleCopyShareLink}
                        className="h-9 px-3 text-xs gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                      >
                        {isCopiedLink ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getShareUrl(), "_blank")}
                        className="h-9 px-3 text-xs gap-1.5 shrink-0 border-border/80 hover:bg-muted text-foreground cursor-pointer"
                        title="Buka Pratinjau Publik di Tab Baru"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Buka</span>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Akses Publik Langsung (Tanpa Perlu Login / Akun)</span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-normal">
                      Siapa pun yang menerima tautan ini dapat langsung melihat halaman pratinjau diagram flowchart secara penuh dan interaktif tanpa perlu autentikasi atau login sama sekali.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Content 2: Bagikan ke Obrolan Tim (Share to Chat) */}
              {shareTab === "chat" && (
                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Pratinjau Pesan yang Akan Dikirim:
                    </label>
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Workflow className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>[Flowchart Shared] {title}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {nodes.length} langkah proses • {edges.length} alur panah
                      </div>
                      {chatNote.trim() && (
                        <div className="text-xs italic text-foreground/80 bg-background/50 p-2 rounded-lg border border-border/40">
                          "{chatNote.trim()}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Catatan Pengantar untuk Tim (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={chatNote}
                      onChange={(e) => setChatNote(e.target.value)}
                      placeholder="Contoh: Tolong review diagram alur ini ya tim..."
                      className="w-full text-xs rounded-lg border border-border bg-background p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleShareToTeamChat}
                    disabled={isSendingToChat}
                    className="w-full h-9 text-xs gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {isSendingToChat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>{isSendingToChat ? "Mengirim ke Chat..." : "Kirim ke Obrolan Tim"}</span>
                  </Button>
                </div>
              )}

              {/* Tab Content 3: File JSON Export & Import */}
              {shareTab === "export" && (
                <div className="space-y-3 py-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Export JSON Card */}
                    <div className="rounded-xl border border-border/80 p-3 bg-muted/20 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <FileCode className="h-4 w-4 text-amber-500" />
                          <span>Unduh File JSON</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Ekspor data alur lengkap untuk arsip backup atau dibagikan offline.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportJSON}
                        className="w-full h-8 text-xs gap-1.5 cursor-pointer hover:border-amber-500 hover:text-amber-600"
                      >
                        <Download className="h-3.5 w-3.5 text-amber-500" />
                        <span>Download .JSON</span>
                      </Button>
                    </div>

                    {/* Import JSON Card */}
                    <div className="rounded-xl border border-border/80 p-3 bg-muted/20 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Upload className="h-4 w-4 text-cyan-500" />
                          <span>Impor File JSON</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Buka file diagram flowchart (.json) yang dibagikan oleh rekan kerja.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => jsonFileInputRef.current?.click()}
                        className="w-full h-8 text-xs gap-1.5 cursor-pointer hover:border-cyan-500 hover:text-cyan-600"
                      >
                        <Upload className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Pilih File .JSON</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
