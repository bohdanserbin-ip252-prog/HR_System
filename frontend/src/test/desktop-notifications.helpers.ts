import { vi } from 'vitest';

let visibilityState = 'visible';
let focusState = true;

export function installStorageMock() {
  const values = new Map();
  const storage = {
    getItem: vi.fn(key => (values.has(key) ? values.get(key) : null)),
    setItem: vi.fn((key, value) => {
      values.set(String(key), String(value));
    }),
    removeItem: vi.fn(key => {
      values.delete(String(key));
    }),
    clear: vi.fn(() => {
      values.clear();
    })
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage
  });

  return storage;
}

export function applyBaseDomSetup() {
  installStorageMock();
  localStorage.clear();
  visibilityState = 'visible';
  focusState = true;
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState
  });
  Object.defineProperty(document, 'hasFocus', {
    configurable: true,
    writable: true,
    value: () => focusState
  });
}

export function setVisibilityState(nextState) {
  visibilityState = nextState;
  document.dispatchEvent(new Event('visibilitychange'));
}

export function setDocumentFocus(nextFocusState) {
  focusState = Boolean(nextFocusState);
  document.dispatchEvent(new Event('visibilitychange'));
}

export function installNotificationMock({ permission = 'granted', requestPermission } = {}) {
  const instances = [];
  const requestPermissionMock =
    requestPermission ||
    vi.fn(async () => {
      NotificationMock.permission = permission;
      return permission;
    });

  function NotificationMock(title, options) {
    const instance = {
      title,
      options,
      close: vi.fn()
    };
    instances.push(instance);
    return instance;
  }

  NotificationMock.permission = permission;
  NotificationMock.requestPermission = vi.fn(async () => {
    const result = await requestPermissionMock();
    NotificationMock.permission = result;
    return result;
  });

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: NotificationMock
  });

  return {
    instances,
    requestPermission: NotificationMock.requestPermission
  };
}

export function cleanupNotificationMock() {
  localStorage.clear();
  delete window.Notification;
}
