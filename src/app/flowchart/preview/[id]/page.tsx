"use client";

import React from "react";
import { useParams } from "next/navigation";
import { FlowchartPublicPreview } from "@/components/flowchart/FlowchartPublicPreview";

export default function FlowchartDynamicPreviewPage() {
  const params = useParams();
  const diagramId = (params?.id as string) || "";

  return <FlowchartPublicPreview diagramId={diagramId} />;
}
