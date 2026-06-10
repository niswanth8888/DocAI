import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import UploadKnowledge from './pages/UploadKnowledge';
import AskAgent from './pages/AskAgent';
import GeneratedFAQs from './pages/GeneratedFAQs';
import TaxonomyTags from './pages/TaxonomyTags';
import ReviewQueue from './pages/ReviewQueue';
import SystemLogs from './pages/SystemLogs';
import KnowledgeQuality from './pages/KnowledgeQuality';

// Enterprise pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import ProfileSettings from './pages/ProfileSettings';
import SearchHistory from './pages/SearchHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminSearchAnalytics from './pages/AdminSearchAnalytics';
import AdminDownloadAnalytics from './pages/AdminDownloadAnalytics';
import AdminSettings from './pages/AdminSettings';

import { getHealth } from './api/client';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const health = await getHealth();
      setIsOnline(health.status === 'healthy');
    } catch {
      setIsOnline(false);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Heartbeat check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-[#050505] text-slate-500 items-center justify-center font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-slate-700 border-t-white animate-spin" />
          <span>Restoring enterprise workspace session...</span>
        </div>
      </div>
    );
  }

  // Check if we are on a public auth screen
  const isAuthPage = ['/login', '/signup', '/admin/login'].includes(location.pathname);

  if (!user && !isAuthPage) {
    // Redirect unauthenticated traffic to user login
    return <Navigate to="/login" replace />;
  }

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Helper guard for admin-only pages
  const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <div className="flex h-screen w-screen bg-[#050505] overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content display panels */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0d0d0d] relative">
        <Topbar
          isOnline={isOnline}
          onRefreshHealth={checkHealth}
          checkingHealth={checkingHealth}
        />

        {/* Scrollable page canvas */}
        <main className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
          <Routes>
            {/* Employee routes */}
            <Route path="/" element={role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Dashboard isOnline={isOnline} />} />
            <Route path="/ask" element={<AskAgent />} />
            <Route path="/upload" element={<UploadKnowledge />} />
            <Route path="/faqs" element={<GeneratedFAQs />} />
            <Route path="/tags" element={<TaxonomyTags />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/history" element={<SearchHistory />} />

            {/* Admin-only routes */}
            <Route path="/reviews" element={<AdminGuard><ReviewQueue /></AdminGuard>} />
            <Route path="/quality" element={<AdminGuard><KnowledgeQuality /></AdminGuard>} />
            <Route path="/logs" element={<AdminGuard><SystemLogs /></AdminGuard>} />
            <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/users" element={<AdminGuard><AdminUserManagement /></AdminGuard>} />
            <Route path="/admin/searches" element={<AdminGuard><AdminSearchAnalytics /></AdminGuard>} />
            <Route path="/admin/downloads" element={<AdminGuard><AdminDownloadAnalytics /></AdminGuard>} />
            <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to={role === 'admin' ? '/admin/dashboard' : '/'} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
