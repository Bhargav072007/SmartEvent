/**
 * SmartVenue PSU — Simulation Engine
 * Rule-based crowd logic. No LLM. Uses Little's Law for wait time estimation.
 * Wait = Queue Length / Throughput Rate
 */

export const GATES = [
  { code: 'A', name: 'Gate A', description: 'Student Section Entrance', capacity: 4500, position_x: 72, position_y: 20, nearest_parking: 'Lot A', isStudentGate: true },
  { code: 'B', name: 'Gate B', description: 'ADA Shuttle Drop & General', capacity: 5500, position_x: 88, position_y: 55, nearest_parking: 'Lot B', isADA: true },
  { code: 'C', name: 'Gate C', description: 'South General Admission', capacity: 5000, position_x: 72, position_y: 88, nearest_parking: 'Lot C' },
  { code: 'D', name: 'Gate D', description: 'West & Athletics Lots', capacity: 5000, position_x: 28, position_y: 80, nearest_parking: 'Lot D' },
  { code: 'E', name: 'Gate E', description: 'Ticket Windows & Will Call', capacity: 4000, position_x: 12, position_y: 50, nearest_parking: 'Lot E', hasTicketWindows: true },
  { code: 'F', name: 'Gate F', description: 'North Upper Deck', capacity: 4800, position_x: 28, position_y: 20, nearest_parking: 'Lot F' },
];

export const PARKING_LOTS = [
  { code: 'A', name: 'Lot A', capacity: 2800, nearest_gate: 'A', walk_minutes: 5, position_x: 82, position_y: 10 },
  { code: 'B', name: 'Lot B', capacity: 3200, nearest_gate: 'B', walk_minutes: 4, position_x: 96, position_y: 65 },
  { code: 'C', name: 'Lot C', capacity: 2500, nearest_gate: 'C', walk_minutes: 6, position_x: 80, position_y: 98 },
  { code: 'D', name: 'Lot D', capacity: 3000, nearest_gate: 'D', walk_minutes: 7, position_x: 20, position_y: 93 },
  { code: 'E', name: 'Lot E', capacity: 2200, nearest_gate: 'E', walk_minutes: 5, position_x: 4, position_y: 60 },
  { code: 'F', name: 'Lot F', capacity: 2600, nearest_gate: 'F', walk_minutes: 6, position_x: 18, position_y: 10 },
];

export const EVENT_PHASES = [
  { id: 'pregame_early', label: 'Pre-Game Early', timeLabel: '3h before', baseFillPct: 0.05 },
  { id: 'pregame_rush', label: 'Pre-Game Rush', timeLabel: '90–60 min', baseFillPct: 0.35 },
  { id: 'kickoff_rush', label: 'Kickoff Rush', timeLabel: '60–30 min', baseFillPct: 0.75 },
  { id: 'halftime', label: 'Halftime', timeLabel: 'Halftime', baseFillPct: 0.55 },
  { id: 'postgame', label: 'Post-Game Exit', timeLabel: 'After game', baseFillPct: 0.80 },
];

/**
 * Compute simulated gate state using Little's Law:
 * Wait (min) = Queue / (Throughput/min)
 */
export function computeGateState(gateCode, baseFillPct, phaseId, overrides = {}) {
  const gateDef = GATES.find(g => g.code === gateCode);
  if (!gateDef) return null;

  // Phase multipliers per gate
  let fillMultiplier = 1.0;
  if (phaseId === 'kickoff_rush') {
    if (gateCode === 'A') fillMultiplier = 1.6; // student surge
    else if (gateCode === 'E') fillMultiplier = 1.3; // ticket windows
    else fillMultiplier = 1.1;
  } else if (phaseId === 'student_surge') {
    if (gateCode === 'A') fillMultiplier = 2.0;
    else fillMultiplier = 0.7;
  } else if (phaseId === 'postgame') {
    fillMultiplier = 1.5;
  } else if (phaseId === 'halftime') {
    fillMultiplier = 0.8;
  }

  // Add noise for realism ±10%
  const noise = 0.9 + Math.random() * 0.2;
  const rawFill = Math.min(baseFillPct * fillMultiplier * noise, 0.98);
  const queueLength = Math.round(rawFill * gateDef.capacity);

  // Throughput rate in people/min (capacity/hr ÷ 60)
  const throughputPerMin = gateDef.capacity / 60;

  // Little's Law: W = L / λ
  const waitMinutes = Math.max(0, Math.round(queueLength / throughputPerMin));

  let status = 'open';
  if (rawFill > 0.88) status = 'congested';
  else if (rawFill > 0.62) status = 'busy';

  // Apply manual overrides
  const finalState = {
    current_count: queueLength,
    wait_minutes: waitMinutes,
    status,
    ...overrides,
  };

  return finalState;
}

