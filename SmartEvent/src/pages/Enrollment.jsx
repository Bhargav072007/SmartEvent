import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SmartSelfieCapture from '../components/enrollment/SmartSelfieCapture';
import { CheckCircle2, ShieldCheck, AlertTriangle, Loader2, UserCheck, Ticket, Car, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTicket } from '../lib/TicketContext';

const STATUS_CONFIG = {
  verified:     { label: 'Face Verified ✓', color: 'bg-green-500/20 text-green-700', icon: CheckCircle2 },
  pending:      { label: 'Pending Verification', color: 'bg-yellow-500/20 text-yellow-700', icon: AlertTriangle },
  retry:        { label: 'Retry Needed', color: 'bg-orange-500/20 text-orange-700', icon: AlertTriangle },
  manual_check: { label: 'Manual Check', color: 'bg-blue-500/20 text-blue-700', icon: Shield },
};

const STEPS = ['selfie', 'details', 'done'];

export default function Enrollment() {
  const queryClient = useQueryClient();
  const { ticket } = useTicket();
  const [step, setStep] = useState('selfie');
  const [selfieResult, setSelfieResult] = useState(null);
  const [name, setName] = useState(ticket?.holderName || '');
  const [section, setSection] = useState(ticket?.section || '');
  const [parking, setParking] = useState(ticket?.parking || '');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.FanProfile.filter({ email: user.email });
      if (profiles?.[0]) {
        const p = profiles[0];
        if (p.selfie_url) setSelfieResult({ url: p.selfie_url, verified: p.verification_status === 'verified' });
        setName(prev => prev || p.name || '');
        setSection(prev => prev || p.ticket_section || '');
        setParking(prev => prev || p.parking_lot || '');
        // If already enrolled, skip to done
        if (p.selfie_url && p.name) setStep('done');
      }
      return profiles?.[0] || null;
    },
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      if (profile) return base44.entities.FanProfile.update(profile.id, data);
      return base44.entities.FanProfile.create({ ...data, email: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setStep('done');
    },
  });

  const handleSave = () => {
    const openGates = gates.filter(g => g.status !== 'closed');
    const bestGate = ticket?.gate || (openGates.length > 0
      ? openGates.reduce((b, g) => (g.wait_minutes || 0) < (b.wait_minutes || 0) ? g : b, openGates[0])?.code
      : '');
    const verificationStatus = selfieResult?.verified ? 'verified' : selfieResult ? 'retry' : 'pending';
    saveMutation.mutate({
      name, selfie_url: selfieResult?.url || null,
      ticket_section: section, parking_lot: parking,
      assigned_gate: bestGate, verification_status: verificationStatus,
    });
  };

  const currentStatus = selfieResult?.verified ? 'verified' : selfieResult ? 'retry' : profile?.verification_status || 'pending';
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="relative h-40 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80" alt="Beaver Stadium" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001E44] via-[#001E44]/60 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">Face Pass</h1>
          <p className="text-white/60 text-sm">Biometric gate entry for Beaver Stadium</p>
        </div>
        <div className="absolute top-4 right-4">
          <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Step progress */}
        <div className="flex items-center gap-2">
          {[{id:'selfie', label:'Selfie'},{id:'details', label:'Details'},{id:'done', label:'Enrolled'}].map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === s.id ? 'bg-[#001E44] text-white' : STEPS.indexOf(step) > i ? 'bg-green-500/20 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {STEPS.indexOf(step) > i ? <CheckCircle2 className="w-3 h-3" /> : <span>{i+1}</span>}
                {s.label}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded ${STEPS.indexOf(step) > i ? 'bg-green-500' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Done state */}
        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-green-500/30 ring-1 ring-green-500/20">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  {selfieResult?.url
                    ? <img src={selfieResult.url} alt="selfie" className="w-full h-full rounded-full object-cover" />
                    : <UserCheck className="w-10 h-10 text-green-500" />
                  }
                </div>
                <h2 className="text-xl font-bold text-foreground">Face Pass Active</h2>
                <p className="text-sm text-muted-foreground mt-1">{name}</p>
                <div className="flex justify-center mt-3">
                  <Badge className="bg-green-500/20 text-green-700 text-sm px-4 py-1">{statusCfg.label}</Badge>
                </div>
                {/* Pass card */}
                <div className="mt-5 bg-[#001E44] rounded-2xl p-4 text-white text-left">
                  <p className="text-white/50 text-[10px] uppercase tracking-wide mb-3 font-medium">Gate Pass Details</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-white/50 text-[10px]">Gate</p>
                      <p className="font-bold text-[#E07B39] text-lg">{ticket?.gate || profile?.assigned_gate || '—'}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px]">Section</p>
                      <p className="font-bold">{section || ticket?.section || '—'}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px]">Parking</p>
                      <p className="font-bold">{parking || ticket?.parking || '—'}</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 w-full text-sm" onClick={() => setStep('selfie')}>
                  Update Face Pass
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 1: Selfie */}
        {step === 'selfie' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#E07B39]" /> Step 1: Selfie Verification
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Upload a clear, front-facing photo. Our AI verifies a real face is present for gate entry.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pb-5">
                <SmartSelfieCapture
                  onCapture={setSelfieResult}
                  existingUrl={selfieResult?.url || profile?.selfie_url}
                  existingStatus={profile?.verification_status === 'verified' ? 'verified' : undefined}
                />
                {selfieResult && (
                  <div className={`w-full rounded-xl p-3 flex items-center gap-3 ${selfieResult.verified ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                    {selfieResult.verified
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                    <p className="text-xs font-medium">
                      {selfieResult.verified ? 'Face detected — you\'re ready for gate entry' : 'Face not clearly detected — please retry with better lighting'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button
              className="w-full bg-[#001E44] hover:bg-[#001E44]/90"
              size="lg"
              disabled={!selfieResult}
              onClick={() => setStep('details')}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Selfie preview mini */}
            {selfieResult?.url && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <img src={selfieResult.url} alt="selfie" className="w-12 h-12 rounded-full object-cover border-2 border-green-500" />
                <div>
                  <p className="text-sm font-semibold">Selfie Captured</p>
                  <p className="text-xs text-muted-foreground">{selfieResult.verified ? '✓ Face verified' : '⚠ Retry recommended'}</p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#E07B39]" /> Step 2: Ticket Details
                </CardTitle>
                {ticket && <p className="text-xs text-muted-foreground">Pre-filled from your scanned ticket</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Section</Label>
                    <Input value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. SA-104" />
                  </div>
                  <div>
                    <Label>Parking Lot</Label>
                    <Input value={parking} onChange={e => setParking(e.target.value)} placeholder="e.g. Lot A" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('selfie')} className="flex-1">Back</Button>
              <Button
                className="flex-1 bg-[#001E44] hover:bg-[#001E44]/90"
                onClick={handleSave}
                disabled={saveMutation.isPending || !name}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Activate Face Pass
              </Button>
            </div>

            <AnimatePresence>
              {saveMutation.isError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center">
                  Something went wrong. Please try again.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Info */}
        <div className="bg-muted/40 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground">How Face Pass works</p>
          <p>• Upload your selfie — AI confirms a real face is present</p>
          <p>• Gate operators scan faces against enrolled fans</p>
          <p>• Verified fans get faster gate entry with no ticket scan</p>
          <p>• Your photo is only used for this event session</p>
        </div>
      </div>
    </div>
  );
}