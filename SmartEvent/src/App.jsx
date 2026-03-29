import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TicketProvider, useTicket } from './lib/TicketContext';

import AppShell from './components/layout/AppShell';
import FanHome from './pages/FanHome';
import StadiumMap from './pages/StadiumMap';
import Enrollment from './pages/Enrollment';
import Notifications from './pages/Notifications';
import OpsDashboard from './pages/OpsDashboard';
import TicketScan from './pages/TicketScan';
import SmartGate from './pages/SmartGate';
import EventSetup from './pages/EventSetup';
import Profile from './pages/Profile';
import ManageTicket from './pages/ManageTicket';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { ticket, saveTicket } = useTicket();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#041E42]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-[#E07B39] rounded-full animate-spin"></div>
          <span className="text-sm text-white/60 font-medium">Loading SmartEvent…</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // Gate: show ticket scan if no ticket yet
  if (!ticket) {
    return <TicketScan onTicketScanned={saveTicket} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<FanHome />} />
        <Route path="/map" element={<StadiumMap />} />
        <Route path="/enroll" element={<Enrollment />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/ops" element={<OpsDashboard />} />
        <Route path="/gate" element={<SmartGate />} />
        <Route path="/setup" element={<EventSetup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/manage-ticket" element={<ManageTicket />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TicketProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </TicketProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;