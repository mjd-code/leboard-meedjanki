import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DevAuthBanner } from "@/features/auth/DevAuthBanner";
import { EventDebugPanel } from "@/features/vault-dashboard/debug/EventDebugPanel";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { Suspense, lazy } from "react";


const queryClient = new QueryClient();

// Lazy load pages to catch import errors
const Landing = lazy(() => import("./pages/Landing").catch(err => {
  console.error("Failed to load Landing:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load Landing: {err.message}</div> };
}));

const Index = lazy(() => import("./pages/Index").catch(err => {
  console.error("Failed to load Index:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load Index: {err.message}</div> };
}));

const VaultDashboard = lazy(() => import("./pages/VaultDashboard").catch(err => {
  console.error("Failed to load VaultDashboard:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load VaultDashboard: {err.message}</div> };
}));

const Install = lazy(() => import("./pages/Install").catch(err => {
  console.error("Failed to load Install:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load Install: {err.message}</div> };
}));

const Auth = lazy(() => import("./pages/Auth").catch(err => {
  console.error("Failed to load Auth:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load Auth: {err.message}</div> };
}));

const Profile = lazy(() => import("./pages/Profile").catch(err => {
  console.error("Failed to load Profile:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load Profile: {err.message}</div> };
}));

const NotFound = lazy(() => import("./pages/NotFound").catch(err => {
  console.error("Failed to load NotFound:", err);
  return { default: () => <div className="p-8 text-destructive">Failed to load NotFound: {err.message}</div> };
}));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <EventDebugPanel />
        <CommandPalette />
        <BrowserRouter>
          <AuthProvider>
            <DevAuthBanner />
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
                {/* Public landing page */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                
                
                {/* Protected routes */}
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/vaults" element={<ProtectedRoute><VaultDashboard /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;