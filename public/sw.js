self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener untuk Push Notification dari server
self.addEventListener("push", (event) => {
  let data = {
    title: "Diskusi Tim",
    body: "Ada pesan baru pada workspace Anda.",
    icon: "/favicon.ico",
    url: "/",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    (async () => {
      // 1. Cek izin notifikasi
      if (Notification.permission !== "granted") {
        console.warn("ServiceWorker: Izin notifikasi belum diberikan atau ditolak.");
        return;
      }

      // 2. Ambil informasi client aktif untuk cek currentUserId secara dinamis jika diperlukan
      // (Opsional: Anda bisa mengirimkan userId aktif lewat payload push dari server langsung)
      if (data.senderId && data.currentBrowserUserId) {
        if (String(data.senderId) === String(data.currentBrowserUserId)) {
          return; // Batalkan jika dikirim oleh user yang sama
        }
      }

      // 3. Format options notifikasi
      const tag =
        data.tag ||
        `kinetic-${(data.title + "-" + data.body).replace(/\s+/g, "_").slice(0, 50)}`;

      const options = {
        body: data.body,
        icon: data.icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: tag,
        renotify: true,
        data: {
          url: data.url || "/",
          dateOfArrival: Date.now(),
        },
      };

      try {
        await self.registration.showNotification(data.title, options);
      } catch (err) {
        console.error("ServiceWorker: Gagal mengeksekusi showNotification:", err);
      }
    })()
  );
});

// Listener saat notifikasi diklik oleh pengguna
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Cari apakah sudah ada tab dengan URL yang sama terbuka
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      // Jika ada sembarang tab aplikasi yang terbuka, arahkan ke targetUrl lalu fokus
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            await client.navigate(targetUrl).catch(() => { });
          }
          return client.focus();
        }
      }

      // Jika tidak ada tab terbuka sama sekali, buka tab baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});