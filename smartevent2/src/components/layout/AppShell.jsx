import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MapPin, UserCircle, Bell, Menu, X, Ticket, LayoutDashboard, User, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTicket } from '../../lib/TicketContext';
import BottomTabBar from './BottomTabBar';
import BackButton from './BackButton';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/map', label: 'Map', icon: MapPin },
  { path: '/enroll', label: 'Face Pass', icon: UserCircle },
  { path: '/notifications', label: 'Alerts', icon: Bell },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/manage-ticket', label: 'Manage Ticket', icon: ClipboardList },
];

export default function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { ticket, clearTicket } = useTicket();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 text-white" style={{ backgroundColor: '#001E44', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <BackButton />
          <Link to="/" className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/8496877d4_ChatGPT_Image_Mar_28__2026__07_11_17_PM-removebg-preview.png" alt="SmartVenue" className="w-16 h-16 object-contain" />
            <div>
              <span className="text-base font-bold tracking-tight leading-none block">SmartVenue</span>
              <span className="text-[10px] opacity-60 leading-none hidden sm:block">PSU · Beaver Stadium</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-white/70 hover:text-white hover:bg-white/15",
                    location.pathname === item.path && "bg-white/20 text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Ticket chip */}
          {ticket && (
            <button
              onClick={clearTicket}
              className="hidden md:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition-colors text-xs text-white/80"
            >
              <Ticket className="w-3.5 h-3.5 text-accent" />
              <span>Gate {ticket.gate} · {ticket.section}</span>
              <span className="ml-1 text-primary-foreground/40">✕</span>
            </button>
          )}

          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-white/20 pb-3 px-4">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 transition-colors",
                  location.pathname === item.path
                    ? "bg-white/20 text-white"
                    : "text-white/70"
                )}>
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
            {ticket && (
              <button
                onClick={() => { clearTicket(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 w-full text-left text-white/50"
              >
                <Ticket className="w-4 h-4" />
                <span className="text-sm">Scan different ticket</span>
              </button>
            )}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto pb-16 md:pb-0" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabBar />
    </div>
  );
}
