// Client-side helpers for web push subscription management (no server-side storage)
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      return reg;
    } catch (err) {
      console.error('Service worker registration failed', err);
    }
  }
}

export async function subscribeToPush(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push not supported');

  // Note: permission must be requested from a user gesture in the UI.
  // This helper assumes the page has already requested and been granted
  // Notification permission (call Notification.requestPermission() from
  // a click handler before invoking this function).
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Service worker registration failed');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
  const json = sub.toJSON()

  // Try to persist the subscription server-side so we can send pushes later.
  try {
    await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: json })
    })
  } catch (err) {
    // non-fatal: still return the subscription for client-only use
    console.warn('failed to save subscription to server', err)
  }

  return json;
}

export async function subscribeToPushAndReturn(vapidPublicKey) {
  // convenience wrapper for subscribeToPush that returns the raw subscription JSON
  return await subscribeToPush(vapidPublicKey)
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON()
  await sub.unsubscribe();

  // attempt to delete server-side record (best-effort)
  try {
    await fetch('/api/push-subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint })
    })
  } catch (err) {
    console.warn('failed to remove subscription from server', err)
  }
  return true
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
