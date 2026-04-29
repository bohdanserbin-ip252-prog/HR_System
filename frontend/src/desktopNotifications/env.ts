export function hasWindow() {
  return typeof window !== 'undefined';
}

export function hasDocument() {
  return typeof document !== 'undefined';
}

export function isDesktopNotificationSupported() {
  return hasWindow() && typeof window.Notification !== 'undefined';
}
