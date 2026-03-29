import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/**
 * MobileSelect — uses a bottom-sheet Drawer on mobile (<768px),
 * and the standard Radix Select Popover on desktop.
 *
 * Props mirror a subset of shadcn Select:
 *   value, onValueChange, placeholder, triggerClassName, options: [{value, label}]
 *   children (alternative to options — pass <MobileSelectItem> children)
 */

export function MobileSelectItem({ value, label, children }) {
  // Rendered by parent — not used directly
  return null;
}

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export default function MobileSelect({ value, onValueChange, placeholder, triggerClassName, options = [], children, label }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Collect options from children if provided
  const resolvedOptions = options.length > 0 ? options : React.Children.toArray(children)
    .filter(c => c?.props?.value !== undefined)
    .map(c => ({ value: c.props.value, label: c.props.label || c.props.children }));

  const currentLabel = resolvedOptions.find(o => o.value === value)?.label;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder}>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {resolvedOptions.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-left',
          !value && 'text-muted-foreground',
          triggerClassName
        )}
      >
        <span className="truncate">{currentLabel || placeholder || 'Select…'}</span>
        <svg className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4M8 15l4 4 4-4" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {label && (
            <DrawerHeader>
              <DrawerTitle className="text-base">{label}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="px-4 pb-6 space-y-1 max-h-[60vh] overflow-y-auto">
            {resolvedOptions.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left',
                  o.value === value
                    ? 'bg-[#001E44] text-white'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {o.label}
                {o.value === value && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}