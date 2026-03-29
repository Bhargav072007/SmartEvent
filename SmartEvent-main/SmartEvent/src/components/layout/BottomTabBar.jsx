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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-white/10 pb-safe flex">
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 min-w-0">
            <Icon className={cn('w-4 h-4', active ? 'text-accent' : 'text-primary-foreground/50')} />
            <span className={cn('text-[8px] font-semibold', active ? 'text-accent' : 'text-primary-foreground/50')}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}