/**
 * useSimulation — React hook that runs live gate simulation.
 * Updates gate data in the database every N seconds.
 * Fans see live conditions; operators see real-time changes.
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { computeGateState } from './simulation';

const TICK_INTERVAL = 8000; // 8 seconds

export function useSimulation({ gates, enabled = true, phaseId = 'kickoff_rush', baseFillPct = 0.55 }) {
  const queryClient = useQueryClient();
  const timerRef = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !gates || gates.length === 0) return;

    const runTick = async () => {
      // Compute new state for each gate
      const updates = gates.map(gate => {
        const newState = computeGateState(gate.code, baseFillPct, phaseId);
        if (!newState) return null;
        return base44.entities.Gate.update(gate.id, newState);
      }).filter(Boolean);

      await Promise.allSettled(updates);
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      setTick(t => t + 1);
    };

    timerRef.current = setInterval(runTick, TICK_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [gates?.length, enabled, phaseId, baseFillPct]);

  return { tick };
}