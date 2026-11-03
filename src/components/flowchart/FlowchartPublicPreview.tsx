"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Workflow,
  Download,
  FileDown,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { toastAlert } from "@/components/ui/alert-toast";
import {
  FlowchartDiagram,
  FlowchartNodeData,
  nodeTypes,
  edgeTypes,
} from "./FlowchartView";
import { useFlowchartByIdQuery } from "@/lib/hooks/useFlowchartQueries";

interface FlowchartPublicPreviewProps {
  diagramId: string;
}

export function FlowchartPublicPreview({ diagramId }: FlowchartPublicPreviewProps) {
  return (
    <ReactFlowProvider>
      <FlowchartPreviewContent diagramId={diagramId} />
    </ReactFlowProvider>
  );
}

function FlowchartPreviewContent({ diagramId }: { diagramId: string }) {
  const reactFlowInstance = useReactFlow();

  const [diagram, setDiagram] = useState<FlowchartDiagram | null>(null);
  const [nodes, setNodes] = useState<Node<FlowchartNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // TanStack Query: Fetch Diagram Data Publik dari Backend API (Tanpa Auth)
  const {
    data: queryDiagram,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useFlowchartByIdQuery(diagramId);

  useEffect(() => {
    setIsLoading(isQueryLoading);
  }, [isQueryLoading]);

  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : "Terjadi kesalahan saat memuat diagram.");
    }
  }, [queryError]);

  useEffect(() => {
    if (queryDiagram) {
      setDiagram(queryDiagram);
      setError(null);

      // Konversi Nodes
      const flowNodes: Node<FlowchartNodeData>[] = (queryDiagram.nodes || []).map((n) => ({
        id: n.id,
        type: "flowchartNode",
        position: { x: n.x, y: n.y },
        data: {
          label: n.label,
          description: n.description,
          nodeType: n.type,
          color: n.color || "#3b82f6",
          borderStyle: n.borderStyle || "solid",
          imageUrl: n.imageUrl,
          width: n.width || 160,
          height: n.height || 65,
        },
      }));

      // Konversi Edges
      const flowEdges: Edge[] = (queryDiagram.edges || []).map((e) => {
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

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [queryDiagram]);

  // Fit view setelah node selesai dimuat
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, reactFlowInstance]);

  // Salin URL Preview ke Clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toastAlert({
        title: "Tautan Berhasil Disalin!",
        description: "Tautan preview publik telah disalin ke clipboard.",
        variant: "success",
      });
    } catch {
      toastAlert({
        title: "Gagal Menyalin",
        description: "Salin URL dari bilah alamat browser Anda.",
        variant: "warning",
      });
    }
  };

  // Export Dokumen PDF dari Preview
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Header PDF
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 55, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(diagram?.title || "Flowchart Diagram", margin, 32);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Preview Publik • ${nodes.length} Langkah Alur • ${edges.length} Panah Hubung`, margin, 46);

      // Render info ke PDF
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      doc.text("Ringkasan Langkah Alur:", margin, 85);

      let yPos = 110;
      nodes.forEach((n, idx) => {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 50;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${idx + 1}. [${n.data.nodeType}] ${n.data.label}`, margin + 15, yPos);
        yPos += 20;
      });

      doc.save(`${(diagram?.title || "flowchart").toLowerCase().replace(/[^a-z0-9]/g, "_")}_preview.pdf`);

      toastAlert({
        title: "PDF Diunduh!",
        description: "Dokumen PDF diagram berhasil disimpan.",
        variant: "success",
      });
    } catch {
      toastAlert({
        title: "Gagal Mengunduh PDF",
        description: "Terjadi kesalahan saat membuat file PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export SVG dari Preview
  const handleExportSVG = () => {
    const svgEl = document.querySelector(".react-flow__viewport");
    if (!svgEl) return;

    try {
      const bbox = svgEl.getBoundingClientRect();
      const serializer = new XMLSerializer();
      const content = serializer.serializeToString(svgEl);

      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="0 0 ${bbox.width} ${bbox.height}">
        <style>
          .react-flow__edge-path { fill: none; }
          text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        </style>
        ${content}
      </svg>`;

      const blob = new Blob([fullSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(diagram?.title || "flowchart").toLowerCase().replace(/[^a-z0-9]/g, "_")}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastAlert({
        title: "SVG Diunduh!",
        description: "File gambar vektor SVG berhasil disimpan.",
        variant: "success",
      });
    } catch {
      toastAlert({
        title: "Gagal Mengunduh SVG",
        description: "Tidak dapat mengekspor SVG diagram.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background relative">
      {/* Top Bar Preview Publik: Bersih, Rapi & Profesional */}
      <header className="border-b border-border/80 bg-card/90 backdrop-blur-md px-4 py-2.5 z-20 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Judul Diagram */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 shadow-xs">
              <Workflow className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-foreground truncate max-w-[240px] sm:max-w-[420px]">
                  {diagram?.title || "Flowchart Diagram"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Pratinjau Publik
                </span>
                {nodes.length > 0 && (
                  <>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                      {nodes.length} Langkah
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                      {edges.length} Alur Panah
                    </span>
                  </>
                )}
              </div>
              {diagram?.description && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[400px]">
                  {diagram.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Salin Tautan Preview */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs gap-1.5 cursor-pointer bg-card hover:bg-muted text-foreground"
              title="Salin tautan preview diagram"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="hidden sm:inline">{isCopied ? "Tersalin" : "Salin Link"}</span>
            </Button>

            {/* Export SVG */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSVG}
              className="h-8 text-xs gap-1.5 cursor-pointer bg-card hover:bg-muted text-foreground"
              title="Download gambar vektor SVG"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">Export SVG</span>
            </Button>

            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="h-8 text-xs gap-1.5 cursor-pointer bg-card hover:bg-muted text-foreground"
              title="Download dokumen cetak PDF"
            >
              {isExportingPDF ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
              ) : (
                <FileDown className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span className="hidden md:inline">Export PDF</span>
            </Button>

            {/* Buka di Kinetic App */}
            {diagram?.id && (
              <Button
                size="sm"
                onClick={() => (window.location.href = `/?nav=flowchart&diagramId=${encodeURIComponent(diagram.id)}`)}
                className="h-8 text-xs gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                title="Buka diagram ini di editor Kinetic"
              >
                <span>Buka di Aplikasi</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Canvas Kanvas Flowchart */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2.5}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          proOptions={{ hideAttribution: true }}
          className="bg-background select-none"
        >
          {/* Controls: Zoom In, Zoom Out, Fit View */}
          <Controls
            showInteractive={false}
            className="!bg-card/90 !border !border-border/80 !rounded-xl !shadow-lg backdrop-blur-md overflow-hidden !fill-foreground"
          />

          {/* MiniMap untuk Navigasi Cepat */}
          <MiniMap
            zoomable
            pannable
            nodeColor={(node: any) => node.data?.color || "#3b82f6"}
            className="!bg-card/85 !border !border-border/80 !rounded-xl !shadow-xl backdrop-blur-md overflow-hidden"
          />

          {/* Background Grid Pattern */}
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="var(--border)" />
        </ReactFlow>

        {/* Loading Overlay (Tanpa me-unmount ReactFlow) */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/85 backdrop-blur-xs animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 animate-pulse">
                  <Workflow className="h-7 w-7" />
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-foreground">Memuat Diagram Flowchart</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menyiapkan pratinjau publik...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Overlay jika diagram tidak ditemukan */}
        {error && !isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-background/90 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-4 max-w-md text-center rounded-2xl border border-border/80 bg-card p-6 shadow-xl animate-scale-in">
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Diagram Tidak Ditemukan</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Coba Lagi</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/")}
                  className="text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground"
                >
                  <span>Buka Aplikasi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Petunjuk Interaksi Floating di Bawah */}
        {!isLoading && !error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="rounded-full bg-card/85 border border-border/80 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur-md flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Mode Pratinjau Interaktif • Geser kanvas atau zoom untuk menjelajahi alur</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
