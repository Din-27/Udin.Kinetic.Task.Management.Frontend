"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, ShieldAlert } from "lucide-react";

export type AlertVariant = "default" | "destructive" | "warning" | "info" | "success";

export interface AlertNotification {
  id: string;
  title: string;
  description?: string;
  variant: AlertVariant;
  duration?: number;
}

interface AlertContextType {
  showAlert: (opts: {
    title: string;
    description?: string;
    variant?: AlertVariant;
    duration?: number;
  }) => void;
  showWarning: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showSuccess: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

let globalShowAlert: ((opts: {
  title: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
}) => void) | null = null;

/**
 * Helper function to trigger a Shadcn UI Alert from anywhere without needing React hooks
 */
export function toastAlert(opts: {
  title: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
}) {
  if (globalShowAlert) {
    globalShowAlert(opts);
  } else {
    console.warn("AlertProvider is not mounted yet:", opts);
  }
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const showAlert = useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 4000,
    }: {
      title: string;
      description?: string;
      variant?: AlertVariant;
      duration?: number;
    }) => {
      const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newAlert: AlertNotification = { id, title, description, variant, duration };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);

      if (duration > 0) {
        setTimeout(() => {
          removeAlert(id);
        }, duration);
      }
    },
    [removeAlert]
  );

  useEffect(() => {
    globalShowAlert = showAlert;
    return () => {
      globalShowAlert = null;
    };
  }, [showAlert]);

  const showWarning = useCallback(
    (title: string, description?: string) => {
      showAlert({ title, description, variant: "warning" });
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, description?: string) => {
      showAlert({ title, description, variant: "destructive" });
    },
    [showAlert]
  );

  const showSuccess = useCallback(
    (title: string, description?: string) => {
      showAlert({ title, description, variant: "success" });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, description?: string) => {
      showAlert({ title, description, variant: "info" });
    },
    [showAlert]
  );

  const renderIcon = (variant: AlertVariant) => {
    switch (variant) {
      case "destructive":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "warning":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-foreground" />;
    }
  };

  return (
    <AlertContext.Provider
      value={{ showAlert, showWarning, showError, showSuccess, showInfo }}
    >
      {children}

      {/* Floating Shadcn UI Alert Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {alerts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto transition-all animate-slide-in-top"
          >
            <Alert
              variant={item.variant}
              className="relative shadow-xl border bg-background/95 backdrop-blur-md pr-9"
            >
              {renderIcon(item.variant)}
              <div>
                <AlertTitle>{item.title}</AlertTitle>
                {item.description && (
                  <AlertDescription>{item.description}</AlertDescription>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAlert(item.id)}
                className="absolute top-2.5 right-2.5 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Tutup Notifikasi"
              >
                <X className="h-3 w-3" />
              </button>
            </Alert>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return ctx;
}
