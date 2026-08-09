export type ToastType = "success" | "error" | "warning" | "info";

export interface AppToast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

let listeners: ((toasts: AppToast[]) => void)[] = [];
let toasts: AppToast[] = [];
let counter = 0;

function addToast(t: Omit<AppToast, "id">, timeoutMs = 4000) {
  const id = String(++counter);
  const item: AppToast = { ...t, id };
  toasts = [item, ...toasts].slice(0, 5);
  listeners.forEach((l) => l([...toasts]));
  if (timeoutMs > 0) setTimeout(() => removeToast(id), timeoutMs);
  return id;
}

/**
 * Show a toast with an Undo action. Returns a promise that resolves to
 * true if the user clicked Undo before `timeoutMs`, false otherwise.
 */
export function toastWithUndo(
  message: string,
  onUndo: () => void,
  opts: { timeoutMs?: number; description?: string } = {}
) {
  const timeoutMs = opts.timeoutMs ?? 5000;
  let undone = false;
  addToast(
    {
      title: message,
      description: opts.description,
      type: "info",
      action: {
        label: "Undo",
        onClick: () => {
          if (undone) return;
          undone = true;
          onUndo();
        },
      },
    },
    timeoutMs
  );
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l([...toasts]));
}

export function subscribe(listener: (toasts: AppToast[]) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// Unified toast API — supports both sonner-style and useToast-style calls
export const toast = Object.assign(
  (opts: string | { title?: string; description?: string; variant?: string }) => {
    if (typeof opts === "string") {
      addToast({ title: opts, type: "success" });
    } else {
      addToast({
        title: opts.title || "",
        description: opts.description,
        type: opts.variant === "destructive" ? "error" : "success",
      });
    }
  },
  {
    success: (msg: string) => addToast({ title: msg, type: "success" }),
    error: (msg: string) => addToast({ title: msg, type: "error" }),
    info: (msg: string) => addToast({ title: msg, type: "info" }),
    warning: (msg: string) => addToast({ title: msg, type: "warning" }),
  }
);
