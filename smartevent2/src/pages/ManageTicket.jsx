import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ticket, ArrowLeftRight, Search, AlertTriangle, CheckCircle2, Loader2, User, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_TICKETS = {
  'PSU-2024-A1234': { holderName: 'Alex Morgan', email: 'alex@example.com', section: 'SA-104', row: '12', seat: '7', gate: 'A', parking: 'Lot A', eventName: 'PSU vs Ohio State', date: 'Sat Nov 30, 2024 · 3:30 PM' },
  'PSU-2024-B5678': { holderName: 'Jordan Smith', email: 'jordan@example.com', section: 'NE-220', row: '5', seat: '14', gate: 'B', parking: 'Lot B', eventName: 'PSU vs Michigan', date: 'Sat Nov 23, 2024 · 12:00 PM' },
  'PSU-2024-C9012': { holderName: 'Casey Williams', email: 'casey@example.com', section: 'SW-110', row: '3', seat: '22', gate: 'C', parking: 'Lot C', eventName: 'PSU vs Iowa', date: 'Sat Oct 26, 2024 · 7:30 PM' },
  'DEMO': { holderName: 'Demo Fan', email: 'demo@example.com', section: 'SA-104', row: '12', seat: '7', gate: 'A', parking: 'Lot A', eventName: 'PSU vs Ohio State', date: 'Sat Nov 30, 2024 · 3:30 PM' },
};

