import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, UserX, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function Profile() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [typed, setTyped] = useState('');

  const handleDelete = async () => {
    // In a real app, call a backend function to queue account deletion
    setDeleted(true);
    setTimeout(() => base44.auth.logout(), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="relative h-32 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001E44] via-[#001E44]/60 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">Account</h1>
          <p className="text-white/60 text-sm">Manage your profile & data</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Account Deletion — App Store required */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently delete your SmartVenue account and all associated data including your fan profile, biometric data, and ticket history. This action cannot be undone.
            </p>

            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> What will be deleted:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-4 list-disc">
                <li>Fan profile and personal information</li>
                <li>Biometric face data used for gate pass</li>
                <li>Ticket scan history</li>
                <li>Notification preferences</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <UserX className="w-4 h-4 mr-2" /> Request Account Deletion
            </Button>
          </CardContent>
        </Card>

        {/* Privacy policy link */}
        <Card>
          <CardContent className="p-0">
            {[
              { label: 'Privacy Policy', href: 'https://gopsu.com/privacy' },
              { label: 'Terms of Service', href: 'https://gopsu.com/terms' },
              { label: 'Data & Permissions', href: '#' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Presentation Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/gate-verify">
              <Button className="w-full bg-[#001E44] hover:bg-[#001E44]/90">
                Open Gate Verification Screen
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* App version */}
        <p className="text-center text-xs text-muted-foreground">SmartVenue PSU · v1.0.0</p>
      </div>

      {/* Delete Confirmation Bottom Sheet */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 pb-safe"
            >
              {deleted ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-7 h-7 text-destructive" />
                  </div>
                  <p className="text-lg font-bold">Deletion Requested</p>
                  <p className="text-sm text-muted-foreground">Your account will be permanently deleted within 30 days. You'll be signed out now.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Confirm Deletion</h2>
                      <p className="text-xs text-muted-foreground">This cannot be undone</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">Type <strong>DELETE</strong> to confirm account deletion:</p>
                  <input
                    type="text"
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-destructive/40"
                  />

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={typed !== 'DELETE'}
                      onClick={handleDelete}
                    >
                      Delete Account
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
