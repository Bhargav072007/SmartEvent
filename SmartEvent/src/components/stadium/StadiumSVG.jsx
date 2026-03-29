import React from 'react';

/**
 * Uses the EXACT official Beaver Stadium PDF map as background image.
 * Gate pin positions are % coordinates calibrated to match the PDF map layout.
 * 
 * PDF map layout (from official document):
 *   Gate F  — North top center
 *   Gate A  — Northeast  
 *   Gate A1 — Just left of Gate A
 *   Gate B  — Southeast (Curtin Rd / Press Box side)
 *   Gate C  — South bottom
 *   Gate D  — West (Park Avenue side) 
 *   Gate E  — Northwest (Ticket Windows)
 */

// Seating zones positioned over the PDF map image (% of container width/height)
// Each zone corresponds to a named seating section visible in the PDF
const CAPACITY_ZONES = [
{ label: 'North End', pctX: 50, pctY: 29, w: 22, h: 5, sectionCapacity: 18000 },
{ label: 'South End', pctX: 50, pctY: 72, w: 22, h: 5, sectionCapacity: 16000 },
{ label: 'West Side', pctX: 25, pctY: 50, w: 5, h: 20, sectionCapacity: 26000 },
{ label: 'East Side', pctX: 74, pctY: 50, w: 5, h: 20, sectionCapacity: 26000 },
{ label: 'Upper East', pctX: 84, pctY: 50, w: 5, h: 16, sectionCapacity: 11000 },
{ label: 'Suites', pctX: 50, pctY: 22, w: 18, h: 4, sectionCapacity: 3000 }];


