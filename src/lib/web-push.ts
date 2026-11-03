// Client helper for Web Push Notifications (Windows Desktop Support)

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.NEXT_VAPID_PUBLIC_KEY ||
  "BLeU_4VxmooOIxLVGlssH3fLzxMiQQ1RgAOVyS8xG8q3C7zRpkHDvFYXLhlXWgGyMdwfk3flVdIdtJyglgMVEj4";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Registrasi Service Worker di background
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn("Gagal mendaftarkan Service Worker:", err);
    return null;
  }
}

/**
 * Cek status izin notifikasi saat ini
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Request izin dan daftarkan Push Subscription ke server
 */
/**
 * Memeriksa apakah push subscription saat ini valid/kadaluarsa, dan memperbarui data di backend jika berubah
 */
export async function checkAndRefreshPushSubscription(
  metadata?: { userId?: string; workspaceId?: string },
  forceUpdate = false
): Promise<boolean> {
  if (typeof window === "undefined" || !isPushNotificationSupported()) return false;
  if (getNotificationPermissionState() !== "granted") return false;

  try {
    const registration = await registerPushServiceWorker().catch(() => null);
    if (!registration || !("pushManager" in registration)) return false;

    let subscription = await registration.pushManager.getSubscription();
    const convertedVapidKey = urlBase64ToUint8Array(String(VAPID_PUBLIC_KEY));

    // 1. Cek apakah subscription browser sudah kadaluarsa (expirationTime)
    let isExpired = false;
    if (subscription && typeof subscription.expirationTime === "number" && subscription.expirationTime > 0) {
      if (Date.now() >= subscription.expirationTime - 60000) {
        console.warn("[PushManager] Subscription browser telah kadaluarsa (expirationTime tercapai).");
        isExpired = true;
      }
    }

    // 2. Cek apakah VAPID Application Server Key di browser masih cocok dengan key server
    let isKeyMismatch = false;
    if (subscription && !isExpired) {
      try {
        const rawAppKey = (subscription as any).options?.applicationServerKey;
        if (rawAppKey) {
          const currentKeyBytes = new Uint8Array(rawAppKey);
          isKeyMismatch =
            currentKeyBytes.length !== convertedVapidKey.length ||
            !currentKeyBytes.every((b, i) => b === convertedVapidKey[i]);
          if (isKeyMismatch) {
            console.warn("[PushManager] VAPID Key berubah, perlu registrasi ulang subscription.");
          }
        }
      } catch (err) {
        console.warn("[PushManager] Tidak dapat membaca existing applicationServerKey:", err);
      }
    }

    // 3. Jika subscription kadaluarsa atau key mismatch, unsubscribe dari browser
    if (subscription && (isExpired || isKeyMismatch)) {
      try {
        await subscription.unsubscribe();
      } catch (err) {
        console.warn("[PushManager] Unsubscribe gagal:", err);
      }
      subscription = null;
    }

    // 4. Jika belum ada subscription atau baru saja di-unsubscribe, lakukan subscribe ulang
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
      console.log("[PushManager] Subscription baru berhasil dibuat di browser:", subscription.endpoint.slice(0, 45) + "...");
    }

    if (!subscription || !subscription.endpoint) return false;

    // 5. Periksa apakah subscription berubah dibandingkan rekaman sebelumnya di browser
    const oldEndpoint = localStorage.getItem("kinetic_push_endpoint") || "";
    const oldMeta = localStorage.getItem("kinetic_push_meta") || "";
    const newMeta = `${metadata?.userId || ""}:${metadata?.workspaceId || ""}`;
    const isEndpointChanged = Boolean(oldEndpoint && oldEndpoint !== subscription.endpoint);
    const isMetaChanged = Boolean(newMeta && oldMeta !== newMeta);
    const lastSyncTime = Number(localStorage.getItem("kinetic_push_last_sync") || 0);
    const isSyncStale = Date.now() - lastSyncTime > 4 * 60 * 1000; // Selalu sinkronkan minimal per 4 menit

    // 6. Sinkronkan ID user aktif ke Service Worker
    if (navigator.serviceWorker.controller && metadata?.userId) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_CURRENT_USER",
        userId: metadata.userId,
      });
    }

    // 7. Jika endpoint berubah, metadata berubah, forceUpdate aktif, atau belum pernah sync: kirim update ke backend
    if (isEndpointChanged || isMetaChanged || isSyncStale || forceUpdate || !oldEndpoint) {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          subscription,
          oldEndpoint: isEndpointChanged ? oldEndpoint : undefined,
          userId: metadata?.userId,
          workspaceId: metadata?.workspaceId,
        }),
      });

      if (res.ok) {
        localStorage.setItem("kinetic_push_endpoint", subscription.endpoint);
        localStorage.setItem("kinetic_push_meta", newMeta);
        localStorage.setItem("kinetic_push_last_sync", String(Date.now()));
        return true;
      }
    } else {
      return true;
    }
  } catch (err) {
    console.warn("[PushManager] Pengecekan atau pembaruan subscription gagal:", err);
  }

  return false;
}

/**
 * Request izin dan daftarkan Push Subscription ke server
 */
export async function subscribeToPushNotifications(metadata?: {
  userId?: string;
  workspaceId?: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Browser Anda tidak mendukung Web Notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  return checkAndRefreshPushSubscription(metadata, true);
}

/**
 * Sinkronisasi berkala (Heartbeat / Keep-Alive) untuk memastikan subscription
 * di browser tetap tercatat dan aktif di database backend systemSetting
 */
export async function syncPushSubscriptionHeartbeat(metadata?: {
  userId?: string;
  workspaceId?: string;
}): Promise<boolean> {
  return checkAndRefreshPushSubscription(metadata, false);
}

export interface WindowsPushPayload {
  title: string;
  body: string;
  url?: string;
  excludeUserId?: string;
  workspaceId?: string;
}

/**
 * Trigger pengiriman notifikasi Windows Desktop secara langsung dan via background push
 */
export async function triggerWindowsPushNotification(
  payload: WindowsPushPayload
): Promise<boolean> {
  if (!payload || !payload.title || !payload.body) {
    console.warn("triggerWindowsPushNotification: payload title atau body kosong, request dibatalkan.");
    return false;
  }

  // 1. Tampilkan notifikasi secara lokal jika izin granted
  if (typeof window !== "undefined" && "Notification" in window) {
    let perm = Notification.permission;
    if (perm === "default") {
      try {
        perm = await Notification.requestPermission();
      } catch {}
    }
  }

  const completePayload = {
    title: payload.title,
    body: typeof payload.body === "string" ? payload.body : String(payload.body || ""),
    url: payload.url || (typeof window !== "undefined" ? window.location.origin : "/"),
    excludeUserId: payload.excludeUserId || "",
    workspaceId: payload.workspaceId || "",
  };

  // 2. Kirim via backend push
  try {
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        notification: completePayload,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (e) {
    // Abaikan jika server push offline
  }

  return false;
}
