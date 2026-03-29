import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Ticket, CheckCircle2, Loader2, ArrowRight, Shield, ChevronRight, Upload, Camera, RefreshCw, AlertTriangle, ArrowLeftRight, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Mock tickets for demo
const MOCK_TICKETS = {
  'PSU-2024-A1234': {
    stadium: 'Beaver Stadium', team: 'Penn State Nittany Lions', opponent: 'Ohio State Buckeyes',
    date: 'Sat Nov 30, 2024 • 3:30 PM', section: 'SA-104', row: '12', seat: '7',
    gate: 'A', parking: 'Lot A', holderName: 'Alex Morgan',
    eventName: 'PSU vs Ohio State', eventPhase: 'kickoff_rush',
  },
  'PSU-2024-B5678': {
    stadium: 'Beaver Stadium', team: 'Penn State Nittany Lions', opponent: 'Michigan Wolverines',
    date: 'Sat Nov 23, 2024 • 12:00 PM', section: 'NE-220', row: '5', seat: '14',
    gate: 'B', parking: 'Lot B', holderName: 'Jordan Smith',
    eventName: 'PSU vs Michigan', eventPhase: 'pregame_rush',
  },
  'PSU-2024-C9012': {
    stadium: 'Beaver Stadium', team: 'Penn State Nittany Lions', opponent: 'Iowa Hawkeyes',
    date: 'Sat Oct 26, 2024 • 7:30 PM', section: 'SW-110', row: '3', seat: '22',
    gate: 'C', parking: 'Lot C', holderName: 'Casey Williams',
    eventName: 'PSU vs Iowa', eventPhase: 'pregame_rush',
  },
  'PSU-2024-E7890': {
    stadium: 'Beaver Stadium', team: 'Penn State Nittany Lions', opponent: 'Michigan State',
    date: 'Sat Oct 12, 2024 • 3:30 PM', section: 'W-45', row: '8', seat: '2',
    gate: 'E', parking: 'Lot E', holderName: 'Taylor Reeves',
    eventName: 'PSU vs Michigan State', eventPhase: 'kickoff_rush',
  },
  'DEMO': {
    stadium: 'Beaver Stadium', team: 'Penn State Nittany Lions', opponent: 'Ohio State Buckeyes',
    date: 'Sat Nov 30, 2024 • 3:30 PM', section: 'SA-104', row: '12', seat: '7',
    gate: 'A', parking: 'Lot A', holderName: 'Demo Fan',
    eventName: 'PSU vs Ohio State', eventPhase: 'kickoff_rush',
  },
};

const SAMPLE_CODES = ['DEMO', 'PSU-2024-A1234', 'PSU-2024-B5678', 'PSU-2024-C9012'];