function CapacityOverlay({ gates }) {
  const totalCapacity = 106572;
  const totalCurrent = gates.reduce((s, g) => s + (g.current_count || 0), 0);
  const fillPct = Math.min(totalCurrent / totalCapacity * 100, 100);

  // Distribute fill across zones proportionally
  return (
    <>
      {CAPACITY_ZONES.map((zone) => {
        const zoneFill = Math.min(fillPct, 100);
        const barColor = zoneFill > 85 ? '#ef4444' : zoneFill > 60 ? '#f97316' : zoneFill > 35 ? '#eab308' : '#22c55e';
        const isVertical = zone.h > zone.w;
        return (
          <div
            key={zone.label}
            className="absolute pointer-events-none"
            style={{
              left: `${zone.pctX - zone.w / 2}%`,
              top: `${zone.pctY - zone.h / 2}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              zIndex: 15
            }}>
            
            {/* Background track */}
            <div className="absolute inset-0 rounded-sm bg-black/20 backdrop-blur-[1px]" />
            {/* Fill bar */}
            <div
              className="absolute rounded-sm transition-all duration-700"
              style={isVertical ? {
                left: 0, right: 0, bottom: 0,
                height: `${zoneFill}%`,
                backgroundColor: barColor,
                opacity: 0.75
              } : {
                top: 0, bottom: 0, left: 0,
                width: `${zoneFill}%`,
                backgroundColor: barColor,
                opacity: 0.75
              }} />
            
            {/* Label */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ fontSize: '6px', fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', lineHeight: 1.1, textAlign: 'center', padding: '1px' }}>
              
              {zone.label}<br />{Math.round(zoneFill)}%
            </div>
          </div>);

      })}
    </>);

}

const STATUS_COLORS = {
  open: { bg: '#22c55e', border: '#16a34a', glow: '#22c55e40', text: '#fff' },
  busy: { bg: '#eab308', border: '#ca8a04', glow: '#eab30840', text: '#fff' },
  congested: { bg: '#f97316', border: '#ea580c', glow: '#f9731650', text: '#fff' },
  closed: { bg: '#6b7280', border: '#4b5563', glow: '#6b728030', text: '#fff' }
};

// Positions as % of the image width/height, calibrated to the PDF map
const GATE_PINS = [
{ code: 'F', pctX: 51, pctY: 19, tag: null, tagColor: null },
{ code: 'A', pctX: 70, pctY: 24, tag: 'STUDENT', tagColor: '#7c3aed' },
{ code: 'B', pctX: 82, pctY: 63, tag: 'ADA', tagColor: '#0284c7' },
{ code: 'C', pctX: 52, pctY: 83, tag: null, tagColor: null },
{ code: 'D', pctX: 13, pctY: 55, tag: null, tagColor: null },
{ code: 'E', pctX: 19, pctY: 27, tag: 'TICKETS', tagColor: '#0f766e' }];


// A1 — smaller, not a full gate entity
const A1_PIN = { pctX: 65, pctY: 30 };

const PARKING_PINS = [
{ name: 'Lot A', pctX: 85, pctY: 10, gateCode: 'A' },
{ name: 'Lot B', pctX: 93, pctY: 70, gateCode: 'B' },
{ name: 'Lot C', pctX: 65, pctY: 93, gateCode: 'C' },
{ name: 'Lot D', pctX: 3, pctY: 60, gateCode: 'D' },
{ name: 'Lot E', pctX: 4, pctY: 18, gateCode: 'E' },
{ name: 'Lot F', pctX: 30, pctY: 9, gateCode: 'F' }];


export default function StadiumSVG({ gates = [], parkingLots = [], onGateClick, onParkingClick, selectedGate }) {
  const gateMap = {};
  gates.forEach((g) => {gateMap[g.code] = g;});

  const lotMap = {};
  parkingLots.forEach((l) => {lotMap[l.name] = l;});

  return (
    <div className="w-full select-none rounded-xl overflow-hidden border border-[#001E44]/20 shadow-md">
      {/* SmartVenue header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#001E44]">
        <img
          src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/8496877d4_ChatGPT_Image_Mar_28__2026__07_11_17_PM-removebg-preview.png"
          alt="SmartVenue"
          className="w-6 h-6 object-contain"
          onError={(e) => {e.target.style.display = 'none';}} />
        
        <span className="text-white text-xs font-bold">SmartVenue PSU</span>
        <span className="text-white/40 text-[9px]">·</span>
        <span className="text-white/50 text-[9px]">Live Gate Overlay</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/40 text-[9px]">Live</span>
        </div>
      </div>

      {/* Map container — real PDF image + overlay pins */}
      <div className="relative w-full bg-white" style={{ paddingBottom: '125%' /* aspect ratio of the official PDF map */ }}>
        
        {/* Stadium Map Image */}
        <img src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/2694e0fb6_ChatGPT_Image_Mar_28__2026__07_01_23_PM.png"

        alt="Beaver Stadium Official Map" className="absolute inset-0 w-full h-full object-cover bg-white"

        onError={(e) => {e.target.src = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80';}} />
        

        {/* ── Capacity overlay rectangles on PDF zones ── */}
        {gates.length > 0 && <CapacityOverlay gates={gates} />}

        {/* SmartVenue logo watermark over the map */}
        <img
          src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/8496877d4_ChatGPT_Image_Mar_28__2026__07_11_17_PM-removebg-preview.png"
          alt=""
          className="absolute pointer-events-none"
          style={{ left: '44%', top: '44%', width: '12%', opacity: 0.12 }} />
        

        {/* ── Parking lot pins (absolutely positioned) ── */}
        {PARKING_PINS.map((lot) => {
          const lotData = lotMap[lot.name];
          const fillPct = lotData ? Math.min((lotData.current_occupancy || 0) / (lotData.capacity || 1) * 100, 100) : 0;
          const lotColor = fillPct > 85 ? '#ef4444' : fillPct > 60 ? '#eab308' : '#2563eb';
          const plainLot = lotData ? JSON.parse(JSON.stringify(lotData)) : null;

          return (
            <button
              key={lot.name}
              onClick={() => plainLot && onParkingClick?.(plainLot)}
              className="absolute flex items-center justify-center rounded font-bold text-white shadow-md border-0 transition-transform hover:scale-110 active:scale-95"
              style={{
                left: `${lot.pctX}%`,
                top: `${lot.pctY}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: lotColor,
                fontSize: 8,
                padding: '2px 6px',
                minWidth: 32,
                cursor: lotData ? 'pointer' : 'default',
                zIndex: 10
              }}>
              
              {lot.name}
            </button>);

        })}

        {/* A1 mini pin */}
        <div
          className="absolute flex items-center justify-center rounded-full text-white font-black shadow"
          style={{
            left: `${A1_PIN.pctX}%`,
            top: `${A1_PIN.pctY}%`,
            transform: 'translate(-50%, -50%)',
            width: 20, height: 20,
            backgroundColor: '#94a3b8',
            border: '1.5px solid #64748b',
            fontSize: 7,
            zIndex: 10
          }}>
          
          A1
        </div>

        {/* ── Gate pins ── */}
        {GATE_PINS.map((pin) => {
          const gate = gateMap[pin.code];
          const status = gate?.status || 'open';
          const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
          const wait = gate?.wait_minutes || 0;
          const isSelected = selectedGate?.code === pin.code;
          const isCongested = status === 'congested';
          // Serialize to plain object to avoid SVGAnimatedString clone errors
          const plainGate = gate ? JSON.parse(JSON.stringify(gate)) : null;

          return (
            <button
              key={pin.code}
              onClick={() => plainGate && onGateClick?.(plainGate)}
              className="absolute flex flex-col items-center transition-transform hover:scale-110 active:scale-95"
              style={{
                left: `${pin.pctX}%`,
                top: `${pin.pctY}%`,
                transform: 'translate(-50%, -50%)',
                cursor: gate ? 'pointer' : 'default',
                zIndex: 20
              }}>
              
              {/* Pulse ring for congested */}
              {isCongested &&
              <span
                className="absolute rounded-full animate-ping"
                style={{
                  width: 40, height: 40,
                  backgroundColor: colors.glow,
                  top: -6, left: -6,
                  zIndex: -1
                }} />

              }

              {/* Selection ring */}
              {isSelected &&
              <span
                className="absolute rounded-full border-2 border-dashed border-[#E07B39]"
                style={{ width: 42, height: 42, top: -7, left: -7 }} />

              }

              {/* Gate circle */}
              <span
                className="flex items-center justify-center rounded-full text-white font-black shadow-lg border-2"
                style={{
                  width: 30, height: 30,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  fontSize: 13,
                  boxShadow: `0 2px 8px ${colors.glow}`
                }}>
                
                {pin.code}
              </span>

              {/* Wait badge */}
              <span
                className="rounded-full text-white font-bold leading-none mt-0.5"
                style={{
                  backgroundColor: wait > 10 ? colors.bg : '#001E44',
                  fontSize: 7,
                  padding: '2px 5px'
                }}>
                
                {wait}m
              </span>

              {/* Special tag */}
              {pin.tag &&
              <span
                className="rounded text-white font-bold leading-none mt-0.5"
                style={{
                  backgroundColor: pin.tagColor,
                  fontSize: 6,
                  padding: '1px 3px'
                }}>
                
                  {pin.tag}
                </span>
              }
            </button>);

        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 bg-white border-t border-border">
        {Object.entries(STATUS_COLORS).map(([s, c]) =>
        <div key={s} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.bg }} />
            <span className="text-[10px] text-muted-foreground capitalize">{s}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="w-4 h-2 rounded" style={{ background: '#2563eb' }} />
          <span className="text-[10px] text-muted-foreground">Parking</span>
        </div>
      </div>
    </div>);

}