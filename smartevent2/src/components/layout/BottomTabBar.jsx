import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, UserCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { path: '/',              label: 'Home',      icon: LayoutDashboard },
  { path: '/map',           label: 'Map',        icon: MapPin          },
  { path: '/enroll',        label: 'Face Pass',  icon: UserCircle      },
  { path: '/notifications', label: 'Alerts',     icon: Bell            },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-row">
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-w-0 relative">
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white" />}
            <Icon className={cn('w-5 h-5', active ? 'text-white' : 'text-primary-foreground/40')} />
            <span className={cn('text-[9px] font-semibold', active ? 'text-white' : 'text-primary-foreground/40')}>
              {label}
            </span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}