// ── QR Upload Scan panel ──
function QRUploadPanel({ onResult, scanning }) {
  const fileRef = useRef();
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalyzing(true);

    // Upload to base44 then use LLM to read the QR code
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `This is an image of a Penn State football ticket QR code or ticket stub. Extract the ticket code from it. The code format is like PSU-2024-XXXXX or a similar alphanumeric code. If you cannot find a specific code, return "DEMO" as the fallback. Return ONLY the ticket code string, nothing else.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: { ticket_code: { type: 'string' } },
      },
    });

    setAnalyzing(false);
    const code = result?.ticket_code?.trim().toUpperCase() || 'DEMO';
    onResult(code);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      <div
        className="relative rounded-2xl border-2 border-dashed border-[#001E44]/20 bg-[#001E44]/5 h-44 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#001E44]/40 transition-colors overflow-hidden"
        onClick={() => !analyzing && fileRef.current?.click()}
      >
        {analyzing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 animate-spin text-[#001E44]" />
            <p className="text-sm font-semibold text-[#001E44]">Reading QR code…</p>
            <p className="text-xs text-gray-400">AI is scanning your ticket</p>
          </div>
        ) : previewUrl ? (
          <img src={previewUrl} alt="QR" className="h-full w-full object-contain p-2" />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#001E44]/10 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-[#001E44]/40" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Upload QR code image</p>
            <p className="text-xs text-gray-400">Tap to select photo from camera roll</p>
          </>
        )}
        {/* Corner brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#001E44]/40 rounded-tl" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#001E44]/40 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#001E44]/40 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#001E44]/40 rounded-br" />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 border-[#001E44]/20 text-[#001E44] text-sm"
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload QR Image
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-[#001E44]/20 text-[#001E44] text-sm"
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
        >
          <Camera className="w-4 h-4 mr-2" /> Take Photo
        </Button>
      </div>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  );
}

// ── Ticket Exchange confirmation dialog ──
function TicketExchangeModal({ ticket, onConfirm, onCancel }) {
  const [newOwner, setNewOwner] = useState('');
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setDone(true);
    await new Promise(r => setTimeout(r, 1200));
    onConfirm(newOwner);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-5"
      >
        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
            <p className="text-xl font-bold text-center">Ticket Transferred!</p>
            <p className="text-sm text-gray-500 text-center">Ownership has been changed to <strong>{newOwner}</strong></p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E07B39]/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-[#E07B39]" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Transfer Ticket</h2>
                <p className="text-xs text-muted-foreground">Change ticket ownership</p>
              </div>
            </div>

            {/* Current ticket summary */}
            <div className="bg-[#001E44] rounded-2xl p-4 text-white">
              <p className="text-white/50 text-[10px] uppercase tracking-wide mb-2">Current Ticket</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{ticket.eventName}</p>
                  <p className="text-white/60 text-xs">{ticket.section} · Row {ticket.row} · Seat {ticket.seat}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">Gate</p>
                  <p className="text-2xl font-bold text-[#E07B39]">{ticket.gate}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-white/50" />
                <p className="text-white/70 text-sm">Currently held by: <strong>{ticket.holderName}</strong></p>
              </div>
            </div>

            {/* New owner input */}
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Transfer to (name or email)</label>
              <Input
                value={newOwner}
                onChange={e => setNewOwner(e.target.value)}
                placeholder="e.g. Jane Smith or jane@example.com"
                className="border-[#001E44]/20"
              />
            </div>

            {/* Acknowledgment checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-orange-50 border border-orange-200">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#E07B39] flex-shrink-0"
              />
              <p className="text-sm text-orange-800 leading-snug">
                <strong>Yes, I am aware</strong> that I want to change ownership of this ticket. This action will transfer the ticket to the new holder and cannot be undone without their consent.
              </p>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
              <Button
                className="flex-1 bg-[#E07B39] hover:bg-[#E07B39]/90 text-white"
                disabled={!checked || !newOwner.trim()}
                onClick={handleConfirm}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer Ticket
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function TicketScan({ onTicketScanned }) {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);
  const [phase, setPhase] = useState('scan');
  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'qr'
  const [showExchange, setShowExchange] = useState(false);

  const handleScan = async (ticketCode) => {
    const c = (ticketCode || code).trim().toUpperCase();
    if (!c) return;
    setScanning(true);
    setError('');
    await new Promise(r => setTimeout(r, 900));
    const ticket = MOCK_TICKETS[c] || MOCK_TICKETS['DEMO']; // fallback to DEMO for any unrecognized QR
    if (!ticket) {
      setError('Ticket not found. Try: DEMO, PSU-2024-A1234, PSU-2024-B5678');
      setScanning(false);
      return;
    }
    // If QR scan produced an unknown code, treat as DEMO but note it
    const finalTicket = MOCK_TICKETS[c] ? { ...ticket, code: c } : { ...ticket, code: 'DEMO', holderName: 'Scanned Fan' };
    setFound(finalTicket);
    setPhase('confirming');
    setScanning(false);
  };

  const handleQRResult = (code) => {
    handleScan(code);
  };

  const handleConfirm = async () => {
    setPhase('success');
    await new Promise(r => setTimeout(r, 900));
    onTicketScanned(found);
  };

  const handleExchangeConfirm = (newOwner) => {
    setTimeout(() => {
      setShowExchange(false);
      setPhase('scan');
      setFound(null);
      setCode('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#001E44] flex flex-col overflow-hidden">
      {/* Branded header */}
      <div className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=900&q=80"
          alt="Beaver Stadium"
          className="w-full h-80 object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#001E44]/70 via-[#001E44]/40 to-[#001E44]" />
        <div className="absolute top-0 left-0 right-0 px-6 pt-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/8496877d4_ChatGPT_Image_Mar_28__2026__07_11_17_PM-removebg-preview.png"
              alt="SmartVenue"
              className="w-32 h-32 object-contain drop-shadow-lg"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SmartVenue PSU</h1>
          <p className="text-white/60 text-sm mt-1 font-medium">Crowd Intelligence for Game Day</p>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white font-bold text-base">Beaver Stadium · State College, PA</p>
          <p className="text-white/50 text-xs">Capacity 106,572 · Gates A – F</p>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-8 -mt-2">
        <AnimatePresence mode="wait">

          {/* ── SCAN PHASE ── */}
          {phase === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#001E44]">Link Your Ticket</h2>
                <p className="text-gray-500 text-sm mt-1">Scan QR code or enter your ticket code</p>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl border border-[#001E44]/15 p-1 bg-[#001E44]/5">
                <button
                  onClick={() => setScanMode('qr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${scanMode === 'qr' ? 'bg-[#001E44] text-white shadow' : 'text-gray-500'}`}
                >
                  <QrCode className="w-4 h-4" /> Scan QR
                </button>
                <button
                  onClick={() => setScanMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${scanMode === 'manual' ? 'bg-[#001E44] text-white shadow' : 'text-gray-500'}`}
                >
                  <Ticket className="w-4 h-4" /> Enter Code
                </button>
              </div>

              {/* QR Upload mode */}
              {scanMode === 'qr' && (
                <QRUploadPanel onResult={handleQRResult} scanning={scanning} />
              )}

              {/* Manual entry mode */}
              {scanMode === 'manual' && (
                <div className="space-y-4">
                  {/* Tap-to-demo QR area */}
                  <div
                    className="relative rounded-2xl border-2 border-dashed border-[#001E44]/20 bg-[#001E44]/5 h-36 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#001E44]/40 transition-colors"
                    onClick={() => !scanning && handleScan('DEMO')}
                  >
                    {scanning ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#001E44]" />
                        <p className="text-sm font-medium text-[#001E44]">Scanning…</p>
                      </div>
                    ) : (
                      <>
                        <QrCode className="w-12 h-12 text-[#001E44]/25" />
                        <p className="text-sm text-gray-500 font-medium">Tap to simulate QR scan</p>
                      </>
                    )}
                    <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#001E44]/40 rounded-tl" />
                    <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#001E44]/40 rounded-tr" />
                    <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#001E44]/40 rounded-bl" />
                    <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#001E44]/40 rounded-br" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Or enter ticket code</p>
                    <div className="flex gap-2">
                      <Input
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="e.g. PSU-2024-A1234"
                        className="font-mono uppercase border-[#001E44]/20"
                        onKeyDown={e => e.key === 'Enter' && handleScan()}
                      />
                      <Button onClick={() => handleScan()} disabled={scanning || !code} className="bg-[#001E44] hover:bg-[#001E44]/90">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                  </div>
                </div>
              )}

              {/* Demo tickets */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Demo tickets</p>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_CODES.map(c => {
                    const t = MOCK_TICKETS[c];
                    return (
                      <button key={c} onClick={() => handleScan(c)} disabled={scanning}
                        className="text-left bg-[#001E44]/5 hover:bg-[#001E44]/10 border border-[#001E44]/10 rounded-xl p-3 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-gray-400">{c}</span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                        <p className="text-xs font-semibold text-[#001E44] truncate">{t?.holderName}</p>
                        <p className="text-[10px] text-gray-400">{t?.section} · Gate {t?.gate}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CONFIRMING PHASE ── */}
          {phase === 'confirming' && found && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-[#001E44]">Ticket Found!</h2>
                <p className="text-gray-500 text-sm">Confirm your game day ticket</p>
              </div>

              {/* Ticket card */}
              <div className="relative overflow-hidden rounded-2xl bg-[#001E44] text-white">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-4 border-white" />
                  <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border-4 border-white" />
                </div>
                <div className="relative p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white/60 text-xs font-medium uppercase tracking-wider">SmartVenue PSU</p>
                      <p className="font-bold text-xl mt-0.5">{found.eventName}</p>
                      <p className="text-white/60 text-xs mt-0.5">{found.date}</p>
                    </div>
                    <Ticket className="w-8 h-8 text-[#E07B39] flex-shrink-0" />
                  </div>
                  <div className="h-px bg-white/10 mb-4" />
                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    <div><p className="text-white/50 text-xs">Section</p><p className="font-bold">{found.section}</p></div>
                    <div><p className="text-white/50 text-xs">Row</p><p className="font-bold">{found.row}</p></div>
                    <div><p className="text-white/50 text-xs">Seat</p><p className="font-bold">{found.seat}</p></div>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white/50 text-xs">Ticket Holder</p>
                      <p className="font-bold">{found.holderName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs">Assigned Gate</p>
                      <p className="font-bold text-[#E07B39] text-lg">Gate {found.gate}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-[#001E44] hover:bg-[#001E44]/90 h-12 text-base" onClick={handleConfirm}>
                Enter SmartVenue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              {/* Transfer ticket button */}
              <button
                onClick={() => setShowExchange(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-[#E07B39] font-semibold py-2 rounded-xl border border-[#E07B39]/30 hover:bg-[#E07B39]/5 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" /> Transfer / Exchange Ticket
              </button>

              <button onClick={() => { setPhase('scan'); setFound(null); setCode(''); }} className="w-full text-sm text-gray-400 text-center hover:underline">
                Not my ticket — scan again
              </button>
            </motion.div>
          )}

          {/* ── SUCCESS PHASE ── */}
          {phase === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-60 gap-4">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-xl font-bold text-[#001E44]">Welcome to the game!</p>
              <p className="text-gray-400 text-sm">Loading your SmartVenue dashboard…</p>
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ticket Exchange Modal */}
      <AnimatePresence>
        {showExchange && found && (
          <TicketExchangeModal
            ticket={found}
            onConfirm={handleExchangeConfirm}
            onCancel={() => setShowExchange(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}