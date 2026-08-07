export interface ToastItem {
  id: string;
  message: string;
}

let toasts: ToastItem[] = [];
let listeners: ((toasts: ToastItem[]) => void)[] = [];

function emit() {
  listeners.forEach(l => l(toasts));
}

export function subscribeToasts(listener: (toasts: ToastItem[]) => void) {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

export function showError(message: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => dismissToast(id), 6000);
}

// Turns a raw Firestore/JS error into something a non-technical user can
// act on, without losing the detail from the console log next to it.
export function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const detail: string = parsed?.error || raw;
  if (/permission-denied|insufficient permissions/i.test(detail)) {
    return "You don't have permission to do that.";
  }
  if (/network|unavailable|offline/i.test(detail)) {
    return 'Network issue — please check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
