import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

// Nodes: gates + internal zones
const ZONES = [
  { id: 'concourse_n', label: 'N Concourse', x: 50, y: 20, type: 'zone' },
  { id: 'concourse_s', label: 'S Concourse', x: 50, y: 80, type: 'zone' },
  { id: 'concourse_e', label: 'E Concourse', x: 80, y: 50, type: 'zone' },
  { id: 'concourse_w', label: 'W Concourse', x: 20, y: 50, type: 'zone' },
  { id: 'field', label: 'Field Level', x: 50, y: 50, type: 'field' },
  { id: 'concessions_n', label: 'Concessions N', x: 50, y: 10, type: 'service' },
  { id: 'concessions_s', label: 'Concessions S', x: 50, y: 90, type: 'service' },
];

// Edges between nodes
const EDGES = [
  ['concourse_n', 'field'],
  ['concourse_s', 'field'],
  ['concourse_e', 'field'],
  ['concourse_w', 'field'],
  ['concourse_n', 'concourse_e'],
  ['concourse_n', 'concourse_w'],
  ['concourse_s', 'concourse_e'],
  ['concourse_s', 'concourse_w'],
  ['concessions_n', 'concourse_n'],
  ['concessions_s', 'concourse_s'],
];

function getNodeById(id) {
  return ZONES.find(z => z.id === id);
}

const zoneLoadMap = {
  0: '#22c55e',
  1: '#eab308',
  2: '#f97316',
  3: '#ef4444',
};

// Simulate zone loads based on gate congestion
function computeZoneLoads(gates) {
  const avgCongestion = gates.length
    ? gates.reduce((s, g) => s + (g.current_count || 0) / (g.capacity || 5000), 0) / gates.length
    : 0;

  return {
    concourse_n: avgCongestion > 0.7 ? 3 : avgCongestion > 0.5 ? 2 : avgCongestion > 0.3 ? 1 : 0,
    concourse_s: avgCongestion > 0.6 ? 2 : avgCongestion > 0.3 ? 1 : 0,
    concourse_e: avgCongestion > 0.8 ? 3 : avgCongestion > 0.5 ? 2 : 1,
    concourse_w: avgCongestion > 0.4 ? 1 : 0,
    field: avgCongestion > 0.5 ? 2 : 1,
    concessions_n: avgCongestion > 0.6 ? 3 : avgCongestion > 0.4 ? 2 : 1,
    concessions_s: avgCongestion > 0.5 ? 2 : 1,
  };
}

export default function CrowdFlowGraph({ gates = [] }) {
  const zoneLoads = computeZoneLoads(gates);

  const gateNodes = gates.map(g => ({
    id: `gate_${g.code}`,
    label: `Gate ${g.code}`,
    x: g.position_x ?? 50,
    y: g.position_y ?? 50,
    type: 'gate',
    status: g.status,
    load: g.status === 'congested' ? 3 : g.status === 'busy' ? 2 : g.status === 'closed' ? -1 : 1,
  }));

  // Gate → nearest concourse edges
  const gateEdges = gateNodes.map(gn => {
    const nearestZone = gn.y < 35 ? 'concourse_n' : gn.y > 65 ? 'concourse_s' : gn.x > 60 ? 'concourse_e' : 'concourse_w';
    return [gn.id, nearestZone];
  });

  const allNodes = [...gateNodes, ...ZONES];
  const allEdges = [...EDGES, ...gateEdges];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#E07B39]" /> Live Crowd Flow Graph
          </CardTitle>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Med</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />High</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <svg viewBox="0 0 100 100" className="w-full" style={{ height: 260 }}>
          {/* Edges */}
          {allEdges.map(([fromId, toId], i) => {
            const from = allNodes.find(n => n.id === fromId);
            const to = allNodes.find(n => n.id === toId);
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 1"
              />
            );
          })}

          {/* Zone nodes */}
          {ZONES.map(zone => {
            const load = zoneLoads[zone.id] ?? 0;
            const color = zoneLoadMap[load] || '#94a3b8';
            const isService = zone.type === 'service';
            const isField = zone.type === 'field';
            const r = isField ? 7 : isService ? 4 : 5.5;
            return (
              <g key={zone.id}>
                <circle cx={zone.x} cy={zone.y} r={r} fill={color} opacity="0.2" />
                <circle cx={zone.x} cy={zone.y} r={r - 1.5} fill={color} opacity="0.7" />
                <text x={zone.x} y={zone.y + r + 3.5} textAnchor="middle" fontSize="3" fill="#64748b">
                  {zone.label}
                </text>
              </g>
            );
          })}

          {/* Gate nodes */}
          {gateNodes.map(gn => {
            const color = gn.load === 3 ? '#ef4444' : gn.load === 2 ? '#f97316' : gn.load === 1 ? '#eab308' : '#22c55e';
            return (
              <g key={gn.id}>
                <circle cx={gn.x} cy={gn.y} r={5} fill="white" stroke={color} strokeWidth="1.5" />
                <text x={gn.x} y={gn.y + 1.5} textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#041E42">
                  {gn.label.replace('Gate ', '')}
                </text>
                <text x={gn.x} y={gn.y + 9} textAnchor="middle" fontSize="2.5" fill="#64748b">
                  {gn.label}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}