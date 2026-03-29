import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Settings, Users, Zap, CheckCircle2, Loader2, RefreshCw, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GATES, PARKING_LOTS, computeGateState } from '../lib/simulation';

const SURGE_MODES = [
  { id: 'kickoff_rush', label: 'Kickoff Rush', desc: 'Heavy inflow at all gates 60–30 min before game', icon: '🏈' },
  { id: 'halftime', label: 'Halftime Flow', desc: 'Concession surge, internal movement peaks', icon: '⏱️' },
  { id: 'postgame', label: 'Post-Game Exit', desc: 'Mass outflow, all exits under pressure', icon: '🚪' },
  { id: 'student_surge', label: 'Student Surge', desc: 'Gate A overwhelmed by student section', icon: '🎓' },
  { id: 'pregame_early', label: 'Pre-Game Early', desc: 'Light flow, most gates quiet', icon: '☀️' },
];

export default function EventSetup() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [activeSurge, setActiveSurge] = useState('kickoff_rush');
  const [attendance, setAttendance] = useState(85000);
  const [simRunning, setSimRunning] = useState(false);

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
  });

  const { data: parkingLots = [] } = useQuery({
    queryKey: ['parking'],
    queryFn: () => base44.entities.ParkingLot.list(),
  });

  const updateGateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Gate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gates'] }),
  });

  const baseFillPct = attendance / 106572;

  const applySurge = async () => {
    setSimRunning(true);
    const updates = gates.map(gate => {
      const newState = computeGateState(gate.code, baseFillPct, activeSurge);
      if (!newState) return null;
      return updateGateMutation.mutateAsync({ id: gate.id, data: newState });
    }).filter(Boolean);

    await Promise.allSettled(updates);
    setSimRunning(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const resetGates = async () => {
    setSimRunning(true);
    const resets = gates.map(g => updateGateMutation.mutateAsync({
      id: g.id,
      data: { current_count: 0, status: 'open', wait_minutes: 0 }
    }));
    await Promise.allSettled(resets);
    setSimRunning(false);
  };

  // Seed initial gate + parking data
  const seedData = async () => {
    setSimRunning(true);
    const existing = gates.map(g => g.code);
    const toCreate = GATES.filter(g => !existing.includes(g.code));
    
    if (toCreate.length > 0) {
      await Promise.allSettled(toCreate.map(g =>
        base44.entities.Gate.create({
          ...g,
          current_count: 0,
          status: 'open',
          wait_minutes: 0,
        })
      ));
    }

    const existingParking = parkingLots.map(p => p.code);
    const toCreateParking = PARKING_LOTS.filter(p => !existingParking.includes(p.code));
    if (toCreateParking.length > 0) {
      await Promise.allSettled(toCreateParking.map(p =>
        base44.entities.ParkingLot.create({ ...p, current_occupancy: 0 })
      ));
    }

    queryClient.invalidateQueries();
    setSimRunning(false);
    setSeeded(true);
    setTimeout(() => setSeeded(false), 4000);
  };

  const fillPercent = Math.round((attendance / 106572) * 100);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="relative h-36 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80" alt="stadium" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001E44] via-[#001E44]/60 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">Event Setup</h1>
          <p className="text-white/60 text-sm">Configure venue & simulate crowd scenarios</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Seed data */}
        <Card className="border-dashed border-2 border-[#001E44]/20 bg-[#001E44]/3">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-[#001E44] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">Initialize Venue Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates Gates A–F and Parking Lots A–F with Beaver Stadium capacities. Run this first if no gates are showing.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current: <span className="font-medium text-foreground">{gates.length} gates</span> · <span className="font-medium text-foreground">{parkingLots.length} lots</span>
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-[#001E44] hover:bg-[#001E44]/90"
              onClick={seedData}
              disabled={simRunning}
            >
              {simRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {gates.length === 0 ? 'Initialize Gates & Parking' : 'Re-seed Missing Data'}
            </Button>
            <AnimatePresence>
              {seeded && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Venue data initialized
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Expected Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold">{attendance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">of 106,572 capacity</p>
              </div>
              <Badge className={`${fillPercent > 90 ? 'bg-red-500/20 text-red-700' : fillPercent > 70 ? 'bg-yellow-500/20 text-yellow-700' : 'bg-green-500/20 text-green-700'}`}>
                {fillPercent}% full
              </Badge>
            </div>
            <Slider value={[attendance]} min={10000} max={106572} step={1000} onValueChange={([v]) => setAttendance(v)} />
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${fillPercent > 90 ? 'bg-red-500' : fillPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Crowd fill ({fillPercent}%) drives simulation density across all gates</p>
          </CardContent>
        </Card>

        {/* Gate capacity overview */}
        {gates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Gate Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {gates.map(gate => {
                const fill = gate.capacity ? ((gate.current_count || 0) / gate.capacity) * 100 : 0;
                const color = gate.status === 'congested' ? 'bg-red-500' : gate.status === 'busy' ? 'bg-yellow-500' : gate.status === 'closed' ? 'bg-gray-400' : 'bg-green-500';
                return (
                  <div key={gate.id} className="flex items-center gap-3">
                    <span className="w-14 text-xs font-bold text-foreground">{gate.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(fill, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-24 text-right">{gate.current_count || 0}/{gate.capacity || 0}</span>
                    <Badge variant="outline" className="text-[9px] w-18 justify-center">{gate.status}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Surge scenario selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E07B39]" /> Event Phase Simulation
            </CardTitle>
            <p className="text-xs text-muted-foreground">Select a scenario and apply to update gate conditions</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {SURGE_MODES.map(mode => (
              <motion.div
                key={mode.id}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  activeSurge === mode.id
                    ? 'border-[#001E44]/40 bg-[#001E44]/5 ring-1 ring-[#001E44]/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
                onClick={() => setActiveSurge(mode.id)}
              >
                <span className="text-xl">{mode.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{mode.label}</p>
                  <p className="text-xs text-muted-foreground">{mode.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 transition-all ${activeSurge === mode.id ? 'bg-[#001E44] border-[#001E44]' : 'border-muted-foreground/30'}`} />
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-[#001E44] hover:bg-[#001E44]/90"
            onClick={applySurge}
            disabled={simRunning || gates.length === 0}
          >
            {simRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Apply Scenario
          </Button>
          <Button variant="outline" onClick={resetGates} disabled={simRunning || gates.length === 0} className="flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Scenario applied to all gates
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulation rules note */}
        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Simulation Rules</p>
          <p>• Uses Little's Law: Wait = Queue ÷ Throughput Rate</p>
          <p>• Gate A gets 2× load during Student Surge</p>
          <p>• Gate E gets extra pressure during Kickoff Rush (ticket windows)</p>
          <p>• The live sim auto-updates every 8 seconds in Ops Dashboard</p>
        </div>
      </div>
    </div>
  );
}