import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTicket } from '../lib/TicketContext';
import { generateAlerts } from '../lib/simulation';
import NotificationCard from '../components/notifications/NotificationCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Loader2, Zap, AlertTriangle, Navigation, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALERT_TYPE_ICONS = {
  congestion_alert: { icon: AlertTriangle, color: 'bg-orange-500', label: 'Congestion' },
  route_update:     { icon: Navigation,    color: 'bg-blue-500',   label: 'Route Update' },
  gate_change:      { icon: Zap,           color: 'bg-purple-500', label: 'Gate Change' },
  general:          { icon: Info,          color: 'bg-gray-500',   label: 'General' },
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { ticket } = useTicket();
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [dismissedLive, setDismissedLive] = useState([]);

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
    refetchInterval: 10000,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 50),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (gates.length > 0) {
      const alerts = generateAlerts(gates).filter(a => !dismissedLive.includes(a.title));
      setLiveAlerts(alerts);
    }
  }, [gates]);

  const markReadMutation = useMutation({
    mutationFn: (notif) => base44.entities.Notification.update(notif.id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalAlerts = unreadCount + liveAlerts.length;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-[#001E44] px-4 pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Push Alerts</h1>
            <p className="text-white/50 text-sm mt-0.5">Live crowd & gate notifications</p>
          </div>
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <div className="w-8 h-8 rounded-full bg-[#E07B39] flex items-center justify-center">
                <span className="text-white text-sm font-bold">{totalAlerts > 9 ? '9+' : totalAlerts}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/50 text-xs">Live</span>
            </div>
          </div>
        </div>

        {/* Category summary pills */}
        {gates.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {[
              { label: 'All', count: totalAlerts, active: true },
              { label: 'Congestion', count: liveAlerts.filter(a => a.type === 'congestion_alert').length },
              { label: 'Route Updates', count: notifications.filter(n => n.type === 'route_update' && !n.read).length },
              { label: 'Gate Changes', count: notifications.filter(n => n.type === 'gate_change' && !n.read).length },
            ].map(cat => (
              <div key={cat.label} className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cat.active ? 'bg-white text-[#001E44]' : 'bg-white/10 text-white/70'}`}>
                {cat.label}
                {cat.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cat.active ? 'bg-[#E07B39] text-white' : 'bg-white/20 text-white'}`}>{cat.count}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Live SmartVenue alerts */}
        <AnimatePresence>
          {liveAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#E07B39]" />
                  <p className="text-sm font-bold">SmartVenue Live Alerts</p>
                  <Badge className="bg-[#E07B39]/20 text-[#E07B39] text-[10px]">Auto-generated</Badge>
                </div>
                {liveAlerts.map((alert, i) => {
                  const cfg = ALERT_TYPE_ICONS[alert.type] || ALERT_TYPE_ICONS.general;
                  const IconComp = cfg.icon;
                  return (
                    <motion.div
                      key={alert.title}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className={`flex items-start gap-3 rounded-xl p-3.5 border ${alert.type === 'congestion_alert' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className={`w-8 h-8 rounded-full ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComp className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                            <Badge className={`text-[9px] text-white ${cfg.color}`}>{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-gray-700">{alert.message}</p>
                          {ticket?.gate === alert.gate_code && (
                            <p className="text-xs font-semibold text-orange-600 mt-1">⚠ This affects your assigned gate</p>
                          )}
                        </div>
                        <button onClick={() => setDismissedLive(prev => [...prev, alert.title])} className="text-muted-foreground text-xs hover:text-foreground mt-0.5">✕</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ops broadcast notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <p className="text-sm font-bold">Operator Broadcasts</p>
              {unreadCount > 0 && <Badge className="bg-[#001E44] text-white text-[10px]">{unreadCount} new</Badge>}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border border-dashed rounded-xl">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No broadcasts yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Operators send alerts from the Ops Dashboard</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <NotificationCard key={n.id} notification={n} onMarkRead={() => markReadMutation.mutate(n)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}