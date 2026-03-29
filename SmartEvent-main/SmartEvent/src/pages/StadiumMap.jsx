import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StadiumSVG from '../components/stadium/StadiumSVG';
import GateCard from '../components/stadium/GateCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Car, ArrowRight, Clock, Footprints, Navigation, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTicket } from '../lib/TicketContext';

// Beaver Stadium gate coordinates (lat/lng) for Google Maps
const GATE_COORDS = {
  A: { lat: 40.8122, lng: -77.8565, label: 'Gate A - Beaver Stadium' },
  B: { lat: 40.8099, lng: -77.8542, label: 'Gate B - Beaver Stadium' },
  C: { lat: 40.8080, lng: -77.8575, label: 'Gate C - Beaver Stadium' },
  D: { lat: 40.8090, lng: -77.8610, label: 'Gate D - Beaver Stadium' },
  E: { lat: 40.8115, lng: -77.8618, label: 'Gate E - Beaver Stadium' },
  F: { lat: 40.8130, lng: -77.8592, label: 'Gate F - Beaver Stadium' }
};

const PARKING_COORDS = {
  'Lot A': { lat: 40.8145, lng: -77.8550 },
  'Lot B': { lat: 40.8085, lng: -77.8520 },
  'Lot C': { lat: 40.8060, lng: -77.8575 },
  'Lot D': { lat: 40.8095, lng: -77.8645 }
};

function GoogleMapsDirections({ fromParking, toGate }) {
  if (!fromParking || !toGate) return null;

  const origin = PARKING_COORDS[fromParking];
  const dest = GATE_COORDS[toGate];
  if (!origin || !dest) return null;

  // Google Maps walking directions embed
  const mapsUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&mode=walking`;
  const externalUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=walking`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#E07B39]" />
              Walking Directions
            </CardTitle>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <ExternalLink className="w-3 h-3 mr-1" /> Open Maps
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{fromParking} → Gate {toGate}</p>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            title="Walking directions"
            width="100%"
            height="280"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapsUrl} />
          
        </CardContent>
      </Card>
    </motion.div>);

}

export default function StadiumMap() {
  const [selectedGate, setSelectedGate] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const { ticket } = useTicket();

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: () => base44.entities.Gate.list()
  });

  const { data: parkingLots = [] } = useQuery({
    queryKey: ['parking'],
    queryFn: () => base44.entities.ParkingLot.list()
  });

  const handleGateClick = (gate) => {
    setSelectedGate(gate);
    setSelectedParking(null);
  };

  const handleParkingClick = (lot) => {
    setSelectedParking(lot);
    setSelectedGate(null);
  };

  const openGates = gates.filter((g) => g.status !== 'closed');
  const best = openGates.length > 0 ? openGates.reduce((b, g) => (g.wait_minutes || 0) < (b.wait_minutes || 0) ? g : b, openGates[0]) : null;

  // For directions: use ticket parking + assigned gate if available
  const directionsParking = selectedParking?.code || ticket?.parking || null;
  const directionsGate = selectedGate?.code || ticket?.gate || best?.code || null;

  return (
    <div className="space-y-0">
      {/* Header image */}
      <div className="relative h-36 overflow-hidden">
        <img src="https://media.base44.com/images/public/69c805da43e8b06ab716dfb7/8b57cec3f_PIsiIjiJ4mr1jYjcGYFzGK3RbJ90DLq0P2hUruOv-1024x683.png"

        alt="Beaver Stadium aerial" className="w-full h-full object-cover object-top" />

        
        <div className="absolute inset-0 bg-gradient-to-t from-[#041E42] via-[#041E42]/50 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-bold text-white">Stadium Map</h1>
          <p className="text-white/60 text-sm">Live gate density & parking routes</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {[['bg-green-500', 'Open'], ['bg-yellow-500', 'Busy'], ['bg-orange-500', 'Congested'], ['bg-red-500', 'Closed']].map(([cls, label]) =>
          <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${cls}`} /> {label}
            </div>
          )}
        </div>

        {/* Ticket routing hint */}
        {ticket &&
        <Card className="bg-[#041E42] text-white border-0">
            <CardContent className="p-3 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#E07B39] flex-shrink-0" />
              <p className="text-sm">
                Your parking: <strong>{ticket.parking}</strong> →
                Walk to <strong>Gate {ticket.gate}</strong>
              </p>
              <Button
              size="sm"
              variant="secondary"
              className="ml-auto text-xs h-7 bg-[#E07B39] hover:bg-[#E07B39]/90 text-white border-0"
              onClick={() => setShowDirections((v) => !v)}>
              
                {showDirections ? 'Hide' : 'Directions'}
              </Button>
            </CardContent>
          </Card>
        }

        {/* Google Maps directions */}
        <AnimatePresence>
          {(showDirections || selectedParking) && directionsParking && directionsGate &&
          <GoogleMapsDirections fromParking={directionsParking} toGate={directionsGate} />
          }
        </AnimatePresence>

        {/* SVG Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-2">
            <StadiumSVG
              gates={gates}
              parkingLots={parkingLots}
              onGateClick={handleGateClick}
              onParkingClick={handleParkingClick}
              selectedGate={selectedGate} />
            
          </CardContent>
        </Card>

        {/* Selected gate detail */}
        <AnimatePresence>
          {selectedGate &&
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Card className="border-[#E07B39]/30 ring-1 ring-[#E07B39]/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedGate.name}</CardTitle>
                    <Badge variant="outline">{selectedGate.status}</Badge>
                  </div>
                  {selectedGate.description &&
                <p className="text-sm text-muted-foreground">{selectedGate.description}</p>
                }
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedGate.current_count || 0}</p>
                      <p className="text-xs text-muted-foreground">In Queue</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedGate.wait_minutes || 0}</p>
                      <p className="text-xs text-muted-foreground">Wait (min)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedGate.capacity || '—'}</p>
                      <p className="text-xs text-muted-foreground">Cap/hr</p>
                    </div>
                  </div>
                  {selectedGate.nearest_parking &&
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full text-xs"
                  onClick={() => {
                    setShowDirections(true);
                  }}>
                  
                      <Navigation className="w-3 h-3 mr-1" />
                      Get walking directions from {selectedGate.nearest_parking}
                    </Button>
                }
                </CardContent>
              </Card>
            </motion.div>
          }
        </AnimatePresence>

        {/* Selected parking detail */}
        <AnimatePresence>
          {selectedParking &&
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Card className="border-blue-500/30 ring-1 ring-blue-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-lg">{selectedParking.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div>
                      <p className="text-2xl font-bold">{selectedParking.current_occupancy || 0}</p>
                      <p className="text-xs text-muted-foreground">Occupied</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedParking.capacity || '—'}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedParking.walk_minutes || '—'}</p>
                      <p className="text-xs text-muted-foreground">Walk min</p>
                    </div>
                  </div>
                  {selectedParking.nearest_gate &&
                <div className="flex items-center gap-2 text-sm bg-muted rounded-lg p-3">
                      <Footprints className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground flex-1">Walk to <strong>Gate {selectedParking.nearest_gate}</strong></span>
                      <ArrowRight className="w-4 h-4 text-[#E07B39]" />
                    </div>
                }
                </CardContent>
              </Card>
            </motion.div>
          }
        </AnimatePresence>

        {/* All gates grid */}
        <div>
          <h2 className="text-lg font-bold mb-3">All Gates</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gates.map((gate) =>
            <GateCard
              key={gate.id}
              gate={gate}
              isRecommended={best?.id === gate.id}
              onClick={handleGateClick} />

            )}
          </div>
        </div>
      </div>
    </div>);

}