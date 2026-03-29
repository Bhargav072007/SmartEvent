import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  CheckCircle2,
  Loader2,
  ScanFace,
  ShieldAlert,
  UserCheck,
  Radar,
  Sparkles,
  Ticket,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusTone = (status) => {
  if (status === 'verified') return 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10';
  if (status === 'denied' || status === 'spoof') return 'text-rose-300 border-rose-400/30 bg-rose-500/10';
  if (status === 'processing' || status === 'scanning' || status === 'medium') return 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10';
  return 'text-slate-300 border-slate-500/30 bg-white/5';
};

export default function GateVerification() {
  const runtimeProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  const kioskCandidates = Array.from(
    new Set([
      `${runtimeProtocol}//${runtimeHost}:5050`,
      'http://127.0.0.1:5050',
      'http://localhost:5050',
    ])
  );

  const [kioskBaseUrl, setKioskBaseUrl] = useState(kioskCandidates[0]);
  const [recognition, setRecognition] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [frameNonce, setFrameNonce] = useState(Date.now());
  const [holdUntil, setHoldUntil] = useState(0);

  const { data: profiles = [] } = useQuery({
    queryKey: ['face-pass-profiles'],
    queryFn: () => base44.entities.FanProfile.list(),
  });

  const verifiedProfiles = useMemo(
    () => profiles.filter((profile) => profile.verification_status === 'verified'),
    [profiles]
  );

  useEffect(() => {
    let cancelled = false;

    const resolveKioskBaseUrl = async () => {
      for (const candidate of kioskCandidates) {
        try {
          const response = await fetch(`${candidate}/health`, { cache: 'no-store' });
          if (response.ok) return candidate;
        } catch {
          // try next endpoint
        }
      }
      throw new Error('No kiosk endpoint responded');
    };

    const pollRecognition = async () => {
      try {
        const resolvedBaseUrl = await resolveKioskBaseUrl();
        if (!cancelled) setKioskBaseUrl(resolvedBaseUrl);

        const response = await fetch(`${resolvedBaseUrl}/recognition`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Recognition service error: ${response.status}`);

        const payload = await response.json();
        if (cancelled) return;

        setRecognition(payload);
        setFrameNonce(Date.now());
        setError('');

        const matchedProfile = verifiedProfiles.find((profile) =>
          profile.id === payload.fan_id ||
          profile.email === payload.fan_id ||
          (payload.fan_name && profile.name?.toLowerCase() === String(payload.fan_name).toLowerCase())
        );

        if (payload.status === 'verified') {
          const verification = await base44.entities.FanProfile.verify({
            email: matchedProfile?.email || (String(payload.fan_id || '').includes('@') ? payload.fan_id : ''),
            name: matchedProfile?.name || payload.fan_name || '',
            gate: payload.gate || '',
          });
          if (!cancelled) {
            setResult(verification);
            setHoldUntil(Date.now() + 5000);
          }
          return;
        }

        if (payload.status === 'denied' || payload.status === 'spoof') {
          const failedResult = {
            verified: false,
            access_granted: false,
            message: payload.instruction || 'Face Pass not found.',
            profile: null,
            gate: payload.gate || '',
          };
          setResult(failedResult);
          setHoldUntil(Date.now() + 3500);
          return;
        }

        if (payload.status === 'idle' || payload.status === 'scanning' || payload.status === 'processing' || payload.status === 'medium') {
          if (Date.now() >= holdUntil) {
            setResult(null);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Kiosk camera feed unavailable. Make sure the 5050 ML service is running and reachable from this browser.');
        }
      }
    };

    pollRecognition();
    const interval = window.setInterval(pollRecognition, 700);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [kioskCandidates, verifiedProfiles]);

  const liveGate = result?.gate || recognition?.gate || '';
  const frameUrl = `${kioskBaseUrl}/frame.jpg?t=${frameNonce}`;
  const recognitionStatus = recognition?.status || 'connecting';
  const liveConfidence = typeof recognition?.confidence === 'number' ? Math.round(recognition.confidence * 100) : null;
  const recognizedFan = result
    ? result.verified
      ? (result.profile?.name || recognition?.fan_name || 'Verified fan')
      : 'No enrolled match'
    : (recognition?.fan_name || 'Awaiting scan');

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#050816_0%,#09162b_42%,#050816_100%)]" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative min-h-screen px-3 py-3 md:px-4 md:py-4">
        <div className="mx-auto max-w-[980px]">
          <div className="mb-4 flex items-center justify-between rounded-[22px] border border-cyan-400/20 bg-white/5 px-4 py-4 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.08)]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/10">
                  <ScanFace className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">SmartVenue Biometrics</p>
                  <h1 className="text-2xl font-semibold tracking-tight">Face Pass Verification Console</h1>
                </div>
              </div>
              <p className="mt-2 max-w-xl text-xs text-slate-300/80">Real-time kiosk scanner for Beaver Stadium entry. Optimized for a compact dedicated 4:3 display.</p>
            </div>
            <div className="text-right">
              <Badge className={`border ${statusTone(recognitionStatus)} px-3 py-1.5 text-xs`}>
                {recognitionStatus === 'verified' ? 'Verified' : recognitionStatus}
              </Badge>
              <p className="mt-1 text-[10px] text-slate-400">{kioskBaseUrl}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
            <div className="rounded-[24px] border border-cyan-400/20 bg-white/5 p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/65">Live Capture</p>
                  <p className="mt-1 text-base font-medium text-slate-100">Kiosk Camera Feed</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-200">
                  <Radar className="h-4 w-4" />
                  {recognition?.instruction || 'Waiting for scan'}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-cyan-400/15 bg-black aspect-[4/3] shadow-[inset_0_0_40px_rgba(34,211,238,0.08)]">
                {error ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
                    <Camera className="h-10 w-10 text-white/35" />
                    <div>
                      <p className="text-lg font-medium text-white/90">Camera feed unavailable</p>
                      <p className="mt-1 text-sm text-white/60">{error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={frameUrl} alt="Live kiosk camera" className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.12)_1px,transparent_1px)] bg-[size:52px_52px] opacity-30" />
                    <div className="pointer-events-none absolute inset-5 rounded-[18px] border border-cyan-300/40 shadow-[0_0_25px_rgba(34,211,238,0.22)]" />
                    <div className="pointer-events-none absolute left-5 top-5 h-7 w-7 border-l-2 border-t-2 border-cyan-300" />
                    <div className="pointer-events-none absolute right-5 top-5 h-7 w-7 border-r-2 border-t-2 border-cyan-300" />
                    <div className="pointer-events-none absolute bottom-5 left-5 h-7 w-7 border-b-2 border-l-2 border-cyan-300" />
                    <div className="pointer-events-none absolute bottom-5 right-5 h-7 w-7 border-b-2 border-r-2 border-cyan-300" />
                  </>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Scanner Status</p>
                  <p className="mt-1.5 text-lg font-semibold capitalize text-white">{recognitionStatus}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Confidence</p>
                  <p className="mt-1.5 text-lg font-semibold text-white">{liveConfidence !== null ? `${liveConfidence}%` : '—'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Detected Fan</p>
                  <p className="mt-1.5 truncate text-lg font-semibold text-white">{recognizedFan}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-cyan-400/20 bg-white/5 p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.08)]">
                <div className="mb-3 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/65">Verification Result</p>
                    <p className="text-base font-medium text-slate-100">Face Pass Match State</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      key={result.verified ? 'verified' : 'failed'}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className={`rounded-[20px] border p-4 ${result.verified ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-400/30 bg-rose-500/10'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${result.verified ? 'bg-emerald-400/15' : 'bg-rose-400/15'}`}>
                          {result.verified ? <CheckCircle2 className="h-7 w-7 text-emerald-300" /> : <ShieldAlert className="h-7 w-7 text-rose-300" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-semibold text-white">{result.verified ? 'Access Granted' : 'Face Pass Not Found'}</p>
                          <p className="mt-1 text-xs text-slate-200/85">{result.message}</p>
                        </div>
                      </div>

                      {result.profile && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                              {result.profile.selfie_url ? (
                                <img src={result.profile.selfie_url} alt={result.profile.name} className="h-full w-full object-cover" />
                              ) : (
                                <UserCheck className="h-6 w-6 text-cyan-300" />
                              )}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-white">{result.profile.name}</p>
                              <p className="text-xs text-slate-300">{result.profile.email}</p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Section</p>
                              <p className="mt-1.5 text-base font-semibold text-white">{result.profile.ticket_section || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Row / Seat</p>
                              <p className="mt-1.5 text-base font-semibold text-white">{result.profile.row || '—'} / {result.profile.seat || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Suggested Gate</p>
                              <p className="mt-1.5 flex items-center gap-2 text-base font-semibold text-white">
                                <MapPin className="h-4 w-4 text-cyan-300" />
                                {result.profile.assigned_gate || 'Any gate'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Ticket Code</p>
                              <p className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-white">
                                <Ticket className="h-4 w-4 text-cyan-300" />
                                {result.profile.ticket_code || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="rounded-[20px] border border-cyan-400/20 bg-cyan-500/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                        <div>
                          <p className="text-lg font-semibold text-white">Scanning for enrolled faces</p>
                          <p className="mt-1 text-xs text-slate-300">The kiosk will verify only fans who completed Face Pass enrollment.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Kiosk Notes</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-300">
                  <li>Use the same person for selfie enrollment and live scan.</li>
                  <li>Keep the face centered and still for 1 to 2 seconds.</li>
                  <li>Non-enrolled faces should end in a denied result.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
