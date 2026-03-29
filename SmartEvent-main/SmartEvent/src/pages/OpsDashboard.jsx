import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Users, Clock, Bell, Send, Loader2, Shield, TrendingUp, BarChart3, Activity, AlertTriangle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import CrowdFlowGraph from '../components/ops/CrowdFlowGraph';
import { useSimulation } from '../lib/useSimulation';
import { generateAlerts, EVENT_PHASES } from '../lib/simulation';

const STATUS_COLORS = { open: '#22c55e', busy: '#eab308', congested: '#f97316', closed: '#ef4444' };
const STATUS_LABELS = { open: 'Open', busy: 'Busy', congested: 'Congested', closed: 'Closed' };

export default function OpsDashboard() {
  const queryClient = useQueryClient();
  const [alertGate, setAlertGate] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState('general');
  const [activePhase, setActivePhase] = useState('kickoff_rush');
  const [simBaseFill, setSimBaseFill] = useState(0.55);
  const [simEnabled, setSimEnabled] = useState(true);
  const [alertSent, setAlertSent] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
    refetchInterval: 8000,
  });

  const { data: fans = [] } = useQuery({
    queryKey: ['fans'],
    queryFn: () => base44.entities.FanProfile.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 10),
  });

  // Live simulation hook
  const { tick } = useSimulation({
    gates,
    enabled: simEnabled,
    phaseId: activePhase,
    baseFillPct: simBaseFill,
  });

  const updateGateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Gate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gates'] }),
  });

  const sendAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setAlertMsg('');
      setAlertGate('');
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 3000);
    },
  });

  // Accumulate throughput history for sparkline
  useEffect(() => {
    if (gates.length === 0) return;
    const total = gates.reduce((s, g) => s + (g.current_count || 0), 0);
    setHistoryData(prev => {
      const updated = [...prev, { time: tick, total }];
      return updated.slice(-12); // keep last 12 ticks
    });
  }, [tick]);

  const totalInQueue = gates.reduce((s, g) => s + (g.current_count || 0), 0);
  const avgWait = gates.length ? (gates.reduce((s, g) => s + (g.wait_minutes || 0), 0) / gates.length).toFixed(1) : 0;
  const congestedCount = gates.filter(g => g.status === 'congested').length;
  const openCount = gates.filter(g => g.status === 'open').length;

  const chartData = gates.map(g => ({
    name: `Gate ${g.code}`,
    wait: g.wait_minutes || 0,
    queue: g.current_count || 0,
    status: g.status,
    fillPct: g.capacity ? Math.round(((g.current_count || 0) / g.capacity) * 100) : 0,
  }));

  const smartAlerts = generateAlerts(gates);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-[#001E44] text-white px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ops Control Center</h1>
              <p className="text-white/50 text-xs">Beaver Stadium · Live Gate Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/60">Live</span>
          </div>
        </div>

        {/* Phase selector */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {EVENT_PHASES.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activePhase === p.id
                  ? 'bg-[#E07B39] text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.label}
              <span className="ml-1 opacity-60">{p.timeLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Smart alerts banner */}
        <AnimatePresence>
          {smartAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Active Alerts ({smartAlerts.length})</p>
                </div>
                {smartAlerts.map((a, i) => (
                  <p key={i} className="text-xs text-orange-700 pl-6">{a.message}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total In Queue', value: totalInQueue.toLocaleString(), icon: Users, color: 'text-[#001E44]', sub: 'across all gates' },
            { label: 'Avg Wait', value: `${avgWait}m`, icon: Clock, color: 'text-[#E07B39]', sub: 'estimated' },
            { label: 'Congested Gates', value: congestedCount, icon: AlertTriangle, color: 'text-red-500', sub: `${openCount} open` },
            { label: 'Total Fans', value: fans.length, icon: TrendingUp, color: 'text-green-500', sub: 'enrolled' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sim controls */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E07B39]" />
                <p className="text-sm font-semibold">Live Simulation</p>
                <Badge variant="outline" className="text-[10px]">Updates every 8s</Badge>
              </div>
              <button
                onClick={() => setSimEnabled(v => !v)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${simEnabled ? 'bg-green-500/10 text-green-700' : 'bg-muted text-muted-foreground'}`}
              >
                {simEnabled ? '● Running' : '○ Paused'}
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Crowd Fill Level</span>
                <span className="font-semibold">{Math.round(simBaseFill * 100)}%</span>
              </div>
              <Slider
                value={[simBaseFill]}
                min={0.1}
                max={0.95}
                step={0.05}
                onValueChange={([v]) => setSimBaseFill(v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Queue throughput sparkline */}
        {historyData.length > 2 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#E07B39]" />
                Queue Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={historyData}>
                  <Line type="monotone" dataKey="total" stroke="#E07B39" strokeWidth={2} dot={false} />
                  <Tooltip formatter={(v) => [v, 'In Queue']} labelFormatter={() => ''} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gate wait time bar chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Gate Wait Times (min)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => [name === 'wait' ? `${v} min` : v, name === 'wait' ? 'Wait' : 'Queue']} />
                <Bar dataKey="wait" radius={[4, 4, 0, 0]} name="wait">
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Crowd flow graph */}
        <CrowdFlowGraph gates={gates} />

        {/* Distribution comparison */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Queue Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {chartData.map(g => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="text-xs font-semibold w-14 text-foreground">{g.name}</span>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500 flex items-center pl-2"
                    style={{ width: `${Math.max(g.fillPct, 3)}%`, backgroundColor: STATUS_COLORS[g.status] || '#94a3b8' }}
                  >
                    {g.fillPct > 15 && <span className="text-[9px] text-white font-bold">{g.fillPct}%</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] w-16 justify-center">{STATUS_LABELS[g.status] || 'Open'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gate manual override controls */}
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E07B39]" /> Manual Gate Overrides
          </h2>
          <div className="space-y-3">
            {gates.map(gate => {
              const loadPct = gate.capacity ? Math.round(((gate.current_count || 0) / gate.capacity) * 100) : 0;
              return (
                <Card key={gate.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-sm">{gate.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{gate.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[gate.status] || '#94a3b8' }} />
                        <span className="text-xs text-muted-foreground">{gate.wait_minutes || 0}m wait · {gate.current_count || 0} in queue</span>
                      </div>
                    </div>
                    {/* Load bar */}
                    <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: STATUS_COLORS[gate.status] || '#94a3b8' }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wide">Override Status</label>
                        <Select
                          value={gate.status}
                          onValueChange={(val) => updateGateMutation.mutate({ id: gate.id, data: { status: val } })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="congested">Congested</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wide">Queue: {gate.current_count || 0}</label>
                        <Slider
                          value={[gate.current_count || 0]}
                          max={gate.capacity || 5000}
                          step={100}
                          onValueCommit={(val) => {
                            const count = val[0];
                            const cap = gate.capacity || 5000;
                            const ratio = count / cap;
                            const status = ratio > 0.85 ? 'congested' : ratio > 0.62 ? 'busy' : 'open';
                            const throughputPerMin = cap / 60;
                            const wait = Math.max(0, Math.round(count / throughputPerMin));
                            updateGateMutation.mutate({ id: gate.id, data: { current_count: count, status, wait_minutes: wait } });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Broadcast alert */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" /> Broadcast Push Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={alertGate} onValueChange={setAlertGate}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select gate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fans</SelectItem>
                  {gates.map(g => <SelectItem key={g.id} value={g.code}>Gate {g.code}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={alertType} onValueChange={setAlertType}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate_change">Gate Change</SelectItem>
                  <SelectItem value="congestion_alert">Congestion</SelectItem>
                  <SelectItem value="route_update">Route Update</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="e.g. Use Gate B to avoid congestion at Gate A"
              value={alertMsg}
              onChange={e => setAlertMsg(e.target.value)}
              className="text-sm"
            />
            {/* Quick templates */}
            <div className="flex flex-wrap gap-2">
              {[
                `Use Gate B — Gate A congested`,
                `Gate E now open — 2 min wait`,
                `Halftime: Restrooms at C & D`,
              ].map(t => (
                <button key={t} onClick={() => setAlertMsg(t)} className="text-[10px] bg-muted hover:bg-muted/80 rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
                  {t}
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-[#001E44] hover:bg-[#001E44]/90"
              disabled={!alertMsg || sendAlertMutation.isPending}
              onClick={() => sendAlertMutation.mutate({
                title: alertGate && alertGate !== 'all' ? `Gate ${alertGate} Alert` : 'Stadium Alert',
                message: alertMsg,
                type: alertType,
                gate_code: alertGate !== 'all' ? alertGate : '',
              })}
            >
              {sendAlertMutation.isPending
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Send className="w-4 h-4 mr-1" />}
              Broadcast to Fans
            </Button>
            <AnimatePresence>
              {alertSent && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Alert broadcasted to fans
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Recent broadcasts */}
        {notifications.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wide">Recent Broadcasts</h3>
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/40">
                  <Bell className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-muted-foreground">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}