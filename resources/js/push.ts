import axios from 'axios';

const VAPID_PUBLIC_KEY = 'BGEEECS6Ec6ZCXRM1SLKuwQELxLowonpogP5LLgTH5-lZ3YkfPh7BDDptLPWTdBaFdCDnusiuuGCNr7TJsItLRg'; // base64url (no padding)

export async function enablePush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[push] No service worker support');
    return null;
  }
  if (!('PushManager' in window)) {
    console.warn('[push] No Push API support');
    return null;
  }

  // Register SW from site root
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  // Wait until it's active to avoid races
  await navigator.serviceWorker.ready;

  // Ask permission (do this on a user gesture: button click)
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    console.warn('[push] Permission not granted');
    return null;
  }

  // Subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send to backend to store (tie to authenticated user or session)
  await axios.post('/push-subscribe', sub, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });

  return sub;
}

export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  // Notify server first so you can delete it there
  try {
    await axios.post('/push-unsubscribe', { endpoint: sub.endpoint }, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
  } catch {}

  await sub.unsubscribe();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
