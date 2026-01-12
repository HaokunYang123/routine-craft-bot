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
import StudentLayout from "./pages/student/StudentLayout";
import StudentCalendar from "./pages/student/StudentCalendar";
import WibblePlanner from "./pages/WibblePlanner";
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
          {/* Teacher/Coach Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="people" element={<People />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="progress" element={<Progress />} />
          </Route>
          {/* Student PWA View */}
          <Route path="/app" element={<StudentLayout />}>
            <Route index element={<WibblePlanner />} />
            <Route path="calendar" element={<StudentCalendar />} />
          </Route>
          <Route path="/ui" element={<PolygonShowcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
