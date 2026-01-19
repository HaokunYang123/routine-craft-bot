import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import People from "./pages/People";
import Tasks from "./pages/Tasks";
import Assistant from "./pages/Assistant";
import Progress from "./pages/Progress";
import GroupDetail from "./pages/GroupDetail";
import StudentLayout from "./pages/student/StudentLayout";
import StudentCalendar from "./pages/student/StudentCalendar";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentSettings from "./pages/student/StudentSettings";
import StudentPrivacy from "./pages/student/StudentPrivacy";
import StudentHelp from "./pages/student/StudentHelp";
import WibblePlanner from "./pages/WibblePlanner";
import StickerBook from "./pages/student/StickerBook";
import CoachDashboard from "./pages/CoachDashboard";
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
            <Route index element={<Dashboard />} />
            <Route path="people" element={<People />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="progress" element={<Progress />} />
            <Route path="group/:groupId" element={<GroupDetail />} />
          </Route>
          {/* Student PWA View */}
          <Route path="/app" element={<StudentLayout />}>
            <Route index element={<WibblePlanner />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="stickers" element={<StickerBook />} />
            <Route path="settings" element={<StudentSettings />} />
            <Route path="privacy" element={<StudentPrivacy />} />
            <Route path="help" element={<StudentHelp />} />
          </Route>
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/ui" element={<PolygonShowcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

