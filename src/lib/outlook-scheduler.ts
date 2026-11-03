export interface OutlookSchedulerConfig {
  enabled: boolean;
  mode: "interval" | "time";
  intervalMinutes: number; // 15, 30, 60, 120
  scheduledTime: string; // e.g. "09:00"
  lastSyncTime?: string;
  lastCreatedCount?: number;
  workspaceId?: string;
}

// Default schedule adalah OFF (enabled: false)
export const DEFAULT_OUTLOOK_SCHEDULER_CONFIG: OutlookSchedulerConfig = {
  enabled: false,
  mode: "interval",
  intervalMinutes: 30,
  scheduledTime: "09:00",
};

export const OUTLOOK_SCHEDULER_EVENT = "kinetic_outlook_scheduler_updated";
export const OUTLOOK_PROJECT_CREATED_EVENT = "kinetic_outlook_project_created";

let memoryConfig: OutlookSchedulerConfig = DEFAULT_OUTLOOK_SCHEDULER_CONFIG;

export function getOutlookSchedulerConfig(): OutlookSchedulerConfig {
  if (typeof window !== "undefined") {
    // Initial fetch dari API server jika belum
    fetch("/api/integrations/outlook/scheduler")
      .then((r) => (r.ok ? r.json() : null))
      .then((serverData) => {
        if (serverData) {
          memoryConfig = { ...DEFAULT_OUTLOOK_SCHEDULER_CONFIG, ...serverData };
          window.dispatchEvent(
            new CustomEvent(OUTLOOK_SCHEDULER_EVENT, { detail: memoryConfig })
          );
        }
      })
      .catch(() => {});
  }
  return memoryConfig;
}

export async function saveOutlookSchedulerConfig(
  config: OutlookSchedulerConfig,
  workspaceId?: string
): Promise<{ success: boolean; config: OutlookSchedulerConfig; project?: any }> {
  memoryConfig = config;
  if (typeof window === "undefined") {
    return { success: true, config };
  }

  try {
    const res = await fetch("/api/integrations/outlook/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        workspaceId: workspaceId || config.workspaceId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Jika server membuat project "Issues from Outlook" saat scheduler dihidupkan, broadcast ke UI
    if (data.project) {
      window.dispatchEvent(
        new CustomEvent(OUTLOOK_PROJECT_CREATED_EVENT, {
          detail: data.project,
        })
      );
    }

    window.dispatchEvent(
      new CustomEvent(OUTLOOK_SCHEDULER_EVENT, { detail: config })
    );

    return {
      success: res.ok,
      config: data.config || config,
      project: data.project,
    };
  } catch (err) {
    console.warn("Failed to sync scheduler to server:", err);
    window.dispatchEvent(
      new CustomEvent(OUTLOOK_SCHEDULER_EVENT, { detail: config })
    );
    return { success: false, config };
  }
}

export function updateLastSyncTime(createdCount: number = 0): void {
  const current = getOutlookSchedulerConfig();
  const updated: OutlookSchedulerConfig = {
    ...current,
    lastSyncTime: new Date().toISOString(),
    lastCreatedCount: createdCount,
  };
  saveOutlookSchedulerConfig(updated);
}
