import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { NotificationProvider } from "@/lib/notifications";
import { OrderOpsThemeProvider } from "@/lib/OrderOpsThemeProvider";
import { AppShell } from "@/components/AppShell";
import { DynamicIsland } from "@/components/DynamicIsland";
import { Login } from "@/_pages/Login";
import { Dashboard } from "@/_pages/Dashboard";
import { Orders } from "@/_pages/Orders";
import { WalkInOrders } from "@/_pages/WalkInOrders";
import { StatusScanner } from "@/_pages/StatusScanner";
import { InventoryStudio } from "@/_pages/InventoryStudio";
import { SupportTickets } from "@/_pages/SupportTickets";
import { CourierDispatch } from "@/_pages/CourierDispatch";
import { PrintCenterPage } from "@/_pages/PrintCenterPage";
import { ReturnsCenter } from "@/_pages/ReturnsCenter";
import { useOrderOpsTheme } from "@/lib/theme";
import { lazy, Suspense, useState, useEffect } from "react";

const InstallAppPrompt = lazy(() =>
  import("@/components/InstallAppPrompt").then((m) => ({ default: m.InstallAppPrompt }))
);

function DeferredWidgets() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric: any = (window as any).requestIdleCallback;
    let id: any, t: any;
    if (typeof ric === "function") {
      id = ric(() => setReady(true), { timeout: 3000 });
    } else {
      t = setTimeout(() => setReady(true), 2000);
    }
    return () => {
      if (id && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      if (t) clearTimeout(t);
    };
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <InstallAppPrompt />
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading, hasSalesAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Authenticating…</span>
        </div>
      </div>
    );
  }
  if (!session) return <Login />;
  if (hasSalesAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-xs space-y-2">
          <p className="text-lg font-semibold">No access</p>
          <p className="text-sm text-muted-foreground">
            This account doesn't have Sales section access yet. Ask an admin to grant it from Master Panel → Employees.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  useOrderOpsTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <OrderOpsThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <DynamicIsland />
              <Gate>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/offline" element={<WalkInOrders />} />
                    <Route path="/scanner" element={<StatusScanner />} />
                    <Route path="/stock" element={<InventoryStudio />} />
                    <Route path="/support" element={<SupportTickets />} />
                    <Route path="/dispatch" element={<CourierDispatch />} />
                    <Route path="/labels" element={<PrintCenterPage />} />
                    <Route path="/returns" element={<ReturnsCenter />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppShell>
              </Gate>
              <DeferredWidgets />
            </BrowserRouter>
            <Toaster
              position="top-center"
              theme="dark"
              richColors
              closeButton
              offset={70}
              toastOptions={{
                className: "!bg-zinc-950/95 !border !border-zinc-800 !text-white !backdrop-blur-2xl !rounded-2xl !shadow-2xl !text-xs",
                descriptionClassName: "!text-zinc-400 !text-[11px]",
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </OrderOpsThemeProvider>
    </QueryClientProvider>
  );
}
