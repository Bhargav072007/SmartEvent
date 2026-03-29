import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, CheckCircle2, AlertTriangle, UserCheck, RefreshCw, Loader2, Users, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 as b44 } from '@/api/base44Client';

// Verification states
const STATE = { IDLE: 'idle', CAPTURING: 'capturing', ANALYZING: 'analyzing', VERIFIED: 'verified', RETRY: 'retry', NO_FACE: 'no_face' };

const stateConfig = {
  idle: { label: 'Ready — Upload Fan Photo', color: 'border-border', badge: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  capturing: { label: 'Capturing…', color: 'border-blue-400', badge: 'bg-blue-500/20 text-blue-700', dot: 'bg-blue-500' },
  analyzing: { label: 'Verifying Identity…', color: 'border-[#E07B39]', badge: 'bg-[#E07B39]/20 text-[#E07B39]', dot: 'bg-[#E07B39] animate-pulse' },
  verified: { label: '✓ Verified — Gate Open', color: 'border-green-400', badge: 'bg-green-500/20 text-green-700', dot: 'bg-green-500' },
  retry: { label: '⚠ No Match — Retry', color: 'border-orange-400', badge: 'bg-orange-500/20 text-orange-700', dot: 'bg-orange-500' },
  no_face: { label: '✕ Face Not Visible', color: 'border-red-400', badge: 'bg-red-500/20 text-red-700', dot: 'bg-red-500' },
};

export default function SmartGate() {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [gateId, setGateId] = useState('');
  const [verifyState, setVerifyState] = useState(STATE.IDLE);
  const [preview, setPreview] = useState(null);
  const [matchedFan, setMatchedFan] = useState(null);
  const [throughputLog, setThroughputLog] = useState([]);
  const [aiReason, setAiReason] = useState('');

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list(),
  });

  const { data: enrolledFans = [] } = useQuery({
    queryKey: ['fans'],
    queryFn: () => base44.entities.FanProfile.filter({ verification_status: 'verified' }),
  });

  const updateGateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Gate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gates'] }),
  });

  const selectedGate = gates.find(g => g.id === gateId);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setVerifyState(STATE.CAPTURING);
    setMatchedFan(null);
    setAiReason('');

    // Upload
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPreview(file_url);
    setVerifyState(STATE.ANALYZING);

    // AI: detect face + attempt to match against enrolled fans
    const enrolledNames = enrolledFans.map(f => f.name).join(', ');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a smart gate verification system at Beaver Stadium.

Analyze this image:
1. Is there a clearly visible human face? (frontal or near-frontal, not masked, not a pet/object)
2. If yes, does the person appear to be one of these enrolled fans: ${enrolledNames || 'no enrolled fans yet'}?
   - If there are no enrolled fans, say matched=false and reason="No enrolled fans"
   - If the image has a face but clearly doesn't match any name, say matched=false
   - For demo purposes, if there IS a face visible and there ARE enrolled fans, say matched=true and pick the first enrolled name