/**
 * Recommend the best gate for a fan based on:
 * - current wait time
 * - their ticket section mapping
 * - gate status
 * Returns gate code with reason label.
 */
export function recommendGate(gates, ticketSection) {
  const openGates = gates.filter(g => g.status !== 'closed');
  if (!openGates.length) return null;

  // Section → preferred gate mapping
  const SECTION_GATE = {
    'SA': 'A', // Student
    'NE': 'F', // North East → F
    'NW': 'F', // North West → F
    'SE': 'B', // South East → B
    'SW': 'C', // South West → C
    'W':  'E', // West → E
  };

  let sectionPrefix = null;
  if (ticketSection) {
    const match = ticketSection.match(/^([A-Z]+)/);
    if (match) sectionPrefix = match[1];
  }

  const sectionGateCode = sectionPrefix ? SECTION_GATE[sectionPrefix] : null;
  const sectionGate = sectionGateCode ? openGates.find(g => g.code === sectionGateCode) : null;

  // Score = wait_minutes * 2 + congestion penalty
  const scored = openGates.map(g => {
    const congestionPenalty = g.status === 'congested' ? 20 : g.status === 'busy' ? 5 : 0;
    const score = (g.wait_minutes || 0) + congestionPenalty;
    return { gate: g, score };
  }).sort((a, b) => a.score - b.score);

  const fastest = scored[0]?.gate;

  // If section gate exists and isn't congested, prefer it unless it's 5+ min slower
  if (sectionGate && sectionGate.status !== 'congested') {
    const fastestWait = fastest?.wait_minutes || 0;
    const sectionWait = sectionGate.wait_minutes || 0;
    if (sectionWait <= fastestWait + 5) {
      return {
        gate: sectionGate,
        reason: `Closest to your section (${ticketSection})`,
        isFastest: sectionGate.code === fastest?.code,
      };
    }
  }

  const reason = fastest?.status === 'congested'
    ? 'Least congested option'
    : (fastest?.wait_minutes || 0) <= 3
    ? 'Fastest entry right now'
    : `${fastest?.wait_minutes || 0} min wait — best available`;

  return { gate: fastest, reason, isFastest: true };
}

/**
 * Generate smart alert messages based on gate conditions.
 */
export function generateAlerts(gates) {
  const alerts = [];
  gates.forEach(g => {
    if (g.status === 'congested') {
      const alternatives = gates.filter(alt => alt.code !== g.code && alt.status === 'open');
      const alt = alternatives.sort((a, b) => (a.wait_minutes || 0) - (b.wait_minutes || 0))[0];
      if (alt) {
        alerts.push({
          type: 'congestion_alert',
          title: `Gate ${g.code} Congested`,
          message: `Use Gate ${alt.code} to avoid ${g.wait_minutes}+ min wait at Gate ${g.code}. Gate ${alt.code}: ~${alt.wait_minutes} min.`,
          gate_code: g.code,
        });
      }
    }
    if (g.status === 'busy' && (g.wait_minutes || 0) >= 8) {
      alerts.push({
        type: 'route_update',
        title: `Gate ${g.code} Getting Busy`,
        message: `Wait time at Gate ${g.code} is ${g.wait_minutes} min. Consider an alternative gate.`,
        gate_code: g.code,
      });
    }
  });
  return alerts;
}