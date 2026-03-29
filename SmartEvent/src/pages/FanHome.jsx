import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bell, ChevronRight, Ticket, Navigation, Clock, AlertTriangle, Zap, Shield, Car, Footprints, TrendingDown, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTicket } from '../lib/TicketContext';
import { recommendGate, generateAlerts } from '../lib/simulation';

const STATUS_CONFIG = {
  open:      { label: 'Open',      dot: 'bg-green-500',  badge: 'bg-green-500 text-white border-green-600' },
  busy:      { label: 'Busy',      dot: 'bg-yellow-500', badge: 'bg-yellow-500 text-white border-yellow-600' },
  congested: { label: 'Congested', dot: 'bg-orange-500', badge: 'bg-orange-500 text-white border-orange-600' },
  closed:    { label: 'Closed',    dot: 'bg-red-500',    badge: 'bg-red-500 text-white border-red-600' },
};

function GateRow({ gate, isRecommended }) {
  const cfg = STATUS_CONFIG[gate.status] || STATUS_CONFIG.open;
  const fillPct = gate.capacity ? Math.min(((gate.current_count || 0) / gate.capacity) * 100, 100) : 0;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isRecommended ? 'border-[#E07B39]/40 bg-[#E07B39]/5 ring-1 ring-[#E07B39]/20' : 'border-border bg-card'}`}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${gate.status === 'congested' ? 'animate-pulse' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-foreground">{gate.name}</p>
          {isRecommended && <Badge className="text-[9px] bg-[#E07B39]/20 text-[#E07B39] border-[#E07B39]/30 px-1.5">Recommended</Badge>}
        </div>
        <p className="text-[10px] text-muted-foreground">{gate.description}</p>
        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full">
          <div className={`h-full rounded-full transition-all duration-700 ${gate.status === 'congested' ? 'bg-orange-500' : gate.status === 'busy' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${fillPct}%` }} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base font-bold">{gate.wait_minutes || 0}<span className="text-xs font-normal text-muted-foreground">m</span></p>
        <p className="text-[10px] text-muted-foreground">{(gate.current_count || 0).toLocaleString()} in queue</p>
      </div>
    </div>
  );
}

export default function FanHome() {
  const { ticket } = useTicket();
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [fanProfile, setFanProfile] = useState(null);

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
    refetchInterval: 8000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => base44.entities.Notification.list('-created_date', 5),
    refetchInterval: 15000,
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) return;
      base44.entities.FanProfile.filter({ email: user.email }).then(profiles => {
        if (profiles?.[0]) setFanProfile(profiles[0]);
      });
    }).catch(() => {});
  }, []);

  const autoAlerts = generateAlerts(gates).filter(a => !dismissedAlerts.includes(a.title));
  const recommendation = recommendGate(gates, ticket?.section);
  const assignedGate = recommendation?.gate;
  const unreadCount = notifications.filter(n => !n.read).length + autoAlerts.length;

  const open = [...gates].filter(g => g.status !== 'closed');
  const sorted = [...open].sort((a, b) => (a.wait_minutes || 0) - (b.wait_minutes || 0));
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  const timeSaved = fastest && slowest ? (slowest.wait_minutes || 0) - (fastest.wait_minutes || 0) : 0;

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div className="relative h-60 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&q=80" alt="Beaver Stadium" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001E44] via-[#001E44]/55 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs font-medium">Live · Game Day</span>
        </div>
        <div className="absolute top-4 right-4">
          <Link to="/enroll">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${fanProfile?.verification_status === 'verified' ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-[#E07B39]/20 text-[#E07B39] border border-[#E07B39]/40'}`}>
              <Shield className="w-3 h-3" />
              {fanProfile?.verification_status === 'verified' ? 'Face Pass ✓' : 'Set Up Face Pass'}
            </div>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">SmartVenue PSU</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {ticket ? `Welcome, ${ticket.holderName.split(' ')[0]}!` : 'Tonight at Beaver Stadium'}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">
            {ticket ? `${ticket.eventName} · ${ticket.date}` : 'Penn State · Capacity 106,572'}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-4">

        {/* Live push alerts */}
        <AnimatePresence>
          {autoAlerts.slice(0, 2).map(alert => (
            <motion.div key={alert.title} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <div className={`flex items-start gap-3 rounded-xl p-3 border ${alert.type === 'congestion_alert' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${alert.type === 'congestion_alert' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-700 mt-0.5">{alert.message}</p>
                </div>
                <button onClick={() => setDismissedAlerts(prev => [...prev, alert.title])} className="text-muted-foreground text-xs ml-1 hover:text-foreground">✕</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Ticket card */}
        {ticket && (
          <div className="bg-[#001E44] text-white rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07B39]/20 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-[#E07B39]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Your Ticket</p>
              <p className="font-bold text-sm">{ticket.section} · Row {ticket.row} · Seat {ticket.seat}</p>
              <p className="text-white/40 text-[10px]">{ticket.parking && `Parking: ${ticket.parking}`}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white/50 text-[10px] uppercase">Ticket Gate</p>
              <p className="text-2xl font-bold text-[#E07B39]">{ticket.gate}</p>
            </div>
          </div>
        )}

        {/* Smart recommendation */}
        {assignedGate && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl overflow-hidden border border-[#001E44]/10 shadow-md">
              <div className="bg-[#001E44] px-4 py-2.5 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#E07B39]" />
                <p className="text-white text-xs font-semibold">SmartVenue Recommendation</p>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/50 text-[10px]">live</span>
                </div>
              </div>
              <div className="bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{recommendation?.reason}</p>
                  <p className="text-3xl font-bold text-[#001E44] mt-0.5">{assignedGate.name}</p>
                  <p className="text-xs text-muted-foreground">{assignedGate.description}</p>
                  {ticket?.parking && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Car className="w-3 h-3" />
                      <span>{ticket.parking}</span>
                      <Footprints className="w-3 h-3 ml-1" />
                      <span>~{assignedGate.nearest_parking === ticket.parking ? '5 min walk' : '8 min walk'}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-[#001E44]">{assignedGate.wait_minutes || 0}</p>
                  <p className="text-xs text-muted-foreground">min wait</p>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${STATUS_CONFIG[assignedGate.status]?.badge || ''}`}>
                    {STATUS_CONFIG[assignedGate.status]?.label}
                  </Badge>
                </div>
              </div>
              <div className="bg-[#001E44]/5 px-4 py-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{(assignedGate.current_count || 0).toLocaleString()} in queue now</p>
                <Link to="/map" className="flex items-center gap-1 text-[#E07B39] text-xs font-semibold hover:underline">
                  <Navigation className="w-3 h-3" /> Get Directions
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Time savings insight */}
        {timeSaved >= 3 && fastest && slowest && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">Save {timeSaved} min with SmartVenue</p>
              <p className="text-xs text-green-700">{fastest.name} is {timeSaved} min faster than {slowest.name} right now</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: '/map', icon: MapPin, label: 'Map', color: 'bg-blue-500/10 text-blue-600' },
            { to: '/notifications', icon: Bell, label: 'Alerts', color: 'bg-orange-500/10 text-orange-600', badge: unreadCount },
            { to: '/enroll', icon: UserCheck, label: 'Face Pass', color: 'bg-green-500/10 text-green-600' },
            { to: '/ops', icon: Shield, label: 'Ops', color: 'bg-purple-500/10 text-purple-600' },
          ].map(({ to, icon: Ic, label, color, badge }) => (
            <Link key={to} to={to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/50 h-full">
                <CardContent className="p-3 flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center relative`}>
                    <Ic className="w-5 h-5" />
                    {badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>}
                  </div>
                  <span className="text-xs font-medium leading-tight">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Live gate status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Live Gate Status</h2>
              <div className="flex items-center gap-1 bg-green-500/10 rounded-full px-2 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-green-700 font-medium">Auto-updating</span>
              </div>
            </div>
            <Link to="/map" className="text-sm text-[#E07B39] font-medium flex items-center gap-1">Map <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="space-y-2">
            {gates.length === 0
              ? [...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
              : gates.map(gate => (
                <GateRow key={gate.id} gate={gate} isRecommended={assignedGate?.id === gate.id} />
              ))
            }
          </div>
        </div>

        {/* Parking → Gate walkpath */}
        {ticket?.parking && (
          <div className="bg-[#001E44] border border-[#001E44] rounded-2xl p-4">
            <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">Your Route</p>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Car className="w-4 h-4 text-blue-600" />
                </div>
                <div className="w-0.5 h-8 bg-dashed border-l-2 border-dashed border-[#001E44]/20" />
                <div className="w-8 h-8 rounded-full bg-[#E07B39]/20 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-[#E07B39]" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{ticket.parking}</p>
                  <p className="text-xs text-white/50">Your parking lot</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Gate {ticket.gate} → Section {ticket.section}</p>
                  <p className="text-xs text-white/50">~5 min walk · Row {ticket.row} · Seat {ticket.seat}</p>
                </div>
              </div>
              <Link to="/map" className="ml-auto">
                <Button size="sm" className="bg-[#001E44] hover:bg-[#001E44]/90 text-xs">
                  <Navigation className="w-3 h-3 mr-1" /> Navigate
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Recent alerts */}
        {notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Push Alerts</h2>
              <Link to="/notifications" className="text-sm text-[#E07B39] font-medium">View All</Link>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 3).map(n => (
                <Card key={n.id} className={`border-border/50 ${!n.read ? 'border-l-4 border-l-[#E07B39]' : ''}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#E07B39] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#E07B39] flex-shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}