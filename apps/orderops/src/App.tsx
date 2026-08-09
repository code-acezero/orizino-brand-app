import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Orders } from "@/pages/Orders";
import { OfflineOrders } from "@/pages/OfflineOrders";
import { Scanner } from "@/pages/Scanner";

// HashRouter, deliberately: it needs zero server-side rewrite rules to work,
// which matters both for a plain static host and — especially — once this
// gets wrapped in Capacitor, where there's no server to configure SPA
// fallbacks on at all.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading, hasSalesAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Gate>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/offline" element={<OfflineOrders />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </Gate>
        </HashRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
