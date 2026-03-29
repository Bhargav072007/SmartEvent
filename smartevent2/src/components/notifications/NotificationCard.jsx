import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Route, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const typeConfig = {
  gate_change: { icon: ArrowRightLeft, color: 'text-accent', bg: 'bg-accent/10', label: 'Gate Change' },
  route_update: { icon: Route, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Route Update' },
  congestion_alert: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Congestion' },
  general: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Info' },
};

export default function NotificationCard({ notification, onMarkRead }) {
  const config = typeConfig[notification.type] || typeConfig.general;
  const Icon = config.icon;

  return (
    <Card className={cn(
      "transition-all",
      !notification.read && "border-l-4 border-l-accent bg-accent/5"
    )}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.bg)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm text-foreground">{notification.title}</h4>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">{config.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {notification.created_date ? format(new Date(notification.created_date), 'h:mm a') : ''}
              </span>
              {!notification.read && (
                <button
                  onClick={() => onMarkRead?.(notification)}
                  className="text-xs text-accent font-medium hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
