import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { handleError } from "@/lib/error";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./pages/DashboardLayout";
import CoachDashboard from "./pages/CoachDashboard";
import People from "./pages/People";
import Tasks from "./pages/Tasks";
import Assistant from "./pages/Assistant";
import Progress from "./pages/Progress";
import GroupDetail from "./pages/GroupDetail";
import Templates from "./pages/Templates";
import CoachCalendar from "./pages/CoachCalendar";
import CoachSettings from "./pages/CoachSettings";
import RecurringSchedules from "./pages/RecurringSchedules";
import AssignerDashboard from "./pages/AssignerDashboard";
import StudentLayout from "./pages/student/StudentLayout";
import StudentCalendar from "./pages/student/StudentCalendar";
import StudentHome from "./pages/student/StudentHome";
import StudentSettings from "./pages/student/StudentSettings";
import StudentPrivacy from "./pages/student/StudentPrivacy";
import StudentHelp from "./pages/student/StudentHelp";
import AssigneeDashboard from "./pages/AssigneeDashboard";
import PolygonShowcase from "./pages/PolygonShowcase";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handler - prevents duplicate toasts when multiple components
      // use the same failing query (see PITFALLS.md M2)
      handleError(error, {
        component: String(query.queryKey[0]),
        action: 'fetch',
        // Don't show retry in global handler - let individual components decide
        silent: false,
      });
    },
  }),
  defaultOptions: {
    queries: {
      // Data freshness: consider data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache garbage collection: keep unused data for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Refetch behavior
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Retry logic: don't retry auth errors
      retry: (failureCount, error) => {
        // Don't retry on auth errors (401, 403)
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (
            msg.includes('401') ||
            msg.includes('403') ||
            msg.includes('unauthorized') ||
            msg.includes('forbidden')
          ) {
            return false;
          }
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations don't need global error handler - handled per-mutation
      // (prevents double toasts when mutation has its own onError)
    },
  },
});

/**
 * Handles session expiry detection and modal display.
 * Must be inside Router context to use hooks.
 */
function SessionExpiredHandler() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show modal on auth pages (already at login)
  const isAuthPage = location.pathname === '/' || location.pathname.startsWith('/login');

  const handleReLogin = () => {
    clearSessionExpired();
    navigate('/login');
  };

  return (
    <SessionExpiredModal
      open={sessionExpired && !isAuthPage}
      onReLogin={handleReLogin}
    />
  );
}

const App = () => (
  <BrowserRouter>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <SessionExpiredHandler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Index />} />
            <Route path="/login/coach" element={<Index />} />
            <Route path="/login/student" element={<Index />} />
            {/* OAuth Callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Teacher/Coach Dashboard */}
            <Route
              path="/dashboard"
              element={
                <RouteErrorBoundary>
                  <DashboardLayout />
                </RouteErrorBoundary>
              }
            >
              <Route index element={<CoachDashboard />} />
              <Route path="calendar" element={<CoachCalendar />} />
              <Route path="people" element={<People />} />
              <Route path="templates" element={<Templates />} />
              <Route path="recurring" element={<RecurringSchedules />} />
              <Route path="settings" element={<CoachSettings />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="progress" element={<Progress />} />
              <Route path="group/:groupId" element={<GroupDetail />} />
            </Route>
            {/* Assigner Dashboard Route */}
            <Route
              path="/assigner-dashboard"
              element={
                <RouteErrorBoundary>
                  <DashboardLayout />
                </RouteErrorBoundary>
              }
            >
              <Route index element={<AssignerDashboard />} />
            </Route>
            {/* Student PWA View */}
            <Route
              path="/app"
              element={
                <RouteErrorBoundary>
                  <StudentLayout />
                </RouteErrorBoundary>
              }
            >
              <Route index element={<StudentHome />} />
              <Route path="calendar" element={<StudentCalendar />} />
              <Route path="settings" element={<StudentSettings />} />
              <Route path="privacy" element={<StudentPrivacy />} />
              <Route path="help" element={<StudentHelp />} />
            </Route>
            {/* Assignee Dashboard Route */}
            <Route
              path="/assignee-dashboard"
              element={
                <RouteErrorBoundary>
                  <StudentLayout />
                </RouteErrorBoundary>
              }
            >
              <Route index element={<AssigneeDashboard />} />
            </Route>
            <Route path="/ui" element={<PolygonShowcase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </BrowserRouter>
);

export default App;
