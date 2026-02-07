import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import FileManager from "@/pages/FileManager";
import UploadCenter from "@/pages/UploadCenter";
import StorageAccounts from "@/pages/StorageAccounts";
import Categories from "@/pages/Categories";
import ApiConfig from "@/pages/ApiConfig";
import Profile from "@/pages/Profile";
import Security from "@/pages/Security";
import ActivityLogs from "@/pages/ActivityLogs";
import HelpDocs from "@/pages/HelpDocs";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/files" element={<FileManager />} />
                <Route path="/upload" element={<UploadCenter />} />
                <Route path="/storage-accounts" element={<StorageAccounts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/api-config" element={<ApiConfig />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/security" element={<Security />} />
                <Route path="/activity" element={<ActivityLogs />} />
                <Route path="/help" element={<HelpDocs />} />
              </Route>
              
              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
