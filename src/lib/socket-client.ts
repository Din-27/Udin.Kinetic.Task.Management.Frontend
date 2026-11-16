import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;
let isInitializing = false;

/**
 * Mendapatkan atau membuat instance Socket.IO client singleton
 */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    return {} as Socket;
  }

  if (!socketInstance) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    socketInstance = io(socketUrl, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["polling", "websocket"],
    });

    socketInstance.on("connect", () => {
      console.log(`[Socket.IO Client] Terhubung ke server, ID: ${socketInstance?.id}`);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("[Socket.IO Client] Gagal terhubung:", err.message);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[Socket.IO Client] Terputus:", reason);
    });
  }

  return socketInstance;
}

/**
 * Inisialisasi socket dengan memanggil endpoint /api/socket-init
 * untuk memastikan backend Express & Socket.IO server siap menerima koneksi.
 */
export async function initSocket(): Promise<Socket> {
  if (typeof window === "undefined") return {} as Socket;

  if (!isInitializing) {
    isInitializing = true;
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
      const targetUrl = socketUrl ? `${socketUrl}/api/socket-init` : "/api/socket-init";
      const res = await fetch(targetUrl).catch(() => fetch("/api/socket-init"));
      if (!res.ok) {
        console.warn(`[SocketClient] /api/socket-init status: ${res.status}`);
      }
    } catch (e) {
      console.warn("[SocketClient] Inisialisasi endpoint socket HTTP:", e);
    } finally {
      isInitializing = false;
    }
  }

  const socket = getSocket();
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Bergabung ke room workspace tertentu
 */
export function joinWorkspaceRoom(workspaceId: string) {
  if (!workspaceId) return;
  const socket = getSocket();
  const doJoin = () => {
    socket.emit("join-workspace", workspaceId);
  };
  if (socket.connected) {
    doJoin();
  } else {
    socket.once("connect", doJoin);
  }
}

/**
 * Meninggalkan room workspace
 */
export function leaveWorkspaceRoom(workspaceId: string) {
  if (!workspaceId) return;
  const socket = getSocket();
  if (socket.connected) {
    socket.emit("leave-workspace", workspaceId);
  }
}

/**
 * Bergabung ke room task tertentu (untuk komentar & diskusi per-task)
 */
export function joinTaskRoom(taskId: string) {
  if (!taskId) return;
  const socket = getSocket();
  const doJoin = () => {
    socket.emit("join-task", taskId);
  };
  if (socket.connected) {
    doJoin();
  } else {
    socket.once("connect", doJoin);
  }
}

/**
 * Meninggalkan room task
 */
export function leaveTaskRoom(taskId: string) {
  if (!taskId) return;
  const socket = getSocket();
  if (socket.connected) {
    socket.emit("leave-task", taskId);
  }
}
