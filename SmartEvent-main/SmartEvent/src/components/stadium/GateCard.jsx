import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  open: { label: 'Open', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  busy: { label: 'Busy', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
  congested: { label: 'Congested', color: 'bg-orange-500/20 text-orange-700 border-orange-500/30' },
  closed: { label: 'Closed', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
};

export default function GateCard({ gate, isRecommended, onClick }) {
  const config = statusConfig[gate.status] || statusConfig.open;
  const loadPercent = gate.capacity ? Math.min((gate.current_count / gate.capacity) * 100, 100) : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border",
        isRecommended && "ring-2 ring-accent border-accent/30"
      )}
      onClick={() => onClick?.(gate)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-foreground">{gate.name}</h3>
            {gate.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{gate.description}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs", config.color)}>
            {config.label}
          </Badge>
        </div>

        {/* Load bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              loadPercent < 50 ? "bg-green-500" :
              loadPercent < 75 ? "bg-yellow-500" :
              loadPercent < 90 ? "bg-orange-500" : "bg-red-500"
            )}
            style={{ width: `${loadPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{gate.current_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{gate.wait_minutes || 0} min</span>
          </div>
          {isRecommended && (
            <div className="flex items-center gap-1 text-accent font-semibold text-xs">
              <ArrowRight className="w-3.5 h-3.5" />
              Best
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}