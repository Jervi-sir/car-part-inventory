/* global self, clients */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming pushes (payload should be JSON: { title, body, icon, data, actions, badge })
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Notification', body: event.data.text() };
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge,
    data: payload.data || {},                 // e.g. { url: '/somewhere' }
    actions: payload.actions || [],           // e.g. [{action:'open', title:'Open'}]
    requireInteraction: !!payload.requireInteraction
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    // Focus an open tab if it matches targetUrl; otherwise open a new one
    for (const client of allClients) {
      if ('focus' in client && new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  })());
});

// If the browser drops the subscription, try to re-subscribe
self.addEventListener('pushsubscriptionchange', (event) => {
  const vapidPublicKey = 'BGEEECS6Ec6ZCXRM1SLKuwQELxLowonpogP5LLgTH5-lZ3YkfPh7BDDptLPWTdBaFdCDnusiuuGCNr7TJsItLRg';
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  event.waitUntil((async () => {
    try {
      const reg = await self.registration;
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      // Send newSub back to your backend endpoint to update it
      await fetch('/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(newSub)
      });
    } catch (e) {
      // swallow; you can log to an analytics endpoint if desired
    }
  })());
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
