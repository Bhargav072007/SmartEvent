import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUARTERS = ['1st', '2nd', '3rd', '4th'];

// Simulated live score that ticks forward
function useSimulatedScore() {
  const [score, setScore] = useState({ psu: 14, opp: 7 });
  const [quarter, setQuarter] = useState(2);
  const [clock, setClock] = useState('8:42');
  const [lastScorer, setLastScorer] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly tick clock down
      setClock(prev => {
        const [m, s] = prev.split(':').map(Number);
        let ns = s - Math.floor(Math.random() * 12 + 5);
        let nm = m;
        if (ns < 0) { ns += 60; nm -= 1; }
        if (nm < 0) {
          setQuarter(q => Math.min(q + 1, 4));
          return '15:00';
        }
        return `${nm}:${String(ns).padStart(2, '0')}`;
      });

      // Random score events (~10% chance each tick)
      if (Math.random() < 0.1) {
        const isPSU = Math.random() > 0.45;
        const points = Math.random() < 0.7 ? 7 : 3;
        setScore(prev => ({
          psu: isPSU ? prev.psu + points : prev.psu,
          opp: !isPSU ? prev.opp + points : prev.opp,
        }));
        setLastScorer({ team: isPSU ? 'PSU' : 'OPP', points });
        setTimeout(() => setLastScorer(null), 3000);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return { score, quarter, clock, lastScorer };
}

export default function LiveScore({ ticket }) {
  const { score, quarter, clock, lastScorer } = useSimulatedScore();
  const opponent = ticket?.opponent || 'Ohio State';

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#001E44] text-white shadow-lg">
      {/* Score flash */}
      <AnimatePresence>
        {lastScorer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-0 left-0 right-0 text-center py-1.5 text-xs font-bold z-10 ${lastScorer.team === 'PSU' ? 'bg-[#E07B39]' : 'bg-red-600'}`}
          >
            {lastScorer.team === 'PSU' ? '🏈 Penn State SCORES!' : `⚡ ${opponent} scores`} +{lastScorer.points}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Live · {QUARTERS[quarter - 1] || '4th'} Qtr</span>
          </div>
          <span className="text-xs font-mono text-white/60 bg-white/10 rounded px-2 py-0.5">{clock}</span>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-between">
          {/* PSU */}
          <div className="flex-1 text-center">
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Penn State</p>
            <motion.p
              key={score.psu}
              initial={{ scale: 1.4, color: '#E07B39' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.4 }}
              className="text-5xl font-black"
            >
              {score.psu}
            </motion.p>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center px-4">
            <span className="text-white/20 text-xl font-bold">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex-1 text-center">
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">{opponent}</p>
            <motion.p
              key={score.opp}
              initial={{ scale: 1.4, color: '#ef4444' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.4 }}
              className="text-5xl font-black"
            >
              {score.opp}
            </motion.p>
          </div>
        </div>

        {/* Win indicator */}
        <div className="mt-3 text-center">
          {score.psu > score.opp
            ? <p className="text-[11px] text-[#E07B39] font-semibold">Penn State leads by {score.psu - score.opp} 🏈</p>
            : score.psu < score.opp
            ? <p className="text-[11px] text-red-400 font-semibold">{opponent} leads by {score.opp - score.psu}</p>
            : <p className="text-[11px] text-white/50 font-semibold">Tied game!</p>
          }
        </div>
      </div>
    </div>
  );
}