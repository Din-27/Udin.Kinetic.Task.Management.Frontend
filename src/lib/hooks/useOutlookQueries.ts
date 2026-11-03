import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OutlookSchedulerConfig, DEFAULT_OUTLOOK_SCHEDULER_CONFIG } from "@/lib/outlook-scheduler";

export interface OutlookSyncPayload {
  workspaceId: string;
  projectId?: string;
  memberEmails?: string[];
}

export interface OutlookSyncResult {
  totalScanned: number;
  createdCount: number;
  skippedCount: number;
  createdTasks: Array<{
    task: any;
    category: string;
    reasoning: string;
    originalEmail: any;
  }>;
  skippedEmails: Array<{
    subject: string;
    sender: string;
    category: string;
    reason: string;
  }>;
}

export function useOutlookSchedulerQuery() {
  return useQuery<OutlookSchedulerConfig>({
    queryKey: ["outlook-scheduler"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/outlook/scheduler");
      if (!res.ok) {
        throw new Error("Gagal mengambil konfigurasi scheduler Outlook");
      }
      const data = await res.json();
      return { ...DEFAULT_OUTLOOK_SCHEDULER_CONFIG, ...data };
    },
  });
}

export function useSaveOutlookSchedulerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      config,
      workspaceId,
    }: {
      config: OutlookSchedulerConfig;
      workspaceId?: string;
    }) => {
      const res = await fetch("/api/integrations/outlook/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          workspaceId: workspaceId || config.workspaceId,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan jadwal Outlook");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["outlook-scheduler"], data.config);
      queryClient.invalidateQueries({ queryKey: ["outlook-scheduler"] });
    },
  });
}

export function useOutlookSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation<OutlookSyncResult, Error, OutlookSyncPayload>({
    mutationFn: async (payload: OutlookSyncPayload) => {
      const res = await fetch("/api/integrations/outlook/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal sinkronisasi email Outlook.");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