// ── Transfer Confirmation Modal ──
function TransferConfirmModal({ ticket, ticketCode, newOwnerName, newOwnerEmail, onConfirm, onCancel }) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canConfirm = agreed && fullName.trim().length >= 2;

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setDone(true);
    setTimeout(() => onConfirm(), 1500);
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
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="overflow-y-auto flex-1 p-6 space-y-5" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {done ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
            <p className="text-xl font-bold text-center text-[#001E44]">Transfer Complete!</p>
            <p className="text-sm text-gray-500 text-center">
              Ticket <strong>{ticketCode}</strong> has been transferred to <strong>{newOwnerName}</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#001E44]">Confirm Transfer</h2>
                <p className="text-xs text-muted-foreground">Please read carefully before proceeding</p>
              </div>
            </div>

            {/* Ticket summary */}
            <div className="bg-[#001E44] rounded-2xl p-4 text-white">
              <p className="text-white/50 text-[10px] uppercase tracking-wide mb-2">Ticket Being Transferred</p>
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
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs">
                <span className="text-white/50">From: <span className="text-white font-semibold">{ticket.holderName}</span></span>
                <span className="text-white/50">To: <span className="text-white font-semibold">{newOwnerName}</span></span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <p className="text-sm font-bold text-orange-800">Disclaimer & Responsibility</p>
              </div>
              <p className="text-xs text-orange-800 leading-relaxed">
                You are solely responsible for this ticket transfer. <strong>SmartEvent / SmartVenue PSU bears no responsibility</strong> for any consequences arising from this action, including but not limited to unauthorized transfers, disputes between parties, or loss of access to the event.
              </p>
              <p className="text-xs text-orange-800 leading-relaxed">
                This action is <strong>irreversible</strong> once confirmed. The new ticket holder will have full access rights. Ensure you have verified the recipient's identity before proceeding.
              </p>
            </div>

            {/* Acknowledgment */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-200">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#E07B39] flex-shrink-0"
              />
              <p className="text-sm text-gray-700 leading-snug">
                I have read and understood the disclaimer. I accept full responsibility for this transfer and acknowledge that SmartEvent is not liable for any outcome.
              </p>
            </label>

            {/* Full name confirmation */}
            <div>
              <label className="text-sm font-semibold text-[#001E44] block mb-1.5">
                Type your full name to confirm
              </label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="border-[#001E44]/20"
              />
              <p className="text-xs text-muted-foreground mt-1">This acts as your digital signature authorizing the transfer.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#E07B39] hover:bg-[#E07B39]/90 text-white"
                disabled={!canConfirm || loading}
                onClick={handleConfirm}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer Ticket</>}
              </Button>
            </div>
          </>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ManageTicket() {
  const [ticketCode, setTicketCode] = useState('');
  const [email, setEmail] = useState('');
  const [foundTicket, setFoundTicket] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [transferred, setTransferred] = useState(false);

  const handleLookup = async () => {
    setLookupError('');
    setFoundTicket(null);
    setTransferred(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const code = ticketCode.trim().toUpperCase();
    const ticket = MOCK_TICKETS[code];
    if (!ticket) {
      setLookupError('Ticket not found. Try: DEMO, PSU-2024-A1234, PSU-2024-B5678');
      setLoading(false);
      return;
    }
    if (email && ticket.email.toLowerCase() !== email.trim().toLowerCase()) {
      setLookupError('Email does not match the ticket holder on record.');
      setLoading(false);
      return;
    }
    setFoundTicket(ticket);
    setLoading(false);
  };

  const handleTransferConfirm = () => {
    setShowConfirm(false);
    setTransferred(true);
    setFoundTicket(null);
    setTicketCode('');
    setEmail('');
    setNewOwnerName('');
    setNewOwnerEmail('');
  };

  const canTransfer = newOwnerName.trim().length >= 2 && newOwnerEmail.trim().includes('@');

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-[#001E44] px-5 pt-7 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#E07B39]/20 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-[#E07B39]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Manage Ticket</h1>
        </div>
        <p className="text-white/50 text-sm ml-12">Transfer or update your game day ticket</p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Success banner */}
        <AnimatePresence>
          {transferred && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">Transfer Successful</p>
                  <p className="text-xs text-green-700">The ticket has been transferred to the new holder.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lookup form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-[#E07B39]" /> Find Your Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Ticket Code *</label>
              <Input
                value={ticketCode}
                onChange={e => setTicketCode(e.target.value)}
                placeholder="e.g. PSU-2024-A1234 or DEMO"
                className="font-mono uppercase border-[#001E44]/20"
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email Address (optional)</label>
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ticket holder email for verification"
                type="email"
                className="border-[#001E44]/20"
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
            </div>
            {lookupError && (
              <p className="text-red-500 text-xs">{lookupError}</p>
            )}
            <Button
              className="w-full bg-[#001E44] hover:bg-[#001E44]/90"
              onClick={handleLookup}
              disabled={!ticketCode.trim() || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Look Up Ticket</>}
            </Button>
          </CardContent>
        </Card>

        {/* Ticket found */}
        <AnimatePresence>
          {foundTicket && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Ticket card */}
              <div className="bg-[#001E44] rounded-2xl p-5 text-white">
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3">Ticket Found</p>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xl font-bold">{foundTicket.eventName}</p>
                    <p className="text-white/50 text-xs mt-0.5">{foundTicket.date}</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">Valid</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-white/50 text-[10px]">Section</p>
                    <p className="font-bold text-sm">{foundTicket.section}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-white/50 text-[10px]">Row</p>
                    <p className="font-bold text-sm">{foundTicket.row}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-white/50 text-[10px]">Seat</p>
                    <p className="font-bold text-sm">{foundTicket.seat}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white/40" />
                    <span className="text-white/70 text-sm">{foundTicket.holderName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E07B39]" />
                    <span className="text-white font-bold text-sm">Gate {foundTicket.gate}</span>
                  </div>
                </div>
              </div>

              {/* Transfer form */}
              <Card className="border-[#E07B39]/20 ring-1 ring-[#E07B39]/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-[#E07B39]" /> Transfer Ticket
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Enter the new ticket holder's details below.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">New Holder Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={newOwnerName}
                        onChange={e => setNewOwnerName(e.target.value)}
                        placeholder="e.g. Jane Smith"
                        className="pl-9 border-[#001E44]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">New Holder Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={newOwnerEmail}
                        onChange={e => setNewOwnerEmail(e.target.value)}
                        placeholder="e.g. jane@example.com"
                        type="email"
                        className="pl-9 border-[#001E44]/20"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#E07B39] hover:bg-[#E07B39]/90 text-white"
                    disabled={!canTransfer}
                    onClick={() => setShowConfirm(true)}
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer Ticket
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo hint */}
        {!foundTicket && !transferred && (
          <p className="text-xs text-center text-muted-foreground">
            Try ticket codes: <button onClick={() => setTicketCode('DEMO')} className="text-[#E07B39] font-semibold underline">DEMO</button>,{' '}
            <button onClick={() => setTicketCode('PSU-2024-A1234')} className="text-[#E07B39] font-semibold underline">PSU-2024-A1234</button>
          </p>
        )}
      </div>

      {/* Transfer confirm modal */}
      <AnimatePresence>
        {showConfirm && foundTicket && (
          <TransferConfirmModal
            ticket={foundTicket}
            ticketCode={ticketCode.toUpperCase()}
            newOwnerName={newOwnerName}
            newOwnerEmail={newOwnerEmail}
            onConfirm={handleTransferConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}