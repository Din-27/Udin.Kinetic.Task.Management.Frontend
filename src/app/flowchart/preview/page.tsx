"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FlowchartPublicPreview } from "@/components/flowchart/FlowchartPublicPreview";
import { Loader2, Workflow } from "lucide-react";

function PreviewPageContent() {
  const searchParams = useSearchParams();
  const diagramId = searchParams.get("id") || "";

  return <FlowchartPublicPreview diagramId={diagramId} />;
}

export default function FlowchartPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 animate-pulse">
              <Workflow className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Menyiapkan Pratinjau Diagram...</span>
            </div>
          </div>
        </div>
      }
    >
      <PreviewPageContent />
    </Suspense>
  );
}
