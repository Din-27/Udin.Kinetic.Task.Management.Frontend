export type RealtimeEventType =
  | "CHAT_MESSAGE"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_MOVED"
  | "TASK_COMPLETED"
  | "COMMENT_ADDED";

export interface RealtimeEventPayload {
  id: string;
  type: RealtimeEventType;
  title: string;
  message: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp: string;
  meta?: {
    taskId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
  };
}

type RealtimeListener = (event: RealtimeEventPayload) => void;

class RealtimeHub {
  private listeners: Set<RealtimeListener> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("kinetic_realtime_channel");
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.notifyListeners(event.data);
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel tidak didukung:", e);
      }
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(payload: Omit<RealtimeEventPayload, "id" | "timestamp">) {
    const fullPayload: RealtimeEventPayload = {
      ...payload,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // 1. Notify current tab listeners
    this.notifyListeners(fullPayload);

    // 2. Broadcast to other tabs/windows (hanya untuk event lokal non-socket)
    // CHAT_MESSAGE dan COMMENT_ADDED sudah dikirim via Socket.IO sehingga tidak boleh di-echo lagi
    if (this.channel && payload.type !== "CHAT_MESSAGE" && payload.type !== "COMMENT_ADDED") {
      try {
        this.channel.postMessage(fullPayload);
      } catch (e) {
        console.warn("Gagal postMessage ke BroadcastChannel:", e);
      }
    }
  }

  private notifyListeners(event: RealtimeEventPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in realtime listener:", err);
      }
    });
  }
}

export const realtimeHub = new RealtimeHub();