Return JSON only.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          face_detected: { type: 'boolean' },
          matched: { type: 'boolean' },
          matched_name: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string' },
        }
      }
    });

    if (!result.face_detected) {
      setVerifyState(STATE.NO_FACE);
      setAiReason(result.reason || 'No face detected in image');
      logThroughput('no_face', null);
    } else if (result.matched) {
      const fan = enrolledFans.find(f => f.name === result.matched_name) || enrolledFans[0];
      setMatchedFan(fan || { name: result.matched_name });
      setVerifyState(STATE.VERIFIED);
      setAiReason(result.reason || '');
      logThroughput('verified', fan);
      // Update gate count
      if (selectedGate) {
        const newCount = Math.max(0, (selectedGate.current_count || 0) - 50);
        updateGateMutation.mutate({ id: selectedGate.id, data: { current_count: newCount } });
      }
    } else {
      setVerifyState(STATE.RETRY);
      setAiReason(result.reason || 'No match in enrolled set');
      logThroughput('retry', null);
    }
  };

  const logThroughput = (outcome, fan) => {
    setThroughputLog(prev => [{
      time: new Date().toLocaleTimeString(),
      outcome,
      name: fan?.name || '—',
    }, ...prev.slice(0, 9)]);
  };

  const reset = () => {
    setVerifyState(STATE.IDLE);
    setPreview(null);
    setMatchedFan(null);
    setAiReason('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const conf = stateConfig[verifyState];
  const totalVerified = throughputLog.filter(l => l.outcome === 'verified').length;
  const totalRetry = throughputLog.filter(l => l.outcome === 'retry' || l.outcome === 'no_face').length;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="relative h-32 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80" alt="stadium" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#041E42] via-[#041E42]/60 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">Smart Gate</h1>
          <p className="text-white/60 text-sm">Face detection & entry verification</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Gate selector */}
        <div className="flex gap-3 items-center">
          <Select value={gateId} onValueChange={setGateId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select active gate" />
            </SelectTrigger>
            <SelectContent>
              {gates.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} — {g.status} ({g.wait_minutes || 0} min wait)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{totalVerified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{totalRetry}</p>
              <p className="text-xs text-muted-foreground">Retry/Fail</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-[#041E42]">{enrolledFans.length}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </CardContent>
          </Card>
        </div>

        {/* Camera / verification area */}
        <Card className={`border-2 transition-all duration-500 ${conf.color}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4" /> Gate Camera
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${conf.dot}`} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conf.badge}`}>{conf.label}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Preview area */}
            <div
              className="relative w-full aspect-video bg-[#041E42]/5 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border border-dashed border-muted-foreground/20 mb-4"
              onClick={() => verifyState === STATE.IDLE && fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="captured" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Tap to upload fan photo</p>
                  <p className="text-xs opacity-60">Simulates gate camera capture</p>
                </div>
              )}

              {/* Overlay states */}
              <AnimatePresence>
                {verifyState === STATE.ANALYZING && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#041E42]/60 flex flex-col items-center justify-center gap-3"
                  >
                    <Loader2 className="w-10 h-10 text-[#E07B39] animate-spin" />
                    <p className="text-white font-semibold text-sm">Analyzing face…</p>
                  </motion.div>
                )}
                {verifyState === STATE.VERIFIED && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-green-900 font-bold bg-white/80 px-4 py-1 rounded-full text-sm">
                      {matchedFan?.name || 'Verified'}
                    </p>
                  </motion.div>
                )}
                {(verifyState === STATE.RETRY || verifyState === STATE.NO_FACE) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-red-900 font-bold bg-white/80 px-4 py-1 rounded-full text-sm">
                      {verifyState === STATE.NO_FACE ? 'Face Not Visible' : 'No Match — Manual Review'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {aiReason && (
              <p className="text-xs text-muted-foreground italic text-center mb-3">{aiReason}</p>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />

            <div className="flex gap-2">
              {verifyState === STATE.IDLE ? (
                <Button className="flex-1 bg-[#041E42] hover:bg-[#041E42]/90" onClick={() => fileRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" /> Capture Fan Photo
                </Button>
              ) : verifyState === STATE.ANALYZING || verifyState === STATE.CAPTURING ? (
                <Button className="flex-1" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={reset}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Next Fan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Throughput log */}
        {throughputLog.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" /> Entry Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {throughputLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{log.time}</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.outcome === 'verified' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="flex-1 font-medium">{log.name}</span>
                    <Badge variant="outline" className={`text-[10px] ${log.outcome === 'verified' ? 'text-green-700' : 'text-red-700'}`}>
                      {log.outcome === 'verified' ? 'Verified' : log.outcome === 'no_face' ? 'No Face' : 'Retry'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrolled fans list */}
        {enrolledFans.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Enrolled Fans ({enrolledFans.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {enrolledFans.map(f => (
                  <div key={f.id} className="flex items-center gap-2 bg-green-500/10 text-green-700 rounded-full px-3 py-1 text-xs font-medium">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-green-200 flex-shrink-0">
                      {f.selfie_url
                        ? <img src={f.selfie_url} alt={f.name} className="w-full h-full object-cover" />
                        : <span className="flex items-center justify-center h-full text-[9px]">{f.name?.[0]}</span>
                      }
                    </div>
                    {f.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}