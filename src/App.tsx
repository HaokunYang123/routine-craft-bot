import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Index />} />
          <Route path="/login/coach" element={<Index />} />
          <Route path="/login/student" element={<Index />} />
          {/* Teacher/Coach Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
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
          <Route path="/assignerDashBoard" element={<DashboardLayout />}>
            <Route index element={<AssignerDashboard />} />
          </Route>
          {/* Student PWA View */}
          <Route path="/app" element={<StudentLayout />}>
            <Route index element={<StudentHome />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="privacy" element={<StudentPrivacy />} />
            <Route path="help" element={<StudentHelp />} />
          </Route>
          {/* Assignee Dashboard Route */}
          <Route path="/assigneeDashBoard" element={<StudentLayout />}>
            <Route index element={<AssigneeDashboard />} />
          </Route>
          <Route path="/ui" element={<PolygonShowcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

