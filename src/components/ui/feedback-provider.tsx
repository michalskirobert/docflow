"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type Kind = "success" | "error" | "warning" | "info";
type Toast = { id: number; kind: Kind; message: string };
type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: "default" | "danger";
};
type Feedback = {
  notify: (message: string, kind?: Kind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
const Context = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const notify = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((v) => [...v, { id, kind, message }]);
    window.setTimeout(
      () => setToasts((v) => v.filter((x) => x.id !== id)),
      5000,
    );
  }, []);
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    [],
  );
  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };
  const api = useMemo(() => ({ notify, confirm }), [notify, confirm]);
  const Icon = ({ kind }: { kind: Kind }) =>
    kind === "success" ? (
      <CheckCircle2 />
    ) : kind === "error" ? (
      <XCircle />
    ) : kind === "warning" ? (
      <AlertTriangle />
    ) : (
      <Info />
    );
  return (
    <Context.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <Icon kind={toast.kind} />
            <span>{toast.message}</span>
            <button
              onClick={() =>
                setToasts((v) => v.filter((x) => x.id !== toast.id))
              }
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="alertdialog" aria-modal="true">
            <h3>{dialog.title}</h3>
            <p>{dialog.message}</p>
            <div className="dialog-actions">
              <button className="btn secondary" onClick={() => close(false)}>
                {dialog.cancelLabel ?? "Cancel"}
              </button>
              <button
                className={`btn ${dialog.kind === "danger" ? "danger" : ""}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}
export function useFeedback() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useFeedback must be used inside FeedbackProvider");
  return value;
}
